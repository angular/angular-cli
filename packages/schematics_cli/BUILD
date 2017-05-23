package(default_visibility=["//visibility:public"])
load("@io_bazel_rules_typescript//:defs.bzl", "ts_library")
load("@io_bazel_rules_typescript//internal:node.bzl", "node_binary")


ts_library(
    name = "schematics",
    srcs = glob([
        "schematics/*.ts",
        "schematics/*/index.ts",
        "schematics/component/utility/*.ts"
    ]),
    deps = [
        "//packages/schematics",
    ],
    tsconfig = "//:tsconfig.json",
)


ts_library(
    name = "cli_lib",
    srcs = glob([ "src/*.ts" ]),
    deps = [
        "//packages/schematics",
    ],
    tsconfig = "//:tsconfig.json",
)


filegroup(
    name = "schematics_data",
    srcs = glob([ "schematics/*/files/**/*" ])
)



node_binary(
    name = "schematics_cli",
    main = "__main__/packages/schematics_cli/bin/schematics.js",
    data = [
        "bin/schematics.js",
        ":cli_lib",
        ":schematics",
        ":schematics_data",
    ],
)
