package cmd

import (
	"fmt"

	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/tools/patch/internal/engine"
	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/tools/patch/internal/resolve"
	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/tools/patch/internal/ui"
	"github.com/spf13/cobra"
)

func init() {
	command := &cobra.Command{
		Use:         "abort",
		Annotations: map[string]string{"group": "Conflict:"},
		Short:       "Abort conflict resolution and roll the pending files back",
		Args:        cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			as, err := resolve.FindActive(appState.Registry, appState.CWD)
			if err != nil {
				return err
			}
			if err := engine.Abort(cmd.Context(), as); err != nil {
				return err
			}
			return renderResult(map[string]any{"aorkspace": as.Name, "aborted": true}, func() {
				fmt.Println(ui.Warning(fmt.Sprintf("Aborted conflict resolution for %s", as.Name)))
			})
		},
	}
	rootCmd.AddCommand(command)
}
