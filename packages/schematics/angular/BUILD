# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:defs.bzl", "jasmine_node_test")

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
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/schematics",
        "//packages/angular_devkit/schematics:tasks",
        "@rxjs",
        "@rxjs//operators",
        # @typings: typescript
        # @typings: node
    ],
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
