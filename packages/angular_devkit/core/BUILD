# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])

load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("@npm_bazel_typescript//:defs.bzl", "ts_library")

# @external_begin
load("@build_bazel_rules_nodejs//:defs.bzl", "npm_package")
# @external_end

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
    data = glob(["**/*.json"]) + [
        "//packages/angular_devkit/core/third_party/github.com/chalk/supports-color",
    ],
    module_name = "@angular-devkit/core",
    module_root = "src/index.d.ts",
    deps = [
        "@npm//rxjs",
        "@npm//@types/node",
        "@npm//ajv",
        "@npm//magic-string",
        "@npm//source-map",
        # @typings: es2015.core
        # @typings: es2015.symbol.wellknown
        # @typings: es2016.array.include
    ],
)

ts_library(
    name = "core_test_lib",
    testonly = True,
    srcs = glob(
        include = [
            "src/**/*_spec.ts",
            "src/**/*_spec_large.ts",
        ],
    ),
    data = [
        "src/experimental/workspace/test/test-workspace.json",
        "src/experimental/workspace/workspace-schema.json",
    ],
    # @external_begin
    tsconfig = "//:tsconfig-test.json",
    # @external_end
    deps = [
        ":core",
        ":node",
        "@npm//@types/jasmine",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

jasmine_node_test(
    name = "core_test",
    srcs = [":core_test_lib"],
    # TODO: Audit tests to determine if tests can be run in RBE environments
    local = True,
    deps = [
        "@npm//jasmine",
        "@npm//source-map",
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
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

ts_library(
    name = "node_test_lib",
    testonly = True,
    srcs = glob(
        include = [
            "node/**/*_spec.ts",
            "node/**/*_spec_large.ts",
        ],
    ),
    # @external_begin
    tsconfig = "//:tsconfig-test.json",
    # @external_end
    deps = [
        ":core",
        ":node",
        "//tests/angular_devkit/core/node/jobs:jobs_test_lib",
        "@npm//@types/jasmine",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

jasmine_node_test(
    name = "node_test",
    srcs = [":node_test_lib"],
    # TODO: Audit tests to determine if tests can be run in RBE environments
    local = True,
    deps = [
        "@npm//chokidar",
        "@npm//jasmine",
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
    deps = [
        ":core",
        ":node",
        "@npm//@types/jasmine",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

# @external_begin
npm_package(
    name = "npm_package",
    deps = [
        ":core",
        ":node",
        ":node_testing",
    ],
)
# @external_end
