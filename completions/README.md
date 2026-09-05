# Phalanx Duel shell completions

The canonical executable names use the `phx-*` convention. The original
The `phx-*` names are the supported command entrypoints.

With the repository root on `PATH`, load the Zsh completions for the current
shell with:

```zsh
fpath=("$PWD/completions/zsh" $fpath)
autoload -Uz compinit && compinit
```

For a persistent setup, add the `fpath` line before `compinit` in your shell
configuration. Then these complete their commands, options, and services:

```text
phx-demo-ctl <TAB>
phx-services <TAB>
phx-dock <TAB>
phx <TAB>
```

Completion sources intentionally live in the repo so they can be reviewed and
updated alongside each CLI's `--help` output and man page. Bash users can load
the bundled definitions with:

```bash
source ./completions/bash/phx-tools
```
