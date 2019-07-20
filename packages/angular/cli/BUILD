# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

licenses(["notice"])  # MIT

load("@npm_bazel_typescript//:defs.bzl", "ts_library")
load("//tools:ts_json_schema.bzl", "ts_json_schema")

package(default_visibility = ["//visibility:public"])

ts_library(
    name = "angular-cli",
    srcs = glob(
        ["**/*.ts"],
        exclude = [
            "**/*_spec.ts",
            "**/*_spec_large.ts",
        ],
    ),
    data = glob([
        "**/*.json",
        "**/*.md",
    ]),
    module_name = "@angular/cli",
    # strict_checks = False,
    deps = [
        ":command_schemas",
        "//packages/angular_devkit/architect",
        "//packages/angular_devkit/architect:node",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "//packages/angular_devkit/schematics",
        "//packages/angular_devkit/schematics:tools",
        # @typings: es2017.object
        "@npm//@types/debug",
        "@npm//debug",
        "@npm//@types/node",
        "@npm//@types/inquirer",
        "@npm//@types/semver",
        "@npm//@types/universal-analytics",
        "@npm//@types/uuid",
        "@npm//ansi-colors",
        "@npm//rxjs",
    ],
)

ts_library(
    name = "command_schemas",
    srcs = [],
    deps = [
        ":add_schema",
        ":analytics_schema",
        ":build_schema",
        ":config_schema",
        ":deploy_schema",
        ":deprecated_schema",
        ":doc_schema",
        ":e2e_schema",
        ":easter_egg_schema",
        ":generate_schema",
        ":help_schema",
        ":lint_schema",
        ":new_schema",
        ":run_schema",
        ":serve_schema",
        ":test_schema",
        ":update_schema",
        ":version_schema",
        ":xi18n_schema",
    ],
)

ts_json_schema(
    name = "analytics_schema",
    src = "commands/analytics.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "add_schema",
    src = "commands/add.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "build_schema",
    src = "commands/build.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "deploy_schema",
    src = "commands/deploy.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "config_schema",
    src = "commands/config.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "deprecated_schema",
    src = "commands/deprecated.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "doc_schema",
    src = "commands/doc.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "e2e_schema",
    src = "commands/e2e.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "easter_egg_schema",
    src = "commands/easter-egg.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "generate_schema",
    src = "commands/generate.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "help_schema",
    src = "commands/help.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "lint_schema",
    src = "commands/lint.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "new_schema",
    src = "commands/new.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "run_schema",
    src = "commands/run.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "serve_schema",
    src = "commands/serve.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "test_schema",
    src = "commands/test.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "update_schema",
    src = "commands/update.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "version_schema",
    src = "commands/version.json",
    data = [
        "commands/definitions.json",
    ],
)

ts_json_schema(
    name = "xi18n_schema",
    src = "commands/xi18n.json",
    data = [
        "commands/definitions.json",
    ],
)
