load("@aspect_rules_js//js:defs.bzl", "js_run_binary")

def cli_example_db(name, srcs, path, out, data = []):
    js_run_binary(
        name = name,
        outs = [out],
        srcs = srcs + data,
        tool = "//tools:ng_example_db",
        progress_message = "Generating code example database from %s" % path,
        mnemonic = "NgExampleSqliteDb",
        args = [path, "$(rootpath %s)" % out],
    )
