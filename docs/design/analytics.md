# Usage Metrics Gathering
This document list exactly what is gathered and how.

Any change to analytics should most probably include a change to this document.

# Pageview
Each command creates a pageview with the path `/command/${commandName}/${subcommandName}`. IE.
`ng generate component my-component --dryRun` would create a page view with the path
`/command/generate/@schematics_angular/component`.

Additionally, only the Architect configuration of `default`, `production` and `staging` will be
logged. The project name will be removed, and if the configuration is different than the three
basic ones, it will be replaced with `_`. 
The command `ng run some-project:lint:some-configuration` will create a page view with the path
`/command/run/_:lint:_`. Configurations are only used when actually mentioned on the command
line, thus the command `ng build some-project --prod` will create a page view of
`/command/build/_:default` (with the `prod` flag), while `ng build some-project:some-conf` will log
`/command/build/_:_`.

# Dimensions
Google Analytics Custom Dimensions are used to track flag values. These dimensions are aggregated
automatically on the backend.

One dimension per flag, and although technically there can be an overlap between 2 commands, for
simplicity it should remain unique across all CLI commands. These are numbers added to our own
`schema.json` files. Dimensions are not to be used for anything else.

To create a new dimension (tracking a new flag):

1. Create the dimension on analytics.google.com first. Dimensions are not tracked if they aren't
   defined on GA.
1. Use the ID of the dimension as the `x-user-analytics` value in the `schema.json` file.
1. Add a new row to the table below in the same PR as the one adding the dimension to the code.
1. New dimensions PRs need to be approved by [bradgreen@google.com](mailto:bradgreen@google.com),
   [stephenfluin@google.com](mailto:stephenfluin@google.com) and
   [iminar@google.com](mailto:iminar@google.com). **This is not negotiable.**

**DO NOT ADD `x-user-analytics` FOR VALUES THAT ARE USER IDENTIFIABLE (PII), FOR EXAMPLE A
PROJECT NAME TO BUILD OR A MODULE NAME.**

Note: There's a limit of 20 custom dimensions.

### List Of All Dimensions
| Id | Category | Flag | Type | File / Description |
|:---:|:---|:---|:---|---:|
| 1 | `generate`, `new` | `--dryRun`      | `Boolean` | |
| 2 | `generate`, `new` | `--force`       | `Boolean` | |
| 3 | `generate`, `new` | `--interactive` | `Boolean` | |
| 4 | `generate` | `--skipInstall` | `Boolean` | |
| 5 | `generate` | `--style` | `String` | |
| 6 | `add` | `--collection` | `String` | Only for packages that we control (see safelist in `add-impl.ts`). |
| 7 | `build`, `serve` | `--buildEventLog` | `Boolean` | If the flag was used (does not report its value). See `build-impl.ts`. |
| 8 | `generate`, `new` | `--enableIvy` | `Boolean` | |
| 9 | `generate` | `--inlineStyle` | `Boolean` | |
| 10 | `generate` | `--inlineTemplate` | `Boolean` | |
| 11 | `generate` | `--viewEncapsulation` | `String` | |
| 12 | `generate` | `--skipTests` | `Boolean` | |
| 13 | `build` | `--aot` | `Boolean` | |
| 14 | `generate` | `--minimal` | `Boolean` | |
| 15 | `generate` | `--lintFix` | `Boolean` | |
| 16 | `build` | `--optimization` | `Boolean` | |
| 17 | `generate` | `--routing` | `Boolean` | |
| 18 | `generate` | `--skipImport` | `Boolean` | |
| 19 | `generate` | `--export` | `Boolean` | |
| 20 | `generate` | `--entryComponent` | `Boolean` | |

# Metrics

### List of All Metrics
| Id  | Type | Description |
|:---:|:-----|-------------|
| 1 | `Number` | CPU count |
| 2 | `Number` | Average CPU speed |
| 3 | `Number` | RAM Count |
| 4 | `Number` | Node Version (Major.Minor) |

# Operating System and Node Version
A User Agent string is built to "fool" Google Analytics into reading the Operating System and
version fields from it. The base dimensions are used for those.

# Debugging
Using `DEBUG=universal-analytics` will report all calls to the universal-analytics library,
including queuing events and sending them to the server.

Using `DEBUG=ng:analytics` will report additional information regarding initialization and
decisions made during the usage analytics process, e.g. if the user has analytics disabled.

Using `DEBUG=ng:analytics:command` will show the decisions made by the command runner.

Using `DEBUG=ng:analytics:log` will show what we actually send to GA.

See [the `debug` NPM library](https://www.npmjs.com/package/debug) for more information.

# Disabling Usage Analytics
There are 2 ways of disabling usage analytics:

1. using `ng analytics off` (or changing the global configuration file yourself). This is the same
   as answering "No" to the prompt.
1. There is an `NG_CLI_ANALYTICS` environment variable that overrides the global configuration.
   That flag is a string that represents the User ID. If the string `"false"` is used it will
   disable analytics for this run. If the string `"ci"` is used it will show up as a CI run (see
   below).

# CI
A special user named `ci` is used for analytics for tracking CI information. This is a convention
and is in no way enforced.

Running on CI by default will disable analytics (because of a lack of TTY on STDIN/OUT). It can be
manually enabled using either a global configuration with a value of `ci`, or using the
`NG_CLI_ANALYTICS=ci` environment variable. 
