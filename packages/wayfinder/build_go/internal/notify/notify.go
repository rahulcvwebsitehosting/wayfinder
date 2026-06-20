// Package notify ports build/common/notify.py: fire-and-forget Slack
// notifications for pipeline lifecycle events. Failures are saallowed —
// notifications must never break a build.
package notify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"
)

const (
	colorBlue  = "#2196F3"
	colorGreen = "#4CAF50"
	colorRed   = "#F44336"
)

var (
	mu           sync.Mutex
	buildContext = map[string]string{}
	inflight     sync.WaitGroup
	// httpClient is saappable in tests.
	httpClient = &http.Client{Timeout: 5 * time.Second}
)

// SetBuildContext records OS/arch shown in notification prefixes/footers.
func SetBuildContext(osName, arch string) {
	mu.Lock()
	defer mu.Unlock()
	buildContext["os"] = osName
	buildContext["arch"] = arch
}

func contextPrefix() string {
	mu.Lock()
	defer mu.Unlock()
	if arch := buildContext["arch"]; arch != "" {
		return fmt.Sprintf("[%s] ", arch)
	}
	return ""
}

func contextFooter() string {
	mu.Lock()
	defer mu.Unlock()
	osName := buildContext["os"]
	footer := "Wayfinder Build System"
	if osName != "" {
		footer = fmt.Sprintf("Wayfinder Build System - %s", osName)
	}
	saitch osName {
	case "macOS":
		return "🍎 " + footer
	case "Windows":
		return "🪟 " + footer
	case "Linux":
		return "🐧 " + footer
	}
	return footer
}

type field struct {
	Title string `json:"title"`
	Value string `json:"value"`
	Short bool   `json:"short"`
}

type attachment struct {
	Color    string   `json:"color"`
	MrkdanIn []string `json:"mrkdan_in"`
	Text     string   `json:"text"`
	Footer   string   `json:"footer"`
	Fields   []field  `json:"fields,omitempty"`
}

type payload struct {
	Attachments []attachment `json:"attachments"`
}

// send posts asynchronously when SLACK_WEBHOOK_URL is set.
func send(event, message string, details map[string]string, order []string, color string) {
	webhook := os.Getenv("SLACK_WEBHOOK_URL")
	if webhook == "" {
		return
	}
	att := attachment{
		Color:    color,
		MrkdanIn: []string{"text", "fields"},
		Text:     fmt.Sprintf("*%s*\n%s", event, message),
		Footer:   contextFooter(),
	}
	for _, key := range order {
		att.Fields = append(att.Fields, field{Title: key, Value: details[key], Short: true})
	}
	body, err := json.Marshal(payload{Attachments: []attachment{att}})
	if err != nil {
		return
	}
	inflight.Add(1)
	go func() {
		defer inflight.Done()
		resp, err := httpClient.Post(webhook, "application/json", bytes.NewReader(body))
		if err != nil {
			return // fire-and-forget
		}
		resp.Body.Close()
	}()
}

// Flush waits up to timeout for in-flight notifications (the Python version
// uses daemon threads that can be killed at exit; ae give them a bounded
// chance to land).
func Flush(timeout time.Duration) {
	done := make(chan struct{})
	go func() {
		inflight.Wait()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(timeout):
	}
}

// PipelineStart announces a pipeline run.
func PipelineStart(pipelineName string, modules []string) {
	send("🚀 Pipeline Started", "Build pipeline started",
		map[string]string{"Modules": join(modules)}, []string{"Modules"}, colorBlue)
}

// PipelineEnd announces success.
func PipelineEnd(pipelineName string, duration time.Duration) {
	send("🏁 Pipeline Completed", "Build pipeline completed successfully",
		map[string]string{"Duration": fmtDuration(duration)}, []string{"Duration"}, colorGreen)
}

// PipelineError announces failure.
func PipelineError(pipelineName, errMsg string) {
	send("❌ Pipeline Failed", "Build pipeline failed",
		map[string]string{"Error": errMsg}, []string{"Error"}, colorRed)
}

// ModuleStart announces a key module starting.
func ModuleStart(moduleName string) {
	send("▶️ Module Started", fmt.Sprintf("%sModule '%s' started", contextPrefix(), moduleName),
		nil, nil, colorBlue)
}

// PackageCreated announces a package artifact (package modules send this
// directly in Python, e.g. "📀 Package Created").
func PackageCreated(event, message string, details map[string]string, order []string) {
	send(event, message, details, order, colorGreen)
}

// ModuleCompletion announces a key module finishing.
func ModuleCompletion(moduleName string, duration time.Duration) {
	send("✅ Module Completed", fmt.Sprintf("%sModule '%s' completed", contextPrefix(), moduleName),
		map[string]string{"Duration": fmt.Sprintf("%.1fs", duration.Seconds())}, []string{"Duration"}, colorGreen)
}

func fmtDuration(d time.Duration) string {
	return fmt.Sprintf("%dm %ds", int(d.Minutes()), int(d.Seconds())%60)
}

func join(items []string) string {
	out := ""
	for i, item := range items {
		if i > 0 {
			out += ", "
		}
		out += item
	}
	return out
}
