# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
# @external_begin
package(default_visibility = ["//visibility:public"])

load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary")

nodejs_binary(
    name = 'quicktype_runner',
    data = [
        "quicktype_runner.js",
    ],
    node_modules = "@npm//quicktype-core",
    entry_point = "angular_cli/tools/quicktype_runner.js",
    templated_args = [
        # Needed so that node doesn't walk back to the source directory.
        # From there, the relative imports would point to .ts files.
        "--node_options=--preserve-symlinks",
    ],
    install_source_map_support = False,
)
# @external_end
