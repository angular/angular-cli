# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])

licenses(["notice"])  # MIT License

exports_files([
    "LICENSE",
    "tsconfig.json",  # @external
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

filegroup(
    name = "quicktype_node_modules",
    srcs = glob([
        "node_modules/quicktype-core/**/*",
    ] + [
        "/".join([
            "node_modules", "**", pkg, "**/*",
        ]) for pkg in [
            "chalk",
            "collection-utils",
            "command-line-args",
            "command-line-usage",
            "core-util-is",
            "graphql",
            "inherits",
            "is-url",
            "isarray",
            "js-base64",
            "lodash",
            "moment",
            "node-fetch",
            "node-persist",
            "pako",
            "pluralize",
            "process-nextick-args",
            "readable-stream",
            "safe-buffer",
            "stream-json",
            "string-hash",
            "string-to-stream",
            "tiny-inflate",
            "typescript-json-schema",
            "unicode-properties",
            "unicode-trie",
            "universal-analytics",
            "urijs",
            "util-deprecate",
            "uuid",
            "wordwrap",
        ]
    ])
)
# @external_end
