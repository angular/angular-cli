# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
# @external_begin
package(default_visibility = ["//visibility:public"])

load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary")

nodejs_binary(
    name = "quicktype_runner",
    data = [
        "quicktype_runner.js",
    ],
    entry_point = "quicktype_runner.js",
    install_source_map_support = False,
    node_modules = "@npm//quicktype-core",
    templated_args = [
        # Needed so that node doesn't walk back to the source directory.
        # From there, the relative imports would point to .ts files.
        "--node_options=--preserve-symlinks",
    ],
)

platform(
    name = "rbe_ubuntu1604-angular",
    parents = ["@rbe_ubuntu1604_angular//config:platform"],
    remote_execution_properties = """
        {PARENT_REMOTE_EXECUTION_PROPERTIES}
        properties: {
            name: "dockerAddCapabilities"
            value: "SYS_ADMIN"
        }
        """,
)

# @external_end
