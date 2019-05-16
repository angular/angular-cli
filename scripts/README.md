# DevKit Administrative Scripts

This folder contains all the scripts that can be run using `devkit-admin`.

In order to be able to use the DevKit scripts, you must first run:

```bash
$ npm link
```

This will link the binaries included in this repository, which includes the `devkit-admin` binary. This document
describes each scripts available.

## benchmark

Runs all benchmarks of the repo. Benchmarks are run like Jasmine tests, but when the test are passing also record
performance metrics. An example is the file `packages/angular_devkit/core/src/json/parser_benchmark.ts`.

There's no flags associated with this script.

## build

Builds the repo and the pack files. The output of `build` is in `dist/` and contains 1 tgz per package which can be
installed (the result of `npm pack` on that package), and a directory using the name of the package to publish.

Flags:

* `--local`. Enable building packages with dependencies to their pack files (instead of versions).
* `--snapshot`. Enable building packages with dependencies to their snapshot repos (instead of versions).

## changelog

Creates a changelog draft in GitHub releases.

Flags:

* `--from=<git-ref>`. **[Required]** The git ref (SHA, tag or ref) to start the CHANGELOG at.
* `--to=<tag>`. **[Required]** The git ref (tag) to end the CHANGELOG at. This will also be used to name the changelog
  on GitHub.
* `--githubToken=<string>`. The github token to update the changelog with. If this is not specified, the release notes
  will be outputted to stdout.
* `--githubTokenFile=<path>`. Reads the githubToken from a file instead of the command line (for CI).
* `--stdout`. Skip the whole release note process and output the markdown to stdout instead.

## lint

Runs tslint on the whole repo.

Flags:

* `--fix`. Also applies fixes.

## packages

Outputs a JSON containing all informations from the package script (main files, repo names, versions, deps, etc).

## publish

Builds and published the packages to npm.

Flags:

* `--tag=<name>`. Publishes under the npm dist-tag specified.

## release

General version and release manager.

Usage:

```bash
$ devkit-admin release
```

Outputs all the packages, their versions and their hashes. By default, excludes private packages that are only used in
the repo (such as private schematics). With the `--verbose` flag will output the private packages as well.

By adding a command, the `release` script will update the version;

* `major-beta`. Set the version of packages to the next beta of the next major.
* `major-rc`. Set the version of packages to the next RC of the next major.
* `major`. Increment the major version of packages.
* `minor-beta`. Set the version of packages to the next beta of the next minor.
* `minor-rc`. Set the version of packages to the next RC of the next minor.
* `minor`. Increment the minor version of packages.
* `patch`. Increment the patch version of packages.

By default, the release script will increment versions of packages that have changed. Use the `--force` flag to change
the version of all packages, even those who haven't changed.

e.g.

```bash
$ devkit-admin release minor-beta --force
```

## serialize

Serialize JSON Schema into `.d.ts` files. This script is deprecated and doesn't work anymore.

## snapshots

Create and upload snapshots. This is used in CI.

Flags:

* `--force`. Force push the snapshot to github.
* `--githubToken=<string>`. The github token to update the changelog with. Either this of `--githubTokenFile` is
  required.
* `--githubTokenFile=<path>`. Reads the githubToken from a file instead of the command line (for CI).

## special-thanks

Calculates and output the list of special thanks.

Flags:

* `--sha=<git ref>`. The SHA to start the special thanks from. Calculates them from this sha to the HEAD.

## templates

Compile and outputs the templates. For now, only README is being built and outputted.

## test

Run unit or large tests. Tests will exclude all files that excluded from `tsconfig.json`.

Flags:

* `--large`. Run the large tests (`**/*_spec_large.ts`).
* `--full`. Run all the tests. By default only runs tests in packages that have changed since the last release.
* `--spec-reporter`. Use the spec reporter (instead of the default one).
* `--glob=<glob string>`. Only run the tests that match the glob pattern.
* `--code-coverage`. Outputs code coverage for the tests run.

## validate

Performs BUILD files, commit messages and license validation.

Flags:

* `--verbose`. Ignore errors and continue showing outputs.
