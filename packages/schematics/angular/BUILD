# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("@npm_bazel_typescript//:defs.bzl", "ts_library")
load("//tools:ts_json_schema.bzl", "ts_json_schema")

package(default_visibility = ["//visibility:public"])

# Create a list of Tuple("path/file.json", "path_file") to be used as rules
ALL_SCHEMA_TARGETS_PAIR = [
    (
        x,
        x.replace("/", "_").replace("-", "_").replace(".json", ""),
    )
    for x in glob(["*/schema.json"])
]

# Create all the targets.
[
    ts_json_schema(
        name = name,
        src = src,
    )
    for (src, name) in ALL_SCHEMA_TARGETS_PAIR
]

ALL_SCHEMA_DEPS = [":" + name for (_, name) in ALL_SCHEMA_TARGETS_PAIR]

ts_library(
    name = "angular",
    srcs = glob(
        include = ["**/*.ts"],
        exclude = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
            "**/*_benchmark.ts",
            # Also exclude templated files.
            "*/files/**/*.ts",
            "*/other-files/**/*.ts",
            # Exclude test helpers.
            "utility/test/**/*.ts",
        ],
    ),
    module_name = "@schematics/angular",
    # strict_checks = False,
    deps = ALL_SCHEMA_DEPS + [
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/schematics",
        "//packages/angular_devkit/schematics:tasks",
        "//packages/schematics/angular/third_party/github.com/Microsoft/TypeScript",
        "@npm//@types/node",
        "@npm//rxjs",
        "@npm//tslint",
    ],
)

jasmine_node_test(
    name = "no_typescript_runtime_dep_test",
    srcs = ["no_typescript_runtime_dep_spec.js"],
    deps = [
        ":angular",
        "@npm//jasmine",
    ],
)

ts_library(
    name = "angular_test_lib",
    testonly = True,
    srcs = glob(
        include = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
            "utility/test/**/*.ts",
        ],
    ),
    data = glob(
        include = [
            "**/*.json",
            "*/files/**",
            "*/other-files/**",
        ],
    ),
    # @external_begin
    tsconfig = "//:tsconfig-test.json",
    deps = ALL_SCHEMA_DEPS + [
        ":angular",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node_testing",
        "//packages/angular_devkit/schematics",
        "//packages/angular_devkit/schematics:testing",
        "//packages/schematics/angular/third_party/github.com/Microsoft/TypeScript",
        "@npm//@types/node",
        "@npm//@types/jasmine",
        "@npm//rxjs",
        "@npm//tslint",
    ],
    # @external_end
)

jasmine_node_test(
    name = "angular_test",
    srcs = [":angular_test_lib"],
    deps = [
        "//packages/schematics/angular/third_party/github.com/Microsoft/TypeScript",
        "@npm//jasmine",
        "@npm//source-map",
    ],
)
