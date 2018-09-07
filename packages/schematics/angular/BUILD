# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:defs.bzl", "jasmine_node_test")
load("//tools:defs.bzl", "ts_json_schema")

package(default_visibility = ["//visibility:public"])

ts_library(
    name = "angular",
    srcs = glob(
        include = ["**/*.ts"],
        exclude = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
            "**/*_benchmark.ts",
            # Also exclude templated files.
            "*/files/**/*.ts",
            "*/other-files/**/*.ts",
            # Exclude test helpers.
            "utility/test/**/*.ts"
        ],
    ),
    deps = [
        ":app_shell_schema",
        ":application_schema",
        ":class_schema",
        ":component_schema",
        ":directive_schema",
        ":e2e_schema",
        ":enum_schema",
        ":guard_schema",
        ":interface_schema",
        ":library_schema",
        ":module_schema",
        ":ng_new_schema",
        ":pipe_schema",
        ":service_schema",
        ":service_worker_schema",
        ":universal_schema",
        ":workspace_schema",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/schematics",
        "//packages/angular_devkit/schematics:tasks",
        "@rxjs",
        "@rxjs//operators",
        # @typings: typescript
        # @typings: node
    ],
)

ts_json_schema(
    name = "app_shell_schema",
    src = "app-shell/schema.json",
)

ts_json_schema(
    name = "application_schema",
    src = "application/schema.json",
)

ts_json_schema(
    name = "class_schema",
    src = "class/schema.json",
)

ts_json_schema(
    name = "component_schema",
    src = "component/schema.json",
)

ts_json_schema(
    name = "directive_schema",
    src = "directive/schema.json",
)

ts_json_schema(
    name = "e2e_schema",
    src = "e2e/schema.json",
)

ts_json_schema(
    name = "enum_schema",
    src = "enum/schema.json",
)

ts_json_schema(
    name = "guard_schema",
    src = "guard/schema.json",
)

ts_json_schema(
    name = "interface_schema",
    src = "interface/schema.json",
)

ts_json_schema(
    name = "library_schema",
    src = "library/schema.json",
)

ts_json_schema(
    name = "module_schema",
    src = "module/schema.json",
)

ts_json_schema(
    name = "ng_new_schema",
    src = "ng-new/schema.json",
)

ts_json_schema(
    name = "pipe_schema",
    src = "pipe/schema.json",
)

ts_json_schema(
    name = "service_schema",
    src = "service/schema.json",
)

ts_json_schema(
    name = "service_worker_schema",
    src = "service-worker/schema.json",
)

ts_json_schema(
    name = "universal_schema",
    src = "universal/schema.json",
)

ts_json_schema(
    name = "workspace_schema",
    src = "workspace/schema.json",
)

ts_library(
    name = "angular_test_lib",
    srcs = glob(
        include = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
            "utility/test/**/*.ts"
        ],
    ),
    data = glob(
        include = [
            "**/*.json",
            "*/files/**",
            "*/other-files/**",
        ]
    ),
    deps = [
        ":angular",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/schematics",
        "//packages/angular_devkit/schematics:testing",
        "@rxjs",
        "@rxjs//operators",
        # @typings: jasmine
        # @typings: node
    ],
)

jasmine_node_test(
    name = "angular_test",
    srcs = [":angular_test_lib"],
)
