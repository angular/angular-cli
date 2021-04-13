# Schematics CLI

This package contains the executable for running a [Schematic](/packages/angular_devkit/schematics/README.md).

# Usage

```
$ schematics [CollectionName:]SchematicName [options, ...]

By default, if the collection name is not specified, use the internal collection provided
by the Schematics CLI.

Options:
    --debug             Debug mode. This is true by default if the collection is a relative
                        path (in that case, turn off with --debug=false).

    --allow-private     Allow private schematics to be run from the command line. Default to
                        false.

    --dry-run           Do not output anything, but instead just show what actions would be
                        performed. Default to true if debug is also true.

    --force             Force overwriting files that would otherwise be an error.

    --list-schematics   List all schematics from the collection, by name. A collection name
                        should be suffixed by a colon. Example: '@angular-devkit/schematics-cli:'.

    --no-interactive    Disables interactive input prompts.

    --verbose           Show more information.

    --help              Show this message.

Any additional option is passed to the Schematics depending on its schema.
```

# Examples

1. Create a new NPM package that contains a blank schematic.

```sh
$ schematics blank <name>
```

2. Walkthrough example that demonstrates how to build a schematic.

```sh
$ schematics schematic --name <name>
```
