# Usage Metrics Gathering
This document list exactly what is gathered and how.

Any change to analytics should most probably include a change to this document.

# Pageview
Each command creates a pageview with the path `/command/${commandName}/${subcommandName}`. IE.
`ng generate component my-component --dryRun` would create a page view with the path
`/command/generate/@schematics_angular/component`.

We use page views to keep track of sessions more effectively, and to tag events to a page.

Project names and target names will be removed. 
The command `ng run some-project:lint:some-configuration` will create a page view with the path
`/command/run`.

# Dimensions
Google Analytics Custom Dimensions are used to track system values and flag values. These
dimensions are aggregated automatically on the backend.

One dimension per flag, and although technically there can be an overlap between 2 commands, for
simplicity it should remain unique across all CLI commands. The dimension is the value of the
`x-user-analytics` field in the `schema.json` files.

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
<!--DIMENSIONS_TABLE_BEGIN-->
| Id | Flag | Type |
|:---:|:---|:---|
| 1 | `CPU Count` | `number` |
| 2 | `CPU Speed` | `number` |
| 3 | `RAM (In GB)` | `number` |
| 4 | `Node Version` | `number` |
| 5 | `Flag: --style` | `string` |
| 6 | `--collection` | `string` |
| 7 | `--buildEventLog` | `boolean` |
| 9 | `Flag: --inlineStyle` | `boolean` |
| 10 | `Flag: --inlineTemplate` | `boolean` |
| 11 | `Flag: --viewEncapsulation` | `string` |
| 12 | `Flag: --skipTests` | `boolean` |
| 13 | `Flag: --aot` | `boolean` |
| 14 | `Flag: --minimal` | `boolean` |
| 15 | `Flag: --lintFix` | `boolean` |
| 16 | `Flag: --optimization` | `boolean` |
| 17 | `Flag: --routing` | `boolean` |
| 18 | `Flag: --skipImport` | `boolean` |
| 19 | `Flag: --export` | `boolean` |
| 20 | `Build Errors (comma separated)` | `string` |
<!--DIMENSIONS_TABLE_END-->

# Metrics

### List of All Metrics
<!--METRICS_TABLE_BEGIN-->
| Id | Flag | Type |
|:---:|:---|:---|
| 1 | `NgComponentCount` | `number` |
| 2 | `UNUSED_2` | `none` |
| 3 | `UNUSED_3` | `none` |
| 4 | `UNUSED_4` | `none` |
| 5 | `Build Time` | `number` |
| 6 | `NgOnInit Count` | `number` |
| 7 | `Initial Chunk Size` | `number` |
| 8 | `Total Chunk Count` | `number` |
| 9 | `Total Chunk Size` | `number` |
| 10 | `Lazy Chunk Count` | `number` |
| 11 | `Lazy Chunk Size` | `number` |
| 12 | `Asset Count` | `number` |
| 13 | `Asset Size` | `number` |
| 14 | ` Polyfill Size` | `number` |
| 15 | ` Css Size` | `number` |
<!--METRICS_TABLE_END-->

# Operating System and Node Version
A User Agent string is built to "fool" Google Analytics into reading the Operating System and
version fields from it. The base dimensions are used for those.

Node version is our App ID, but a dimension is also used to get the numeric MAJOR.MINOR of node.

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
