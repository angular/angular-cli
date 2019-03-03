# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])

load("@npm_bazel_typescript//:defs.bzl", "ts_library")

licenses(["notice"])  # MIT License

ts_library(
    name = "jobs_test_lib",
    srcs = glob(
        include = [
            "**/*.ts",
        ],
    ),
    deps = [
        "//packages/angular_devkit/core",
        "@npm//@types/node",
    ],
)
