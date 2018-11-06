# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:defs.bzl", "jasmine_node_test")

package(default_visibility = ["//visibility:public"])

ts_library(
    name = "build_optimizer",
    srcs = glob(
        include = ["src/**/*.ts"],
        exclude = [
            # TODO(@filipesilva): shouldn't need to exclude the cli files but can't exclude them
            # from jasmine_node_test.
            "src/**/cli.ts",
            "src/**/*_spec.ts",
            "src/**/*_spec_large.ts",
            "src/**/*_benchmark.ts",
        ],
    ),
    deps = [
        "@npm//@types/node",
        "@npm//@types/source-map",
        "@npm//typescript",
        "@npm//@types/webpack",
    ],
)

ts_library(
    name = "build_optimizer_test_lib",
    srcs = glob(
        include = [
            "src/**/*_spec.ts",
            "src/**/*_spec_large.ts",
        ],
    ),
    deps = [
        ":build_optimizer",
        "//packages/angular_devkit/core",
        "@npm//@types/node",
        "@npm//@types/jasmine",
        "@npm//@types/source-map",
    ],
    testonly = True,
    # @external_begin
    tsconfig = "//:tsconfig-test.json",
    # @external_end
)

jasmine_node_test(
    name = "build_optimizer_test",
    srcs = [":build_optimizer_test_lib"],
    deps = [
        "@npm//jasmine",
        "@npm//source-map",
    ],
)
