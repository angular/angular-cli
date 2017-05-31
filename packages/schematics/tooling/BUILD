package(default_visibility=["//visibility:public"])
load("@io_bazel_rules_typescript//:defs.bzl", "ts_library")


ts_library(
    name = "tooling",
    srcs = glob(["*.ts"]),
    deps = [
        "//packages/schematics/src/engine",
        "//packages/schematics/src/exception",
        "//packages/schematics/src/tree",
    ],
    tsconfig = "//:tsconfig.json",
)
