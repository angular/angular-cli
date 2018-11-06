# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:defs.bzl", "jasmine_node_test")

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
        "@rxjs",
        "@rxjs//operators",
        "@npm//@types/node",
        "@npm//@types/minimist",
    ],
)

ts_library(
    name = "benchmark_test_lib",
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
    deps = [
        ":benchmark",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
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
    name = "benchmark_test",
    srcs = [":benchmark_test_lib"],
    deps = [
        "@npm//jasmine",
        "@npm//source-map",
        "@npm//minimist",
        "@npm//pidusage",
        "@npm//pidtree",
        "@npm//tree-kill",
        "@npm//temp",
    ],
)
