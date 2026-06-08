# DevKit Administrative Scripts

This folder contains all the scripts that can be run using `devkit-admin`.

In order to be able to use the DevKit scripts, you must first run:

```bash
$ npm link
```

This will link the binaries included in this repository, which includes the `devkit-admin` binary. This document
describes each scripts available.

## build

Builds the repo and the pack files. The output of `build` is in `dist/` and contains 1 tgz per package which can be
installed (the result of `npm pack` on that package), and a directory using the name of the package to publish.

Flags:

- `--local`. Enable building packages with dependencies to their pack files (instead of versions).
- `--snapshot`. Enable building packages with dependencies to their snapshot repos (instead of versions).

## packages

Outputs a JSON containing all informations from the package script (main files, repo names, versions, deps, etc).

## snapshots

Create and upload snapshots. This is used in CI.

Flags:

- `--force`. Force push the snapshot to github.
- `--githubToken=<string>`. The github token to update the changelog with. Either this of `--githubTokenFile` is
  required.
- `--githubTokenFile=<path>`. Reads the githubToken from a file instead of the command line (for CI).

## templates

Compile and outputs the templates. For now, only README is being built and outputted.

## validate

Performs BUILD files and license validation.

Flags:

- `--verbose`. Ignore errors and continue showing outputs.
