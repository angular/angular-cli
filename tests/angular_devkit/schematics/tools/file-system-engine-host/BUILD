# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])

load("@npm_bazel_typescript//:defs.bzl", "ts_library")

licenses(["notice"])  # MIT License

ts_library(
    name = "file_system_engine_host_test_lib",
    srcs = glob(
        include = [
            "**/*.ts",
        ],
    ),
    data = glob(
        include = [
            "**/collection.json",
            "**/*.js",
        ],
    ),
    deps = [
        "//packages/angular_devkit/schematics",
        # ":testing",
        # "//packages/angular_devkit/core",
        # "//packages/angular_devkit/core:node",
        # "@npm//rxjs",
        #
        "@npm//@types/jasmine",
        "@npm//@types/node",
    ],
)
