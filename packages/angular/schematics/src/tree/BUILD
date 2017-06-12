# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility=["//visibility:public"])
load("@io_bazel_rules_typescript//:defs.bzl", "ts_library")
licenses(["notice"])  # MIT License


ts_library(
    name = "tree",
    srcs = glob(
        include = ["*.ts"],
        exclude = ["*_spec.ts"],
    ),
    deps = [
        "//packages/schematics/src/exception",
        "//packages/schematics/src/utility",
    ],
    tsconfig = "//:tsconfig.json",
)


ts_library(
    name = "spec",
    srcs = glob(["*_spec.ts"]),
    deps = [
        ":tree",
    ],
    tsconfig = "//:tsconfig.json",
)
