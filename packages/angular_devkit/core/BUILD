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
    # strict_checks = False,
    deps = [
        "@rxjs",
        "@rxjs//operators",
        "@npm//@types/node",
        "@npm//@types/source-map",
        "@npm//ajv",
        # @typings: es2015.core
        # @typings: es2015.symbol.wellknown
        # @typings: es2016.array.include
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
    # strict_checks = False,
    deps = [
        ":core",
        ":node",
        "@rxjs",
        "@rxjs//operators",
        "@npm//@types/node",
        "@npm//@types/jasmine",
    ],
    data = [
        "src/workspace/workspace-schema.json",
        "src/workspace/test/test-workspace.json"
    ],
    testonly = True,
    # @external_begin
    tsconfig = "//:tsconfig-test.json",
    # @external_end
)

jasmine_node_test(
    name = "core_test",
    srcs = [":core_test_lib"],
    deps = [
        "@npm//jasmine",
        "@npm//source-map",
        "@npm//chokidar",
    ],
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
        "@npm//@types/node",
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
        "@npm//@types/node",
        "@npm//@types/jasmine",
    ],
    testonly = True,
    # @external_begin
    tsconfig = "//:tsconfig-test.json",
    # @external_end
)

jasmine_node_test(
    name = "node_test",
    srcs = [":node_test_lib"],
    deps = [
        "@npm//jasmine",
        "@npm//chokidar",
        "@npm//source-map",
        "@npm//temp",
        "@npm//tslint",
    ],
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
    # strict_checks = False,
    deps = [
        ":core",
        ":node",
        "@rxjs",
        "@rxjs//operators",
        "@npm//@types/node",
        "@npm//@types/jasmine",
    ],
)
