package(default_visibility=["//visibility:private"])
load("@io_bazel_rules_typescript//:defs.bzl", "ts_library")

exports_files(["tsconfig.json"])


ts_library(
    name = "schematics",
    srcs = [
      "src/index.ts",
    ],
    deps = [
      "//packages/schematics/src/engine",
      "//packages/schematics/src/exception",
      "//packages/schematics/src/rules",
      "//packages/schematics/src/sink",
      "//packages/schematics/src/tree",
    ],
    tsconfig = "//:tsconfig.json",
    visibility = [ "//visibility:public" ],
    module_name = "@angular/schematics",
    module_root = "src"
)
