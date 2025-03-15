load("@aspect_bazel_lib//lib:copy_to_bin.bzl", _copy_to_bin = "copy_to_bin")
load("@aspect_rules_jasmine//jasmine:defs.bzl", _jasmine_test = "jasmine_test")
load("@aspect_rules_js//js:defs.bzl", _js_binary = "js_binary")
load("@aspect_rules_ts//ts:defs.bzl", _ts_project = "ts_project")
load("@devinfra//bazel/ts_project:index.bzl", "strict_deps_test")
load("@npm//@angular/bazel:index.bzl", _ng_package = "ng_package")
load("//tools:substitutions.bzl", "substitutions")
load("//tools/bazel:npm_package.bzl", _npm_package = "npm_package")

def npm_package(**kwargs):
    _npm_package(**kwargs)

def copy_to_bin(**kwargs):
    _copy_to_bin(**kwargs)

def js_binary(**kwargs):
    _js_binary(**kwargs)

def ts_project(
        name,
        testonly = False,
        tsconfig = None,
        deps = [],
        ignore_strict_deps = False,
        **kwargs):
    if tsconfig == None:
        tsconfig = "//:test-tsconfig" if testonly else "//:build-tsconfig"

    _ts_project(
        name = name,
        declaration = True,
        tsconfig = tsconfig,
        # Use the worker from our own Angular rules, as the default worker
        # from `rules_ts` is incompatible with TS5+ and abandoned. We need
        # worker for efficient and fast DX.
        supports_workers = 1,
        tsc_worker = "//tools:vanilla_ts_worker",
        **kwargs
    )

    if not ignore_strict_deps:
        strict_deps_test(
            name = "%s_strict_deps_test" % name,
            srcs = kwargs.get("srcs", []),
            deps = deps,
        )

def ng_package(deps = [], **kwargs):
    _ng_package(
        deps = deps,
        license = "//:LICENSE",
        substitutions = select({
            "//:stamp": substitutions["legacy"]["stamp"],
            "//conditions:default": substitutions["legacy"]["nostamp"],
        }),
        **kwargs
    )

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
