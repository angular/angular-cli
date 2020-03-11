# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
load("@npm_bazel_labs//:index.bzl", "ts_proto_library")
load("@npm_bazel_typescript//:index.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

ts_proto_library(
    name = "build_event_stream",
    deps = ["//third_party/github.com/bazelbuild/bazel/src/main/java/com/google/devtools/build/lib/buildeventstream/proto"],
)

ts_library(
    name = "parse_bep",
    srcs = ["parse_bep.ts"],
    deps = [
        ":build_event_stream",
        "@npm//@types/node",
        "@npm//rxjs",
    ],
)

nodejs_binary(
    name = "parse",
    data = [":parse_bep"],
    entry_point = "angular_devkit/tools/build_event_protocol/parse_bep",
)
