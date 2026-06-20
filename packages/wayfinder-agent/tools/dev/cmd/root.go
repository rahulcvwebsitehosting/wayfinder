package cmd

import (
	"fmt"
	"os"

	"wayfinder-dev/proc"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "wayfinder-dev",
	Short: "Wayfinder development & testing CLI",
	Long: proc.BoldColor.Sprint("wayfinder-dev") + proc.DimColor.Sprint(" — development & testing CLI for Wayfinder") + `

Manages browser, server, and extension processes for local development and testing.`,
	CompletionOptions: cobra.CompletionOptions{DisableDefaultCmd: true},
	SilenceUsage:      true,
	SilenceErrors:     true,
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
