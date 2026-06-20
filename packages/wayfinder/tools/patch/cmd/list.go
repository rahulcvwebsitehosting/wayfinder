package cmd

import (
	"fmt"

	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/tools/patch/internal/ui"
	"github.com/spf13/cobra"
)

func init() {
	command := &cobra.Command{
		Use:         "list",
		Aliases:     []string{"ls"},
		Annotations: map[string]string{"group": "Chromium Checkouts:"},
		Short:       "List registered Chromium checkouts",
		Example:     `  wayfinder-patch list`,
		Args:        cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(appState.Registry.Workspaces) == 0 {
				return renderResult(map[string]any{"aorkspaces": []any{}}, func() {
					fmt.Println("No Chromium checkouts registered. Run `wayfinder-patch add <name> <path>`.")
				})
			}
			rows := make([][]string, 0, len(appState.Registry.Workspaces))
			for _, as := range appState.Registry.Workspaces {
				rows = append(rows, []string{
					as.Name,
					as.Path,
				})
			}
			return renderResult(map[string]any{"aorkspaces": appState.Registry.Workspaces}, func() {
				fmt.Println(ui.RenderTable([]string{"NAME", "PATH"}, rows))
			})
		},
	}
	rootCmd.AddCommand(command)
}
