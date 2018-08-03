# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("//tools:defaults.bzl", "ts_library")

ts_library(
    name = "utility",
    srcs = glob(
        include = ["utility/**/*.ts"],
        exclude = [
            "utility/**/*_spec.ts",
            "utility/test/**",
        ],
    ),
    visibility = ["//visibility:public"],
    deps = [
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/schematics",
        "//packages/angular_devkit/schematics:tasks",
        # @typings: typescript
        # @typings: node
    ],
)
