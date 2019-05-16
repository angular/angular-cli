# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("@npm_bazel_typescript//:defs.bzl", "ts_library")
load("//tools:ts_json_schema.bzl", "ts_json_schema")

package(default_visibility = ["//visibility:public"])

ts_library(
    name = "schematics",
    srcs = glob(
        include = ["**/*.ts"],
        exclude = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
            "**/*_benchmark.ts",
            "schematic/files/**",
            "blank/project-files/**",
            "blank/schematic-files/**",
        ],
    ),
    deps = [
        ":blank_schema",
        ":schematic_schema",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/schematics",
        "//packages/angular_devkit/schematics:tasks",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

ts_json_schema(
    name = "blank_schema",
    src = "blank/schema.json",
)

ts_json_schema(
    name = "schematic_schema",
    src = "schematic/schema.json",
)

# For now we don't have specs.
# ts_library(
#     name = "schematics_test_lib",
#     srcs = glob(
#         include = [
#             "**/*_spec.ts",
#             "**/*_spec_large.ts",
#         ],
#         exclude = [
#             "schematic/files/**",
#             "blank/project-files/**",
#             "blank/schematic-files/**",
#         ],
#     ),
#     data = glob(
#         include = [
#             "**/*.json",
#             "collection.json",
#             "schematic/files/**",
#             "blank/project-files/**",
#             "blank/schematic-files/**",
#         ]
#     ),
#     deps = [
#         ":schematics",
#         "//packages/angular_devkit/core",
#         "//packages/angular_devkit/schematics",
#         "//packages/angular_devkit/schematics:testing",
#         "@npm//rxjs",
#
#         "@npm//@types/node",
#         "@npm//@types/jasmine",
#     ],
#     testonly = True,
#     # @external_begin
#     tsconfig = "//:tsconfig-test.json",
#     # @external_end
# )

# jasmine_node_test(
#     name = "schematics_test",
#     srcs = [":schematics_test_lib"],
# )
