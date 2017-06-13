# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])
load("@io_bazel_rules_typescript//:defs.bzl", "ts_library")

exports_files(["tsconfig.json"])  # @external
licenses(["notice"])  # MIT License


ts_library(
    name = "schematics",
    srcs = [
        "src/index.ts",
    ],
    deps = [
        "//packages/angular/schematics/src/engine",
        "//packages/angular/schematics/src/exception",
        "//packages/angular/schematics/src/rules",
        "//packages/angular/schematics/src/sink",
        "//packages/angular/schematics/src/tree",
        "//packages/angular/schematics/src/utility",
    ],
    tsconfig = "//:tsconfig.json",
    module_name = "@angular/schematics",
    module_root = "src"
)
