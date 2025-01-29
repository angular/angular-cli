load("@aspect_bazel_lib//lib:copy_to_bin.bzl", _copy_to_bin = "copy_to_bin")
load("@aspect_rules_jasmine//jasmine:defs.bzl", _jasmine_test = "jasmine_test")
load("@aspect_rules_js//js:defs.bzl", _js_binary = "js_binary")
load("//tools:interop.bzl", _ts_project = "ts_project")
load("//tools/bazel:npm_package.bzl", _npm_package = "npm_package")

def ts_project(**kwargs):
    _ts_project(**kwargs)

def npm_package(**kwargs):
    _npm_package(**kwargs)

def copy_to_bin(**kwargs):
    _copy_to_bin(**kwargs)

def js_binary(**kwargs):
    _js_binary(**kwargs)

def jasmine_test(data = [], args = [], **kwargs):
    # Create relative path to root, from current package dir. Necessary as
    # we change the `chdir` below to the package directory.
    relative_to_root = "/".join([".."] * len(native.package_name().split("/")))

    _jasmine_test(
        node_modules = "//:node_modules",
        chdir = native.package_name(),
        args = [
            "--require=%s/node_modules/source-map-support/register.js" % relative_to_root,
            "**/*spec.js",
            "**/*spec.mjs",
            "**/*spec.cjs",
        ] + args,
        data = data + ["//:node_modules/source-map-support"],
        **kwargs
    )
