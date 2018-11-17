# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")

package(default_visibility = ["//visibility:public"])

ts_library(
    name = "architect",
    srcs = glob(
        include = ["src/**/*.ts"],
        exclude = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
        ],
    ),
    module_name = "@angular-devkit/architect",
    module_root = "src/index.d.ts",
    # strict_checks = False,
    data = glob(["**/*.json"]),
    deps = [
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "@rxjs",
        "@rxjs//operators",
        "@npm//@types/node",
    ],
)
