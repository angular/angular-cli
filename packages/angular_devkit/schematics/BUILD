# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])
load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")

licenses(["notice"])  # MIT License

ts_library(
    name = "schematics",
    srcs = glob(
        include = ["src/**/*.ts"],
        exclude = ["src/**/*_spec.ts", "src/**/*_benchmark.ts"],
    ),
    deps = [
      "//packages/angular_devkit/core",
        # @deps: rxjs
    ],
    tsconfig = "//:tsconfig.json",
    module_name = "@angular-devkit/schematics",
    module_root = "src"
)

ts_library(
    name = "tools",
    srcs = glob(
        include = ["tools/**/*.ts"],
        exclude = ["tools/**/*_spec.ts", "tools/**/*_benchmark.ts"],
    ),
    deps = [
        ":schematics",
        "//packages/angular_devkit/core",
        # @deps: rxjs
    ],
    tsconfig = "//:tsconfig.json",
    module_name = "@angular-devkit/schematics/tools",
    module_root = "tools"
)

ts_library(
    name = "test",
    srcs = glob(
        include = ["test/**/*.ts"],
        exclude = [],
    ),
    deps = [
        ":schematics",
        ":tools",
        "//packages/angular_devkit/core",
        # @deps: rxjs
    ],
    tsconfig = "//:tsconfig.json",
    module_name = "@angular-devkit/schematics/test",
    module_root = "test"
)

ts_library(
    name = "spec",
    srcs = glob(
        include = ["src/**/*_spec.ts"],
    ),
    deps = [
        ":schematics",
        # @deps: rxjs
        # @typings: jasmine
    ],
    tsconfig = "//:tsconfig.json",
)

ts_library(
    name = "tools_spec",
    srcs = glob(
        include = ["tools/**/*_spec.ts"],
    ),
    deps = [
        ":tools",
        # @deps: rxjs
        # @typings: jasmine
    ],
    tsconfig = "//:tsconfig.json",
)
