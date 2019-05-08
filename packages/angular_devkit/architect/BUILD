# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("@npm_bazel_typescript//:defs.bzl", "ts_library")

# @external_begin
load("@build_bazel_rules_nodejs//:defs.bzl", "npm_package")

# @external_end
load("//tools:ts_json_schema.bzl", "ts_json_schema")

package(default_visibility = ["//visibility:public"])

ts_json_schema(
    name = "builder_input_schema",
    src = "src/input-schema.json",
)

ts_json_schema(
    name = "builder_output_schema",
    src = "src/output-schema.json",
)

ts_json_schema(
    name = "builder_builders_schema",
    src = "src/builders-schema.json",
)

ts_json_schema(
    name = "progress_schema",
    src = "src/progress-schema.json",
)

ts_library(
    name = "node",
    srcs = glob(
        include = ["node/**/*.ts"],
        exclude = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
        ],
    ),
    module_name = "@angular-devkit/architect/node",
    module_root = "node/index.d.ts",
    # strict_checks = False,
    deps = [
        ":architect",
        ":builder_builders_schema",
        ":builder_input_schema",
        ":builder_output_schema",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

ts_library(
    name = "architect",
    srcs = glob(
        include = ["src/**/*.ts"],
        exclude = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
        ],
    ),
    # strict_checks = False,
    data = glob(["**/*.json"]),
    module_name = "@angular-devkit/architect",
    module_root = "src/index.d.ts",
    deps = [
        ":builder_input_schema",
        ":builder_output_schema",
        ":progress_schema",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

ts_library(
    name = "testing",
    srcs = glob(
        include = ["testing/**/*.ts"],
        exclude = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
        ],
    ),
    module_name = "@angular-devkit/architect/testing",
    module_root = "testing/index.d.ts",
    deps = [
        ":architect",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

# @external_begin
npm_package(
    name = "npm_package",
    deps = [
        ":architect",
        ":testing",
    ],
)
# @external_end
