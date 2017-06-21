# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])

load("@io_bazel_rules_typescript//:defs.bzl", "ts_library")

licenses(["notice"])  # MIT License

ts_library(
    name = "sink",
    srcs = glob(
        include = ["*.ts"],
        exclude = ["*_spec.ts"],
    ),
    deps = [
        "//packages/angular_devkit/schematics/src/exception",
        "//packages/angular_devkit/schematics/src/tree",
        "//packages/angular_devkit/schematics/src/utility",
        # @deps: rxjs
        # @typings: es2015.core
        # @typings: node
    ],
    tsconfig = "//:tsconfig.json",
)

ts_library(
    name = "spec",
    srcs = glob(["*_spec.ts"]),
    deps = [
        ":sink",
        "//packages/angular_devkit/schematics/src/exception",
        "//packages/angular_devkit/schematics/src/tree",
        "//packages/angular_devkit/schematics/src/utility",
        # @deps: rxjs
        # @typings: glob
        # @typings: jasmine
        # @typings: node
    ],
    tsconfig = "//:tsconfig.json",
)
