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
      "rxjs/operators/filter": "Rx.Observable.prototype",
      "rxjs/operators/take": "Rx.Observable.prototype",
      "rxjs/operators/tap": "Rx.Observable.prototype",
    }
  _ng_package(globals = globals, **kwargs)
