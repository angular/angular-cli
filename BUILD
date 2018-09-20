# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])

licenses(["notice"])  # MIT License

exports_files([
    "LICENSE",
    "tsconfig.json",  # @external
    "tslint.base.json",  # @external
])

# NOTE: this will move to node_modules/BUILD in a later release
# @external_begin
NODE_MODULES_EXCLUDE = [
    # e.g. node_modules/adm-zip/test/assets/attributes_test/New folder/hidden.txt
    "node_modules/**/test/**",
    # e.g. node_modules/xpath/docs/function resolvers.md
    "node_modules/**/docs/**",
    # e.g. node_modules/puppeteer/.local-chromium/mac-536395/chrome-mac/Chromium.app/Contents/Versions/66.0.3347.0/Chromium Framework.framework/Chromium Framework
    "node_modules/**/.*/**",
    # Ignore paths with spaces.
    "node_modules/**/* *",
]

filegroup(
    name = "node_modules",
    srcs = glob(
        # Only include files we might use, to reduce the file count and surface size of 
        # filename problems.
        [
            "node_modules/**/*.js",
            "node_modules/**/*.json",
            "node_modules/**/*.d.ts",
        ],
        exclude = NODE_MODULES_EXCLUDE,
    ) + glob(["node_modules/.bin/*"]),
)

# node_modules filegroup for tools/quicktype_runner, which contains quicktype-core and tslint.
QUICKTYPE_TRANSITIVE_DEPENDENCIES = [
    "collection-utils",
    "core-util-is",
    "inherits",
    "isarray",
    "js-base64",
    "pako",
    "pluralize",
    "process-nextick-args",
    "quicktype-core",
    "readable-stream",
    "safe-buffer",
    "stream-json",
    "string-to-stream",
    "tiny-inflate",
    "unicode-properties",
    "unicode-trie",
    "urijs",
    "util-deprecate",
    "wordwrap",
]

filegroup(
    name = "quicktype_node_modules",
    srcs = glob(
        [
            "/".join([
                "node_modules", "**", pkg, "**/*.js",
            ]) for pkg in QUICKTYPE_TRANSITIVE_DEPENDENCIES
        ] + [
            "/".join([
                "node_modules", "**", pkg, "**/*.json",
            ]) for pkg in QUICKTYPE_TRANSITIVE_DEPENDENCIES
        ],
        exclude = NODE_MODULES_EXCLUDE,
    )
)
# @external_end
