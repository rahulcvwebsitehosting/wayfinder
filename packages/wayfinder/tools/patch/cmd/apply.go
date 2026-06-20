package cmd

import (
	"fmt"

	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/tools/patch/internal/engine"
	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/tools/patch/internal/ui"
	"github.com/spf13/cobra"
)

func init() {
	var src string
	var reset bool
	var changed string
	var rangeEnd string
	command := &cobra.Command{
		Use:         "apply [checkout] [-- files...]",
		Annotations: map[string]string{"group": "Core:"},
		Short:       "Apply repo patches to a checkout",
		Example: `  wayfinder-patch apply ch1
  wayfinder-patch apply ch1 -- chrome/browser/browser.cc
  wayfinder-patch apply --src /path/to/chromium/src`,
		Args: cobra.ArbitraryArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			positional, filters := splitWorkspaceAndFilters(cmd, args)
			if len(positional) > 1 {
				return fmt.Errorf("expected at most one checkout name")
			}
			as, err := resolveWorkspace(cmd, positional, src)
			if err != nil {
				return err
			}
			info, err := repoInfo()
			if err != nil {
				return err
			}
			result, err := engine.Apply(cmd.Context(), engine.ApplyOptions{
				Workspace:  as,
				Repo:       info,
				Reset:      reset,
				ChangedRef: changed,
				RangeEnd:   rangeEnd,
				Filters:    filters,
				Progress:   commandProgress(cmd),
			})
			if err != nil {
				return err
			}
			if err := renderResult(result, func() {
				fmt.Println(ui.Title(fmt.Sprintf("Applied patches to %s", as.Name)))
				fmt.Printf("%s  %s\n", ui.Muted("mode:"), result.Mode)
				fmt.Printf("%s  %d\n", ui.Muted("applied:"), len(result.Applied))
				fmt.Printf("%s  %d\n", ui.Muted("orphaned:"), len(result.Orphaned))
				if len(result.Conflicts) > 0 {
					fmt.Println(ui.Warning("Conflicts detected"))
					for _, conflict := range result.Conflicts {
						fmt.Printf("  %s\n", conflict.ChromiumPath)
					}
					fmt.Println(ui.Hint(`Run "wayfinder-patch continue" after fixing the current conflict.`))
				}
			}); err != nil {
				return err
			}
			return conflictPauseError(len(result.Conflicts) > 0)
		},
	}
	command.Flags().StringVar(&src, "src", "", srcFlagUsage)
	command.Flags().BoolVar(&reset, "reset", false, "Reset patched files to BASE_COMMIT before applying")
	command.Flags().StringVar(&changed, "changed", "", "Apply only patches changed in the given repo commit")
	command.Flags().StringVar(&rangeEnd, "range-end", "", "End revision when using --changed as a range start")
	rootCmd.AddCommand(command)
}
