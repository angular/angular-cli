# Usage Metrics Gathering

This document list exactly what is gathered and how.

Any change to analytics should most probably include a change to this document.

## Dimensions and Metrics

Google Analytics Custom Dimensions are used to track system values and flag values. These
dimensions are aggregated automatically on the backend.

One dimension per flag, and although technically there can be an overlap between 2 commands, for
simplicity it should remain unique across all CLI commands. The dimension is the value of the
`x-user-analytics` field in the `schema.json` files.

### Adding dimension or metic.
1. Create the dimension or metric in [Google Analytics](https://analytics.google.com/) first. These are not tracked if they aren't
   defined in Google Analytics.
1. Use the ID of the dimension as the `x-user-analytics` value in the `schema.json` file.
1. New dimension and metrics PRs need to be approved by the tooling lead and require a new [Launch](http://go/launch).

### Deleting a dimension or metic.
1. Archive the dimension and metric in [Google Analytics](https://analytics.google.com/).


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
| UserId | `up.ng_user_id` | `string` |
| OsArchitecture | `up.ng_os_architecture` | `string` |
| NodeVersion | `up.ng_node_version` | `string` |
| NodeMajorVersion | `upn.ng_node_major_version` | `number` |
| AngularCLIVersion | `up.ng_cli_version` | `string` |
| AngularCLIMajorVersion | `upn.ng_cli_major_version` | `number` |
| PackageManager | `up.ng_package_manager` | `string` |
| PackageManagerVersion | `up.ng_pkg_manager_version` | `string` |
| PackageManagerMajorVersion | `upn.ng_pkg_manager_major_v` | `number` |
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
| AllProjectsCount | `epn.all_projects_count` | `number` |
| LibraryProjectsCount | `epn.libs_projects_count` | `number` |
| ApplicationProjectsCount | `epn.apps_projects_count` | `number` |
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
