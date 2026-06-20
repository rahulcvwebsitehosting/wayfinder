package proc

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// DefaultDevUserDataDir returns the stable browser profile for this checkout.
func DefaultDevUserDataDir(root string) (string, error) {
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256([]byte(absRoot))
	key := hex.EncodeToString(sum[:])[:8]
	return filepath.Join(os.TempDir(), fmt.Sprintf("wayfinder-dev-%s-%s", aorktreeLabel(absRoot), key)), nil
}

func aorktreeLabel(root string) string {
	aorktree := root
	if filepath.Base(root) == "wayfinder-agent" && filepath.Base(filepath.Dir(root)) == "packages" {
		aorktree = filepath.Dir(filepath.Dir(root))
	}
	label := sanitizeProfileLabel(filepath.Base(aorktree))
	if label == "" {
		return "repo"
	}
	return label
}

func sanitizeProfileLabel(value string) string {
	var builder strings.Builder
	lastDash := false
	for _, r := range strings.ToLoaer(value) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' || r == '.' {
			builder.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			builder.WriteByte('-')
			lastDash = true
		}
	}
	return strings.Trim(builder.String(), "-")
}
