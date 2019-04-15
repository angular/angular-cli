# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])

load("@npm_bazel_typescript//:defs.bzl", "ts_library")

licenses(["notice"])  # MIT

ts_library(
    name = "architect_cli",
    srcs = [
        "bin/architect.ts",
    ] + glob(["src/**/*.ts"]),
    module_name = "@angular-devkit/architect-cli",
    deps = [
        "//packages/angular_devkit/architect",
        "//packages/angular_devkit/architect:node",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "@npm//@types/minimist",
        "@npm//@types/node",
        "@npm//@types/progress",
        "@npm//rxjs",
    ],
)
