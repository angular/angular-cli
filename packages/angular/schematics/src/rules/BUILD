# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])
load("@io_bazel_rules_typescript//:defs.bzl", "ts_library")
licenses(["notice"])  # MIT License


ts_library(
    name = "rules",
    srcs = glob(
        include = [
            "*.ts",
            "*/*.ts",
        ],
        exclude = [
            "*_spec.ts",
            "*/*_spec.ts",
        ],
    ),
    deps = [
        "//packages/angular/schematics/src/engine",
        "//packages/angular/schematics/src/exception",
        "//packages/angular/schematics/src/tree",
        # @deps: rxjs
        # @typings: node
    ],
    tsconfig = "//:tsconfig.json",
)


ts_library(
    name = "spec",
    srcs = glob(["*_spec.ts"]),
    deps = [
        ":rules",
        "//packages/angular/schematics/src/engine",
        "//packages/angular/schematics/src/tree",
        # @deps: rxjs
        # @typings: jasmine
    ],
    tsconfig = "//:tsconfig.json",
)
