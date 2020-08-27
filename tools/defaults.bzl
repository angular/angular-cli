"""Re-export of some bazel rules with repository-wide defaults."""

load("@npm_angular_bazel//:index.bzl", _ng_module = "ng_module", _ng_package = "ng_package")
load("@build_bazel_rules_nodejs//:index.bzl", _pkg_npm = "pkg_npm")
load("@npm_bazel_jasmine//:index.bzl", _jasmine_node_test = "jasmine_node_test")
load(
    "@npm_bazel_typescript//:index.bzl",
    _ts_library = "ts_library",
)

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

NG_VERSION = "^10.1.0-rc.0"
RXJS_VERSION = "^6.5.5"
HAPI_VERSION = "^18.4.0"
EXPRESS_VERSION = "^4.15.2"
EXPRESS_TYPES_VERSION = "^4.17.0"
DEVKIT_CORE_VERSION = "^10.1.0-rc.0"
DEVKIT_ARCHITECT_VERSION = "^0.1001.0-rc.0"
TSLIB_VERSION = "^2.0.0"

NGUNIVERSAL_SCOPED_PACKAGES = ["@nguniversal/%s" % p for p in [
    "aspnetcore-engine",
    "builders",
    "common",
    "express-engine",
    "hapi-engine",
]]

PKG_GROUP_REPLACEMENTS = {
    "\"NG_UPDATE_PACKAGE_GROUP\"": """[
      %s
    ]""" % ",\n      ".join(["\"%s\"" % s for s in NGUNIVERSAL_SCOPED_PACKAGES]),
    "EXPRESS_VERSION": EXPRESS_VERSION,
    "EXPRESS_TYPES_VERSION": EXPRESS_TYPES_VERSION,
    "HAPI_VERSION": HAPI_VERSION,
    "NG_VERSION": NG_VERSION,
    "RXJS_VERSION": RXJS_VERSION,
    "DEVKIT_CORE_VERSION": DEVKIT_CORE_VERSION,
    "DEVKIT_ARCHITECT_VERSION": DEVKIT_ARCHITECT_VERSION,
    "TSLIB_VERSION": TSLIB_VERSION,
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
    "@hapi/hapi": "hapi.hapi",
    "rxjs": "rxjs",
    "rxjs/operators": "rxjs.operators",
}

def ng_module(name, tsconfig = None, testonly = False, deps = [], bundle_dts = True, **kwargs):
    deps = deps + ["@npm//tslib", "@npm//@types/node"]
    if not tsconfig:
        tsconfig = _getDefaultTsConfig(testonly)
    _ng_module(
        name = name,
        flat_module_out_file = name,
        bundle_dts = bundle_dts,
        tsconfig = tsconfig,
        testonly = testonly,
        deps = deps,
        node_modules = DEFAULT_TS_TYPINGS,
        **kwargs
    )

def jasmine_node_test(deps = [], **kwargs):
    local_deps = [
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

    if not tsconfig:
        tsconfig = _getDefaultTsConfig(1)

    ts_library(
        testonly = 1,
        tsconfig = tsconfig,
        deps = local_deps,
        **kwargs
    )

def ng_package(globals = {}, deps = [], **kwargs):
    globals = dict(globals, **GLOBALS)
    deps = deps + [
        "@npm//tslib",
    ]
    _ng_package(globals = globals, deps = deps, substitutions = PKG_GROUP_REPLACEMENTS, **kwargs)

def pkg_npm(name, substitutions = {}, **kwargs):
    _pkg_npm(
        name = name,
        substitutions = dict(substitutions, **PKG_GROUP_REPLACEMENTS),
        **kwargs
    )
