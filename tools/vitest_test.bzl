def _vitest_test_impl(ctx):
    pass

_vitest_test = rule()

def vitest_test(data = [], args = [], **kwargs):
    # Create relative path to root, from current package dir. Necessary as
    # we change the `chdir` below to the package directory.
    relative_to_root = "/".join([".."] * len(native.package_name().split("/")))

    _vitest_test(
        node_modules = "//:node_modules",
        chdir = native.package_name(),
        args = [
            # Escape so that the `js_binary` launcher triggers Bash expansion.
            "'**/*+(.|_)spec.js'",
        ] + args,
        data = data + ["//:node_modules/vitest"],
        **kwargs
    )
