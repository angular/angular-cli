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
        "@npm//@types/webpack",
        "@npm//source-map",
        "@npm//tslib",
        "@npm//typescript",
    ],
)

ts_library(
    name = "build_optimizer_test_lib",
    testonly = True,
    srcs = glob(
        include = [
            "src/**/*_spec.ts",
            "src/**/*_spec_large.ts",
        ],
    ),
    # @external_begin
    tsconfig = "//:tsconfig-test.json",
    deps = [
        ":build_optimizer",
        "//packages/angular_devkit/core",
        "@npm//@types/jasmine",
        "@npm//@types/node",
        "@npm//source-map",
    ],
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

npm_package(
    name = "npm_package",
    deps = [
        ":build_optimizer",
    ],
)
