# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])
load("@io_bazel_rules_typescript//:defs.bzl", "ts_library")

licenses(["notice"])  # MIT License

ts_library(
    name = "core",
    srcs = glob(
        include = ["**/*.ts"],
        exclude = ["**/*_spec.ts", "**/*_benchmark.ts"],
    ),
    deps = [
        # @deps: rxjs
    ],
    tsconfig = "//:tsconfig.json",
    module_name = "@angular-devkit/schematics",
    module_root = "src"
)

ts_library(
    name = "spec",
    srcs = glob(
        include = ["**/*_spec.ts"],
    ),
    deps = [
        ":core",
        # @deps: rxjs
        # @typings: jasmine
    ],
    tsconfig = "//:tsconfig.json",
    module_name = "@angular-devkit/schematics",
    module_root = "src"
)
