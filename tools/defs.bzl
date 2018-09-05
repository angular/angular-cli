# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_test", "nodejs_binary")


def ts_json_schema(name, src, data = [], **kwargs):
    src = src
    out = src.replace(".json", ".ts")

    args = [
        # Needed so that node doesn't walk back to the source directory.
        # From there, the relative imports would point to .ts files.
        "--node_options=--preserve-symlinks",
    ]

    nodejs_test(
        name = name + '.verify',
        data = data + [
            "//tools:quicktype_runner.js",
        ] + [ src, out ],
        node_modules = "//:quicktype_node_modules",
        entry_point = "angular_devkit/tools/quicktype_runner.js",
        templated_args = args + [
            "--verify",
            native.package_name() + "/" + src,
            native.package_name() + "/" + out,
        ],
        tags = [
            "no-sandbox",
        ],
    )
    nodejs_binary(
        name = name + '.accept',
        data = data + [
            "//tools:quicktype_runner.js",
        ] + [ src ],
        node_modules = "//:quicktype_node_modules",
        entry_point = "angular_devkit/tools/quicktype_runner.js",
        templated_args = args + [
            native.package_name() + "/" + src,
            native.package_name() + "/" + out,
        ],
        tags = [
            "no-sandbox",
        ],
    )

    ts_library(
        name = name,
        srcs = [],
    )
