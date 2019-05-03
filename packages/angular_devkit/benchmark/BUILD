# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("@npm_bazel_typescript//:defs.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:defs.bzl", "npm_package")

package(default_visibility = ["//visibility:public"])

ts_library(
    name = "benchmark",
    srcs = glob(
        include = ["src/**/*.ts"],
        exclude = [
            "src/**/*_spec.ts",
            "src/**/*_spec_large.ts",
            "src/**/*_benchmark.ts",
        ],
    ),
    module_name = "@angular-devkit/benchmark",
    module_root = "src/index.d.ts",
    deps = [
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "@npm//@types/minimist",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

ts_library(
    name = "benchmark_test_lib",
    testonly = True,
    srcs = glob(
        include = [
            "src/**/*_spec.ts",
            "src/**/*_spec_large.ts",
        ],
    ),
    data = [
        "src/test/exit-code-one.js",
        "src/test/fibonacci.js",
        "src/test/test-script.js",
    ],
    # @external_begin
    tsconfig = "//:tsconfig-test.json",
    deps = [
        ":benchmark",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "@npm//@types/jasmine",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
    # @external_end
)

jasmine_node_test(
    name = "benchmark_test",
    srcs = [":benchmark_test_lib"],
    deps = [
        "@npm//jasmine",
        "@npm//minimist",
        "@npm//pidtree",
        "@npm//pidusage",
        "@npm//source-map",
        "@npm//temp",
        "@npm//tree-kill",
    ],
)

npm_package(
    name = "npm_package",
    deps = [
        ":benchmark",
    ],
)
