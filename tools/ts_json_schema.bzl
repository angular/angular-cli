# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_test", "nodejs_binary")


def _ts_json_schema_interface_impl(ctx):
    args = [
        ctx.files.src[0].path,
        ctx.outputs.ts.path,
    ]

    ctx.actions.run(
        inputs = ctx.files.src + ctx.files.data,
        executable = ctx.executable._binary,
        outputs = [ctx.outputs.ts],
        arguments = args,
    )

    return [DefaultInfo()]


_ts_json_schema_interface = rule(
    _ts_json_schema_interface_impl,
    attrs = {
        "src": attr.label(
            allow_files = FileType([
                ".json",
            ]),
            mandatory = True,
        ),
        "out": attr.string(
            mandatory = True,
        ),
        "data": attr.label_list(
            allow_files = FileType([
                ".json",
            ]),
        ),
        "_binary": attr.label(
            default = Label("//tools:quicktype_runner"),
            executable = True,
            cfg = "host",
        ),
    },
    outputs = {
        "ts": "%{out}"
    },
)


def ts_json_schema(name, src, data = [], **kwargs):
    out = src.replace(".json", ".ts")

    _ts_json_schema_interface(
        name = name + ".interface",
        src = src,
        out = out,
        data = data,
    )

    ts_library(
        name = name,
        srcs = [
            out,
        ]
    )
