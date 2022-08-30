# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

def _cli_json_schema_interface_impl(ctx):
    args = [
        ctx.files.src[0].path,
        ctx.outputs.json.path,
    ]

    ctx.actions.run(
        inputs = ctx.files.src + ctx.files.data,
        executable = ctx.executable._binary,
        outputs = [ctx.outputs.json],
        arguments = args,
    )

    return [DefaultInfo()]

cli_json_schema = rule(
    _cli_json_schema_interface_impl,
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
            mandatory = True,
        ),
        "_binary": attr.label(
            default = Label("//tools:ng_cli_schema"),
            executable = True,
            cfg = "exec",
        ),
    },
    outputs = {
        "json": "%{out}",
    },
)
