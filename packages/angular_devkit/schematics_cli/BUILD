# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])
load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")

licenses(["notice"])  # MIT License

ts_library(
    name = "schematics-cli",
    srcs = glob(
        include = ["bin/**/*.ts"],
        exclude = ["bin/**/*_spec.ts", "bin/**/*_benchmark.ts"],
    ),
    deps = [
      "//packages/angular_devkit/core",
      "//packages/angular_devkit/core:node",
      "//packages/angular_devkit/schematics",
      "//packages/angular_devkit/schematics:tasks",
      "//packages/angular_devkit/schematics:tools",
        # @deps: rxjs
    ],
    tsconfig = "//:tsconfig.json",
    module_name = "@angular-devkit/schematics-cli",
    module_root = "bin"
)
