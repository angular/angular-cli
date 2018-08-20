# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])

load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:defs.bzl", "jasmine_node_test")

licenses(["notice"])  # MIT License

# @angular-devkit/core

ts_library(
    name = "core",
    srcs = glob(
        include = ["src/**/*.ts"],
        exclude = [
            "src/**/*_spec.ts",
            "src/**/*_spec_large.ts",
            "src/**/*_benchmark.ts",
        ],
    ),
    data = glob(["**/*.json"]),
    module_name = "@angular-devkit/core",
    module_root = "src/index.d.ts",
    deps = [
        "@rxjs",
        "@rxjs//operators",
        # @typings: es2015.core
        # @typings: es2015.symbol.wellknown
        # @typings: es2016.array.include
        # @typings: ajv
        # @typings: node
        # @typings: source-map
    ],
)

ts_library(
    name = "core_test_lib",
    srcs = glob(
        include = [
            "src/**/*_spec.ts",
            "src/**/*_spec_large.ts",
        ],
    ),
    deps = [
        ":core",
        ":node",
        "@rxjs",
        "@rxjs//operators",
        # @typings: jasmine
        # @typings: node
    ],
    data = [
        "src/workspace/workspace-schema.json",
        "src/workspace/test/test-workspace.json"    
    ],
)

jasmine_node_test(
    name = "core_test",
    srcs = [":core_test_lib"],
)


# @angular-devkit/core/node

ts_library(
    name = "node",
    srcs = glob(
        include = ["node/**/*.ts"],
        exclude = [
            "node/testing/**/*.ts",
            "node/**/*_spec.ts",
            "node/**/*_spec_large.ts",
            "node/**/*_benchmark.ts",
        ],
    ),
    module_name = "@angular-devkit/core/node",
    module_root = "node/index.d.ts",
    deps = [
        ":core",
        "@rxjs",
        "@rxjs//operators",
        # @typings: node
    ],
)

ts_library(
    name = "node_test_lib",
    srcs = glob(
        include = [
            "node/**/*_spec.ts",
            "node/**/*_spec_large.ts",
        ],
    ),
    deps = [
        ":core",
        ":node",
        "@rxjs",
        "@rxjs//operators",
        # @typings: jasmine
        # @typings: node
    ],
)

jasmine_node_test(
    name = "node_test",
    srcs = [":node_test_lib"],
)


# @angular-devkit/core/node/testing

ts_library(
    name = "node_testing",
    srcs = glob(
        include = ["node/testing/**/*.ts"],
        exclude = [
            "node/testing/**/*_spec.ts",
            "node/testing/**/*_spec_large.ts",
            "node/testing/**/*_benchmark.ts",
        ],
    ),
    module_name = "@angular-devkit/core/node/testing",
    module_root = "node/testing/index.d.ts",
    deps = [
        ":core",
        ":node",
        "@rxjs",
        "@rxjs//operators",
        # @typings: node
    ],
)