load("//tools:interop.bzl", _ts_project = "ts_project")
load("//tools/bazel:npm_package.bzl", _npm_package = "npm_package")

def ts_project(**kwargs):
    _ts_project(**kwargs)

def npm_package(**kwargs):
    _npm_package(**kwargs)
