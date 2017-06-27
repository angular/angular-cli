# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility=["//visibility:private"])

load("@io_bazel_rules_typescript//:defs.bzl", "ts_library")

licenses(["notice"])  # MIT License

ts_library(
    name = "schematics_tools",
    srcs = glob(
        include = ["src/*.ts"],
        exclude = ["src/*_spec.ts"],
    ),
    deps = [
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/schematics",
        # @typings: node
    ],
    tsconfig = "//:tsconfig.json",
    visibility = [ "//visibility:public" ],
    module_name = "@angular-devkit/schematics-tools",
    module_root = "src",
)

ts_library(
    name = "spec",
    srcs = glob(
        include = ["src/*_spec.ts"],
    ),
    deps = [
        ":schematics_tools",
        # @typings: node
        # @typings: jasmine
    ],
    tsconfig = "//:tsconfig.json",
    visibility = [ "//visibility:public" ],
)
