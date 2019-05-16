# TODO(alexeagle): move this file to /third_party so Bazel can enforce the licensing
licenses(["notice"])

# Downloaded from: https://github.com/chalk/supports-color/tree/17e9579fec886a1058553b6f7529f05e4f7a90dc
# Timestamp: 2019 Feb 14
exports_files(["license"])

filegroup(
    name = "supports-color",
    srcs = [
        "index.js",
        "//packages/angular_devkit/core/third_party/github.com/sindresorhus/has-flag",
    ],
    visibility = ["//:__subpackages__"],
)
