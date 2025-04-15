"""Generates a `browserslist` configuration from a Baseline date."""

load("@aspect_rules_js//js:defs.bzl", "js_run_binary")

def baseline_browserslist(name, baseline, out, **kwargs):
    """Generates a `browserslist` configuration from a Baseline date.

    Args:
        name: Name of this target.
        baseline: A string date in "YYYY-MM-DD" format of the Baseline widely
            available browser set to use in the generated `browserslist`.
        out: Name of the output browserslist file. Prefer using `.browserslistrc`
            for the output as the `browserslist` package seems to not like files
            with a different name, even when explicitly provided.

    See: https://web.dev/baseline
    """

    js_run_binary(
        name = name,
        srcs = [],
        tool = Label(":baseline_browserslist"),
        stdout = out,
        args = [baseline],
        **kwargs
    )
