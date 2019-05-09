# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
package(default_visibility = ["//visibility:public"])

load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("@npm_bazel_typescript//:defs.bzl", "ts_library")

# @external_begin
load("@build_bazel_rules_nodejs//:defs.bzl", "npm_package")
# @external_end

licenses(["notice"])  # MIT License

# @angular-devkit/schematics

ts_library(
    name = "schematics",
    srcs = glob(
        include = ["src/**/*.ts"],
        exclude = [
            "src/**/*_spec.ts",
            "src/**/*_spec_large.ts",
            "src/**/*_benchmark.ts",
        ],
    ),
    module_name = "@angular-devkit/schematics",
    module_root = "src/index.d.ts",
    deps = [
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",  # TODO: get rid of this for 6.0
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

ts_library(
    name = "schematics_test_lib",
    testonly = True,
    srcs = glob(
        include = [
            "src/**/*_spec.ts",
            "src/**/*_spec_large.ts",
        ],
    ),
    # @external_begin
    tsconfig = "//:tsconfig-test.json",
    # @external_end
    deps = [
        ":schematics",
        ":testing",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "@npm//@types/jasmine",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

jasmine_node_test(
    name = "schematics_test",
    srcs = [":schematics_test_lib"],
    deps = [
        "@npm//jasmine",
        "@npm//source-map",
    ],
)

# @angular-devkit/schematics/tasks

ts_library(
    name = "tasks",
    srcs = glob(
        include = ["tasks/**/*.ts"],
        exclude = [
            "tasks/node/**/*.ts",
            "tasks/**/*_spec.ts",
            "tasks/**/*_benchmark.ts",
            "tasks/tslint-fix/test/**/*",
        ],
    ),
    module_name = "@angular-devkit/schematics/tasks",
    module_root = "tasks/index.d.ts",
    deps = [
        ":schematics",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "@npm//@types/node",
        "@npm//rxjs",
        "@npm//tslint",
        "@npm//typescript",
    ],
)

# @angular-devkit/schematics/tasks/node

ts_library(
    name = "tasks_node",
    srcs = glob(
        include = ["tasks/node/**/*.ts"],
        exclude = [
            "tasks/node/**/*_spec.ts",
            "tasks/node/**/*_benchmark.ts",
        ],
    ),
    module_name = "@angular-devkit/schematics/tasks/node",
    module_root = "tasks/node/index.d.ts",
    deps = [
        ":schematics",
        ":tasks",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

ts_library(
    name = "tasks_test_lib",
    testonly = True,
    srcs = glob(
        include = [
            "tasks/**/*_spec.ts",
            "tasks/**/*_spec_large.ts",
            "tasks/tslint-fix/test/**/*.ts",
        ],
    ),
    data = [
        "tasks/tslint-fix/test/collection.json",
        "tasks/tslint-fix/test/rules/customRuleRule.js",
    ],
    # @external_begin
    tsconfig = "//:tsconfig-test.json",
    # @external_end
    deps = [
        ":schematics",
        ":tasks",
        ":testing",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "//packages/angular_devkit/core:node_testing",
        "@npm//@types/jasmine",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

jasmine_node_test(
    name = "tasks_test",
    srcs = [":tasks_test_lib"],
    deps = [
        "@npm//jasmine",
        "@npm//source-map",
    ],
)

# @angular-devkit/schematics/tools

ts_library(
    name = "tools",
    srcs = glob(
        include = ["tools/**/*.ts"],
        exclude = [
            "tools/**/*_spec.ts",
            "tools/**/*_benchmark.ts",
            "tools/test/**/*.ts",
        ],
    ),
    module_name = "@angular-devkit/schematics/tools",
    module_root = "tools/index.d.ts",
    deps = [
        ":schematics",
        ":tasks",
        ":tasks_node",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

ts_library(
    name = "tools_test_lib",
    testonly = True,
    srcs = glob(
        include = [
            "tools/**/*_spec.ts",
            "tools/**/*_spec_large.ts",
            "tools/test/**/*.ts",
        ],
    ),
    # @external_begin
    tsconfig = "//:tsconfig-test.json",
    # @external_end
    deps = [
        ":schematics",
        ":tasks",
        ":testing",
        ":tools",
        "//packages/angular_devkit/core",
        "//packages/angular_devkit/core:node",
        "//tests/angular_devkit/schematics/tools/file-system-engine-host:file_system_engine_host_test_lib",
        "@npm//@types/jasmine",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

jasmine_node_test(
    name = "tools_test",
    srcs = [":tools_test_lib"],
    deps = [
        "@npm//jasmine",
        "@npm//source-map",
    ],
)

# @angular-devkit/schematics/testing

ts_library(
    name = "testing",
    srcs = glob(
        include = ["testing/**/*.ts"],
    ),
    module_name = "@angular-devkit/schematics/testing",
    module_root = "testing/index.d.ts",
    deps = [
        ":schematics",
        ":tasks",
        ":tasks_node",
        ":tools",
        "//packages/angular_devkit/core",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

# @external_begin
npm_package(
    name = "npm_package",
    deps = [
        ":schematics",
        ":tasks",
        ":testing",
        ":tools",
    ],
)
# @external_end
