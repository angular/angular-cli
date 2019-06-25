# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("@npm_bazel_typescript//:defs.bzl", "ts_library")
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
        "@npm//@types/node",
        "@npm//@types/semver",
        "@npm//rxjs",
        "@npm//semver",
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
    testonly = True,
    srcs = glob(
        include = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
        ],
    ),
    data = glob(
        include = [
            "**/*.json",
        ],
    ),
    # @external_begin
    tsconfig = "//:tsconfig-test.json",
    deps = [
        ":update",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/schematics",
        "//packages/angular_devkit/schematics:testing",
        "@npm//@types/jasmine",
        "@npm//@types/node",
        "@npm//@types/semver",
        "@npm//@yarnpkg/lockfile",
        "@npm//ini",
        "@npm//pacote",
        "@npm//rxjs",
    ],
    # @external_end
)

jasmine_node_test(
    name = "update_test",
    srcs = [":update_test_lib"],
    # TODO: Audit tests to determine if tests can be run in RBE environments
    local = True,
    deps = [
        "@npm//jasmine",
        "@npm//npm-registry-client",
        "@npm//source-map",
    ],
)
