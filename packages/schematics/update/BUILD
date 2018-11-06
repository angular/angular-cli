# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:defs.bzl", "jasmine_node_test")
load("//tools:ts_json_schema.bzl", "ts_json_schema")

package(default_visibility = ["//visibility:public"])

ts_library(
    name = "update",
    srcs = glob(
        include = ["**/*.ts"],
        exclude = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
            "**/*_benchmark.ts",
        ],
    ),
    deps = [
        ":migrate_schema",
        ":update_schema",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/schematics",
        "//packages/angular_devkit/schematics:tasks",
        "@rxjs",
        "@rxjs//operators",
        "@npm//@types/node",
        "@npm//@types/semver",
    ],
)

ts_json_schema(
    name = "update_schema",
    src = "update/schema.json",
)

ts_json_schema(
    name = "migrate_schema",
    src = "migrate/schema.json",
)

ts_library(
    name = "update_test_lib",
    srcs = glob(
        include = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
        ],
    ),
    data = glob(
        include = [
            "**/*.json",
        ]
    ),
    deps = [
        ":update",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/schematics",
        "//packages/angular_devkit/schematics:testing",
        "@rxjs",
        "@rxjs//operators",
        "@npm//@types/jasmine",
        "@npm//@types/node",
        "@npm//@types/semver",
        "@npm//pacote",
    ],
    testonly = True,
    # @external_begin
    tsconfig = "//:tsconfig-test.json",
    # @external_end
)

jasmine_node_test(
    name = "update_test",
    srcs = [":update_test_lib"],
    deps = [
        "@npm//jasmine",
        "@npm//source-map",
        "@npm//chokidar",
        "@npm//npm-registry-client",
    ],
)
