"""Re-export of some bazel rules with repository-wide defaults."""
load("@build_bazel_rules_typescript//:defs.bzl", _ts_library = "ts_library")
load("@angular//:index.bzl", _ng_module = "ng_module")
load("@angular//:index.bzl", _ng_package = "ng_package")
load("@build_bazel_rules_nodejs//:defs.bzl", _npm_package = "npm_package")

DEFAULT_TS_CONFIG = "//:tsconfig.json"
DEFAULT_NODE_MODULES = "//:node_modules"

NG_VERSION = "^6.0.0"
RXJS_VERSION = "^6.0.0"
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
    "NG_VERSION": NG_VERSION,
    "RXJS_VERSION": RXJS_VERSION,
    "HAPI_VERSION": HAPI_VERSION,
    "EXPRESS_VERSION": EXPRESS_VERSION,
    "\"NG_UPDATE_PACKAGE_GROUP\"": """[
      %s
    ]""" % ",\n      ".join(["\"%s\"" % s for s in NGUNIVERSAL_SCOPED_PACKAGES])
}

GLOBALS = {
      "@angular/animations": "ng.animations",
      "@angular/core": "ng.core",
      "@angular/common": "ng.common",
      "@angular/common/http": "ng.common.http",
      "@angular/compiler": "ng.compiler",
      "@angular/http": "ng.http",
      "@angular/platform-browser": "ng.platformBrowser",
      "@angular/platform-server": "ng.platformServer",
      "@angular/platform-browser-dynamic": "ng.platformBrowserDynamic",
      "@nguniversal/aspnetcore-engine/tokens": "nguniversal.aspnetcoreEngine.tokens",
      "@nguniversal/express-engine/tokens": "nguniversal.expressEngine.tokens",
      "@nguniversal/hapi-engine/tokens": "nguniversal.hapiEngine.tokens",
      'tslib': 'tslib',
      "rxjs": "rxjs",
      "rxjs/operators": "rxjs.operators",
      "fs": "fs",
      "express": "express",
      "hapi": "hapi"
    }

# TODO(Toxicable): when a better api for defaults is avilable use that instead of these macros
def ts_test_library(node_modules=None, **kwargs):
    ts_library(testonly=1, **kwargs)

def ts_library(tsconfig = None, node_modules = None, **kwargs):
  if not tsconfig:
    tsconfig = DEFAULT_TS_CONFIG
  if not node_modules:
    node_modules = DEFAULT_NODE_MODULES
  _ts_library(tsconfig = tsconfig, **kwargs)

def ng_module(tsconfig = None, node_modules = None, **kwargs):
  if not tsconfig:
    tsconfig = DEFAULT_TS_CONFIG
  if not node_modules:
    node_modules = DEFAULT_NODE_MODULES
  _ng_module(tsconfig = tsconfig, **kwargs)

def ng_package(globals = {}, **kwargs):
  globals = dict(globals, **GLOBALS)

  _ng_package(globals = globals, replacements=PKG_GROUP_REPLACEMENTS, **kwargs)

def npm_package(name, replacements = {}, **kwargs):
    _npm_package(
        name = name,
        replacements = dict(replacements, **PKG_GROUP_REPLACEMENTS),
        **kwargs
    )
