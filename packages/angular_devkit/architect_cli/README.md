# Architect CLI

This package contains the executable for running an [Architect Builder](/packages/angular_devkit/architect/README.md).

# Usage

```
architect [project][:target][:configuration] [options, ...]

Run a project target.
If project/target/configuration are not specified, the workspace defaults will be used.

Options:
    --help              Show available options for project target.
                        Shows this message instead when ran without the run argument.


Any additional option is passed the target, overriding existing options.
```
