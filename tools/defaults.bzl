"""Re-export of some bazel rules with repository-wide defaults."""
load("@build_bazel_rules_typescript//:defs.bzl", _ts_library = "ts_library")
load("@angular//:index.bzl", _ng_module = "ng_module")
load("@angular//:index.bzl", _ng_package = "ng_package")

def ts_library(tsconfig = None, node_modules = None, **kwargs):
  if not tsconfig:
    tsconfig = "//:tsconfig.json"
  if not node_modules:
    node_modules = "//:node_modules"
  _ts_library(tsconfig = tsconfig, **kwargs)

def ng_module(tsconfig = None, node_modules = None, **kwargs):
  if not tsconfig:
    tsconfig = "//:tsconfig.json"
  _ts_library(tsconfig = tsconfig, **kwargs)

def ng_package(globals = None, **kwargs):
  if not globals:
    globals = {
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
      "rxjs/Observable": "Rx",
      "rxjs/operators/filter": "Rx.operators",
      "rxjs/operators/map": "Rx.operators",
      "rxjs/operators/take": "Rx.operators",
      "rxjs/operators/tap": "Rx.operators",
      "rxjs/observable/of": "Rx.Observable",
      "fs": "fs",
      "express": "express",
      "hapi": "hapi"
    }
  _ng_package(globals = globals, **kwargs)
