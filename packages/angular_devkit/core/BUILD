# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])
load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")

licenses(["notice"])  # MIT License

ts_library(
    name = "core",
    srcs = glob(
        include = ["src/**/*.ts"],
        exclude = ["src/**/*_spec.ts", "src/**/*_benchmark.ts"],
    ),
    deps = [
        # @deps: rxjs
    ],
    tsconfig = "//:tsconfig.json",
    module_name = "@angular-devkit/core",
    module_root = "src"
)

ts_library(
    name = "node",
    srcs = glob(
        include = ["node/**/*.ts"],
        exclude = ["node/**/*_spec.ts", "tools/**/*_benchmark.ts"],
    ),
    deps = [
        "//packages/angular_devkit/core",
        # @deps: rxjs
    ],
    tsconfig = "//:tsconfig.json",
    module_name = "@angular-devkit/core/node",
    module_root = "node"
)

ts_library(
    name = "spec",
    srcs = glob(
        include = ["**/*_spec.ts"],
    ),
    deps = [
        ":core",
        ":node",
        # @deps: rxjs
        # @typings: jasmine
    ],
    tsconfig = "//:tsconfig.json",
)
