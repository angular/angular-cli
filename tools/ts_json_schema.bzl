# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

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
            allow_files = [".json"],
            mandatory = True,
        ),
        "out": attr.string(
            mandatory = True,
        ),
        "data": attr.label_list(
            allow_files = [".json"],
        ),
        "_binary": attr.label(
            default = Label("//tools:quicktype_runner"),
            executable = True,
            cfg = "exec",
        ),
    },
    outputs = {
        "ts": "%{out}",
    },
)

# Generates a TS file that contains the interface for a JSON Schema file. Takes a single `src`
# argument as input, an optional data field for reference files, and produces a
# _ts_json_schema_interface() rule containing the typescript interface.
# The file produced will have the same name, with the extension replaced from `.json` to `.ts`.
# Any filename collision will be an error thrown by Bazel.
def ts_json_schema(name, src, data = []):
    out = src.replace(".json", ".ts")

    _ts_json_schema_interface(
        name = name + ".interface",
        src = src,
        out = out,
        data = data,
    )
