package(default_visibility=["//visibility:public"])
load("@io_bazel_rules_typescript//:defs.bzl", "ts_library")


ts_library(
    name = "utility",
    srcs = glob(["*.ts"]),
    deps = [
        "//packages/schematics/src/exception",
    ],
    tsconfig = "//:tsconfig.json",
)
