# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])

load("//tools:defaults.bzl", "ts_library")

licenses(["notice"])  # MIT

ts_library(
    name = "architect-cli",
    srcs = [
        "bin/architect.ts",
    ],
    deps = [
        "//packages/angular_devkit/architect",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "@rxjs",
        "@rxjs//operators",
    ],
    tsconfig = "//:tsconfig.json",
    module_name = "@angular-devkit/architect-cli",
    module_root = "bin",
)
