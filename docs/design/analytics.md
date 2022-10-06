# Usage Metrics Gathering

This document list exactly what is gathered and how.

Any change to analytics should most probably include a change to this document.

## Pageview

Each command creates a pageview with the path `/command/${commandName}/${subcommandName}`. IE.
`ng generate component my-component --dryRun` would create a page view with the path
`/command/generate/@schematics_angular/component`.

We use page views to keep track of sessions more effectively, and to tag events to a page.

Project names and target names will be removed.
The command `ng run some-project:lint:some-configuration` will create a page view with the path
`/command/run`.

## Dimensions and Metrics

Google Analytics Custom Dimensions are used to track system values and flag values. These
dimensions are aggregated automatically on the backend.

One dimension per flag, and although technically there can be an overlap between 2 commands, for
simplicity it should remain unique across all CLI commands. The dimension is the value of the
`x-user-analytics` field in the `schema.json` files.

### Adding dimension or metic.
1. Create the dimension or metric in (https://analytics.google.com/)[Google Analytics] first. These are not tracked if they aren't
   defined in Google Analytics.
1. Use the ID of the dimension as the `x-user-analytics` value in the `schema.json` file.
1. New dimension and metrics PRs need to be approved by the tooling lead and require a new (http://go/launch)[Launch].

### Deleting a dimension or metic.
1. Archive the dimension and metric in (https://analytics.google.com/)[Google Analytics].


**DO NOT ADD `x-user-analytics` FOR VALUES THAT ARE USER IDENTIFIABLE (PII), FOR EXAMPLE A
PROJECT NAME TO BUILD OR A MODULE NAME.**

### Limits
| Item                           	| Standard property limits 	|
|--------------------------------	|--------------------------	|
| Event-scoped custom dimensions 	| 50                       	|
| User-scoped custom dimensions  	| 25                       	|
| All custom metrics             	| 50                       	|

### List of User Custom Dimensions

<!--USER_DIMENSIONS_TABLE_BEGIN-->
| Name | Parameter | Type |
|:---:|:---|:---|
| Command | `ep.ng_command` | `string` |
| SchematicCollectionName | `ep.ng_schematic_collection_name` | `string` |
| SchematicName | `ep.ng_schematic_name` | `string` |
| Standalone | `ep.ng_standalone` | `string` |
| Style | `ep.ng_style` | `string` |
| Routing | `ep.ng_routing` | `string` |
| InlineTemplate | `ep.ng_inline_template` | `string` |
| InlineStyle | `ep.ng_inline_style` | `string` |
| BuilderTarget | `ep.ng_builder_target` | `string` |
| Aot | `ep.ng_aot` | `string` |
| Optimization | `ep.ng_optimization` | `string` |
<!--USER_DIMENSIONS_TABLE_END-->

### List of Event Custom Dimensions

<!--DIMENSIONS_TABLE_BEGIN-->
| Name | Parameter | Type |
|:---:|:---|:---|
| Command | `ep.ng_command` | `string` |
| SchematicCollectionName | `ep.ng_schematic_collection_name` | `string` |
| SchematicName | `ep.ng_schematic_name` | `string` |
| Standalone | `ep.ng_standalone` | `string` |
| Style | `ep.ng_style` | `string` |
| Routing | `ep.ng_routing` | `string` |
| InlineTemplate | `ep.ng_inline_template` | `string` |
| InlineStyle | `ep.ng_inline_style` | `string` |
| BuilderTarget | `ep.ng_builder_target` | `string` |
| Aot | `ep.ng_aot` | `string` |
| Optimization | `ep.ng_optimization` | `string` |
<!--DIMENSIONS_TABLE_END-->

### List of Event Custom Metrics

<!--METRICS_TABLE_BEGIN-->
| Name | Parameter | Type |
|:---:|:---|:---|
| AllChunksCount | `epn.ng_all_chunks_count` | `number` |
| LazyChunksCount | `epn.ng_lazy_chunks_count` | `number` |
| InitialChunksCount | `epn.ng_initial_chunks_count` | `number` |
| ChangedChunksCount | `epn.ng_changed_chunks_count` | `number` |
| DurationInMs | `epn.ng_duration_ms` | `number` |
| CssSizeInBytes | `epn.ng_css_size_bytes` | `number` |
| JsSizeInBytes | `epn.ng_js_size_bytes` | `number` |
| NgComponentCount | `epn.ng_component_count` | `number` |
<!--METRICS_TABLE_END-->

## Debugging

Using `NG_DEBUG=1` will enable Google Analytics debug mode, To view the debug events, in Google Analytics go to `Configure > DebugView`.

## Disabling Usage Analytics

There are 2 ways of disabling usage analytics:

1. using `ng analytics disable --global` (or changing the global configuration file yourself). This is the same
   as answering "No" to the prompt.
1. There is an `NG_CLI_ANALYTICS` environment variable that overrides the global configuration.
   That flag is a string that represents the User ID. If the string `"false"` is used it will
   disable analytics for this run.
