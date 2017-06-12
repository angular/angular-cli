# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility=["//visibility:private"])
load("@io_bazel_rules_typescript//:defs.bzl", "ts_library")

exports_files(["tsconfig.json"])  # @external
licenses(["notice"])  # MIT License


ts_library(
    name = "schematics_tools",
    srcs = [
      "src/index.ts",
    ],
    deps = [
      "//packages/schematics"
    ],
    tsconfig = "//:tsconfig.json",
    visibility = [ "//visibility:public" ],
    module_name = "@angular/schematics-tools",
    module_root = "src"
)
