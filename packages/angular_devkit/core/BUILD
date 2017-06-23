# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])
load("@io_bazel_rules_typescript//:defs.bzl", "ts_library")

licenses(["notice"])  # MIT License

ts_library(
    name = "schematics",
    srcs = [
        "src/index.ts",
    ],
    deps = [
        "//packages/angular_devkit/schematics/src/engine",
        "//packages/angular_devkit/schematics/src/exception",
        "//packages/angular_devkit/schematics/src/rules",
        "//packages/angular_devkit/schematics/src/sink",
        "//packages/angular_devkit/schematics/src/tree",
        "//packages/angular_devkit/schematics/src/utility",
    ],
    tsconfig = "//:tsconfig.json",
    module_name = "@angular-devkit/schematics",
    module_root = "src"
)
