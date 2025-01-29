load("@aspect_rules_js//js:defs.bzl", "js_run_binary")

def cli_json_schema(name, src, out, data = []):
    js_run_binary(
        name = name,
        outs = [out],
        srcs = [src] + data,
        tool = "//tools:ng_cli_schema",
        progress_message = "Generating CLI interface from %s" % src,
        mnemonic = "NgCliJsonSchema",
        args = ["$(rootpath %s)" % src, "$(rootpath %s)" % out],
    )
