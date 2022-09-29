Setting up autocompletion configures your terminal, so pressing the `<TAB>` key while in the middle
of typing will display various commands and options available to you. This makes it very easy to
discover and use CLI commands without lots of memorization.

![A demo of Angular CLI autocompletion in a terminal. The user types several partial `ng` commands,
using autocompletion to finish several arguments and list contextual options.
](generated/images/guide/cli/completion.gif)

## Automated setup

The CLI should prompt and ask to set up autocompletion for you the first time you use it (v14+).
Simply answer "Yes" and the CLI will take care of the rest.

```
$ ng serve
? Would you like to enable autocompletion? This will set up your terminal so pressing TAB while typing Angular CLI commands will show possible options and autocomplete arguments. (Enabling autocompletion will modify configuration files in your home directory.) Yes
Appended `source <(ng completion script)` to `/home/my-username/.bashrc`. Restart your terminal or run:

source <(ng completion script)

to autocomplete `ng` commands.

# Serve output...
```

If you already refused the prompt, it won't ask again. But you can run `ng completion` to
do the same thing automatically.

This modifies your terminal environment to load Angular CLI autocompletion, but can't update your
current terminal session. Either restart it or run `source <(ng completion script)` directly to
enable autocompletion in your current session.

Test it out by typing `ng ser<TAB>` and it should autocomplete to `ng serve`. Ambiguous arguments
will show all possible options and their documentation, such as `ng generate <TAB>`.

## Manual setup

Some users may have highly customized terminal setups, possibly with configuration files checked
into source control with an opinionated structure. `ng completion` only ever appends Angular's setup
to an existing configuration file for your current shell, or creates one if none exists. If you want
more control over exactly where this configuration lives, you can manually set it up by having your
shell run at startup:

```bash
source <(ng completion script)
```

This is equivalent to what `ng completion` will automatically set up, and gives power users more
flexibility in their environments when desired.

## Platform support

Angular CLI supports autocompletion for the Bash and Zsh shells on MacOS and Linux operating
systems. On Windows, Git Bash and [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/)
using Bash or Zsh are supported.

## Global install

Autocompletion works by configuring your terminal to invoke the Angular CLI on startup to load the
setup script. This means the terminal must be able to find and execute the Angular CLI, typically
through a global install that places the binary on the user's `$PATH`. If you get
`command not found: ng`, make sure the CLI is installed globally which you can do with the `-g`
flag:

```bash
npm install -g @angular/cli
```
