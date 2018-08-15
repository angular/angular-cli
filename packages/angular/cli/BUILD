# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")

package(default_visibility = ["//visibility:public"])

ts_library(
    name = "angular-cli",
    srcs = glob(
        ["**/*.ts"],
        exclude = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
        ],
    ),
    data = glob(["**/*.json"]),
    module_name = "@angular/cli",
    deps = [
        "//packages/angular_devkit/architect",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "//packages/angular_devkit/schematics",
        "//packages/angular_devkit/schematics:tools",
        "@rxjs",
        "@rxjs//operators",
        # @typings: node
        # @typings: semver
    ],
)
