load("@aspect_rules_js//js:defs.bzl", "js_run_binary")

# Generates a TS file that contains the interface for a JSON Schema file. Takes a single `src`
# argument as input, an optional data field for reference files, and produces a
# _ts_json_schema_interface() rule containing the typescript interface.
# The file produced will have the same name, with the extension replaced from `.json` to `.ts`.
# Any filename collision will be an error thrown by Bazel.
def ts_json_schema(name, src, data = []):
    out = src.replace(".json", ".ts")

    js_run_binary(
        name = name + ".interface",
        outs = [out],
        srcs = [src] + data,
        tool = "//tools:quicktype_runner",
        progress_message = "Generating TS interface for %s" % src,
        mnemonic = "TsJsonSchema",
        args = ["$(rootpath %s)" % src, "$(rootpath %s)" % out],
    )
