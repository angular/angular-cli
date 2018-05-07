# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("//tools:defaults.bzl", "ts_library")

package(default_visibility = ["//visibility:public"])

ts_library(
    name = "architect",
    srcs = glob(
        ["src/**/*.ts"],
        # Currently, this library is used only with the rollup plugin.
        # To make it simpler for downstream repositories to compile this, we
        # neither provide compile-time deps as an `npm_install` rule, nor do we
        # expect the downstream repository to install @types/webpack[-*]
        # So we exclude files that depend on webpack typings.
        exclude = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
        ],
    ),
    deps = [
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "@rxjs",
        "@rxjs//operators",
    ],
    tsconfig = "//:tsconfig.json",
    module_name = "@angular-devkit/architect",
    module_root = "src",
    # Borrow the compile-time deps of the typescript compiler
    # Just to avoid an extra npm install action.
    node_modules = "@build_bazel_rules_typescript_tsc_wrapped_deps//:node_modules",
)
