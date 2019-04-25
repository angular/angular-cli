"""Re-export of some bazel rules with repository-wide defaults."""

load("@npm_angular_bazel//:index.bzl", _ng_module = "ng_module", _ng_package = "ng_package")
load("@build_bazel_rules_nodejs//:defs.bzl", _npm_package = "npm_package")
load("@npm_bazel_jasmine//:index.bzl", _jasmine_node_test = "jasmine_node_test")
load(
    "@npm_bazel_typescript//:defs.bzl",
    _ts_library = "ts_library",
)
load("@npm_bazel_karma//:defs.bzl", _ts_web_test_suite = "ts_web_test_suite")

DEFAULT_TSCONFIG_BUILD = "//modules:bazel-tsconfig-build.json"
DEFAULT_TSCONFIG_TEST = "//modules:bazel-tsconfig-test"
DEFAULT_TS_TYPINGS = "@npm//typescript:typescript__typings"

def _getDefaultTsConfig(testonly):
    if testonly:
        return DEFAULT_TSCONFIG_TEST
    else:
        return DEFAULT_TSCONFIG_BUILD

def ts_library(tsconfig = None, deps = [], testonly = False, **kwargs):
    local_deps = ["@npm//tslib", "@npm//@types/node"] + deps
    if not tsconfig:
        tsconfig = _getDefaultTsConfig(testonly)

    _ts_library(
        tsconfig = tsconfig,
        testonly = testonly,
        deps = local_deps,
        node_modules = DEFAULT_TS_TYPINGS,
        **kwargs
    )

NG_VERSION = "^8.0.0-beta.14"
RXJS_VERSION = "^6.3.3"
HAPI_VERSION = "^17.0.0"
EXPRESS_VERSION = "^4.15.2"

NGUNIVERSAL_SCOPED_PACKAGES = ["@nguniversal/%s" % p for p in [
    "aspnetcore-engine",
    "common",
    "express-engine",
    "hapi-engine",
    "module-map-ngfactory-loader",
]]

PKG_GROUP_REPLACEMENTS = {
    "\"NG_UPDATE_PACKAGE_GROUP\"": """[
      %s
    ]""" % ",\n      ".join(["\"%s\"" % s for s in NGUNIVERSAL_SCOPED_PACKAGES]),
    "EXPRESS_VERSION": EXPRESS_VERSION,
    "HAPI_VERSION": HAPI_VERSION,
    "NG_VERSION": NG_VERSION,
    "RXJS_VERSION": RXJS_VERSION,
}

GLOBALS = {
    "@angular/animations": "ng.animations",
    "@angular/common": "ng.common",
    "@angular/common/http": "ng.common.http",
    "@angular/compiler": "ng.compiler",
    "@angular/core": "ng.core",
    "@angular/http": "ng.http",
    "@angular/platform-browser": "ng.platformBrowser",
    "@angular/platform-browser-dynamic": "ng.platformBrowserDynamic",
    "@angular/platform-server": "ng.platformServer",
    "@nguniversal/aspnetcore-engine/tokens": "nguniversal.aspnetcoreEngine.tokens",
    "@nguniversal/express-engine/tokens": "nguniversal.expressEngine.tokens",
    "@nguniversal/hapi-engine/tokens": "nguniversal.hapiEngine.tokens",
    "express": "express",
    "fs": "fs",
    "hapi": "hapi",
    "rxjs": "rxjs",
    "rxjs/operators": "rxjs.operators",
    "tslib": "tslib",
}

# TODO(Toxicable): when a better api for defaults is avilable use that instead of these macros
def ts_test_library(deps = [], tsconfig = None, **kwargs):
    local_deps = deps
    ts_library(
        testonly = 1,
        deps = local_deps,
        **kwargs
    )

def ng_module(tsconfig = None, testonly = False, deps = [], **kwargs):
    deps = deps + ["@npm//tslib", "@npm//@types/node"]
    if not tsconfig:
        tsconfig = _getDefaultTsConfig(testonly)
    _ng_module(
        tsconfig = tsconfig,
        testonly = testonly,
        deps = deps,
        node_modules = DEFAULT_TS_TYPINGS,
        **kwargs
    )

def jasmine_node_test(deps = [], **kwargs):
    local_deps = [
        # Workaround for: https://github.com/bazelbuild/rules_nodejs/issues/344
        "@npm//jasmine",
        "@npm//source-map-support",
    ] + deps

    _jasmine_node_test(
        deps = local_deps,
        configuration_env_vars = ["compile"],
        **kwargs
    )

def ng_test_library(deps = [], tsconfig = None, **kwargs):
    local_deps = [
        # We declare "@angular/core" as default dependencies because
        # all Angular component unit tests use the `TestBed` and `Component` exports.
        "@npm//@angular/core",
        "@npm//@types/jasmine",
    ] + deps

    ts_library(
        testonly = 1,
        deps = local_deps,
        **kwargs
    )

def ng_package(globals = {}, **kwargs):
    globals = dict(globals, **GLOBALS)

    _ng_package(globals = globals, replacements = PKG_GROUP_REPLACEMENTS, **kwargs)

def npm_package(name, replacements = {}, **kwargs):
    _npm_package(
        name = name,
        replacements = dict(replacements, **PKG_GROUP_REPLACEMENTS),
        **kwargs
    )

def ng_web_test_suite(deps = [], srcs = [], **kwargs):
    _ts_web_test_suite(
        # Required for running the compiled ng modules that use TypeScript import helpers.
        srcs = ["@npm//node_modules/tslib:tslib.js"] + srcs,
        # Depend on our custom test initialization script. This needs to be the first dependency.
        deps = ["//test:angular_test_init"] + deps,
        bootstrap = [
            "@npm//node_modules/zone.js:dist/zone-testing-bundle.js",
            "@npm//node_modules/reflect-metadata:Reflect.js",
        ],
        **kwargs
    )
