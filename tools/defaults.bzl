"""Re-export of some bazel rules with repository-wide defaults."""

load("@npm//@bazel/typescript:index.bzl", _ts_library = "ts_library")

_DEFAULT_TSCONFIG_TEST = "//:tsconfig-test.json"

def ts_library(
        name,
        tsconfig = None,
        testonly = False,
        deps = [],
        devmode_module = None,
        devmode_target = None,
        **kwargs):
    """Default values for ts_library"""
    if testonly:
        # Match the types[] in //packages:tsconfig-test.json
        deps.append("@npm//@types/jasmine")
        deps.append("@npm//@types/node")
    if not tsconfig and testonly:
        tsconfig = _DEFAULT_TSCONFIG_TEST

    if not devmode_module:
        devmode_module = "commonjs"
    if not devmode_target:
        devmode_target = "es2018"

    _ts_library(
        name = name,
        testonly = testonly,
        deps = deps,
        # @external_begin
        tsconfig = tsconfig,
        devmode_module = devmode_module,
        devmode_target = devmode_target,
        # @external_end
        **kwargs
    )
