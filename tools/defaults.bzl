load("@aspect_bazel_lib//lib:copy_to_bin.bzl", _copy_to_bin = "copy_to_bin")
load("@aspect_rules_js//js:defs.bzl", _js_binary = "js_binary")
load("@devinfra//bazel/jasmine:jasmine.bzl", _jasmine_test = "jasmine_test")
load("@devinfra//bazel/ts_project:index.bzl", "strict_deps_test")
load("@rules_angular//src/ng_package:index.bzl", _ng_package = "ng_package")
load("@rules_angular//src/ts_project:index.bzl", _ts_project = "ts_project")
load("//tools:substitutions.bzl", "substitutions")
load("//tools/bazel:npm_package.bzl", _npm_package = "npm_package")

def ts_project(
        name,
        deps = [],
        tsconfig = None,
        testonly = False,
        source_map = True,
        visibility = None,
        **kwargs):
    if tsconfig == None:
        tsconfig = "//:test-tsconfig" if testonly else "//:build-tsconfig"

    _ts_project(
        name = name,
        testonly = testonly,
        declaration = True,
        source_map = source_map,
        tsconfig = tsconfig,
        visibility = visibility,
        deps = deps,
        **kwargs
    )

    strict_deps_test(
        name = "%s_strict_deps_test" % name,
        srcs = kwargs.get("srcs", []),
        tsconfig = tsconfig,
        deps = deps,
    )

def npm_package(**kwargs):
    _npm_package(**kwargs)

def copy_to_bin(**kwargs):
    _copy_to_bin(**kwargs)

def js_binary(**kwargs):
    _js_binary(**kwargs)

def ng_package(deps = [], **kwargs):
    _ng_package(
        deps = deps,
        license = "//:LICENSE",
        substitutions = select({
            "//:stamp": substitutions["stamp"],
            "//conditions:default": substitutions["nostamp"],
        }),
        **kwargs
    )

def jasmine_test(args = [], tsconfig = "//:test-tsconfig", **kwargs):
    _jasmine_test(
        node_modules = "//:node_modules",
        tsconfig = tsconfig,
        chdir = native.package_name(),
        args = [
            "'**/*+(.|_)spec.js'",
            "'**/*+(.|_)spec.mjs'",
            "'**/*+(.|_)spec.cjs'",
        ] + args,
        **kwargs
    )
