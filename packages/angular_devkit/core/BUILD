# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])

load("//tools:defaults.bzl", "ts_library")

licenses(["notice"])  # MIT License

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
    module_name = "@angular-devkit/core",
    module_root = "src",
    deps = [
        "@rxjs",
        "@rxjs//operators",
        # @typings: es2015.core
        # @typings: es2015.symbol.wellknown
        # @typings: ajv
        # @typings: node
        # @typings: source-map
    ],
)

ts_library(
    name = "node",
    srcs = glob(
        include = ["node/**/*.ts"],
        exclude = [
            "node/**/*_spec.ts",
            "node/**/*_spec_large.ts",
            "tools/**/*_benchmark.ts",
        ],
    ),
    module_name = "@angular-devkit/core/node",
    module_root = "node",
    deps = [
        "//packages/angular_devkit/core",
        "@rxjs",
        "@rxjs//operators",
    ],
)

ts_library(
    name = "spec",
    srcs = glob(
        include = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
        ],
    ),
    deps = [
        ":core",
        ":node",
        "@rxjs",
        "@rxjs//operators",
        # @typings: jasmine
    ],
)
