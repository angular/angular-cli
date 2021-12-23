"""Re-export of some bazel rules with repository-wide defaults."""

load("@npm//@bazel/typescript:index.bzl", _ts_library = "ts_library")
load("@build_bazel_rules_nodejs//:index.bzl", _pkg_npm = "pkg_npm")
load("@npm//@angular/dev-infra-private/bazel:extract_js_module_output.bzl", "extract_js_module_output")

_DEFAULT_TSCONFIG = "//:tsconfig-build.json"
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
    if not tsconfig:
        if testonly:
            tsconfig = _DEFAULT_TSCONFIG_TEST
        else:
            tsconfig = _DEFAULT_TSCONFIG

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

def pkg_npm(name, use_prodmode_output = False, **kwargs):
    """Default values for pkg_npm"""
    visibility = kwargs.pop("visibility", None)

    common_substitutions = dict(kwargs.pop("substitutions", {}))
    substitutions = dict(common_substitutions, **{
        # TODO: Current build script relies on 0.0.0 in package.json; uncomment after replacing build script.
        #"0.0.0-PLACEHOLDER": "0.0.0",
    })
    stamped_substitutions = dict(common_substitutions, **{
        # TODO: Current build script relies on 0.0.0 in package.json; uncomment after replacing build script.
        #"0.0.0-PLACEHOLDER": "{BUILD_SCM_VERSION}",
        "0.0.0": "{BUILD_SCM_VERSION}",
    })

    deps = kwargs.pop("deps", [])

    # The `pkg_npm` rule brings in devmode (`JSModuleInfo`) and prodmode (`JSEcmaScriptModuleInfo`)
    # output into the the NPM package We do not intend to ship the prodmode ECMAScript `.mjs`
    # files, but the `JSModuleInfo` outputs (which correspond to devmode output). Depending on
    # the `use_prodmode_output` macro attribute, we either ship the ESM output of dependencies,
    # or continue shipping the devmode ES5 output.
    # TODO: Clean this up in the future if we have combined devmode and prodmode output.
    # https://github.com/bazelbuild/rules_nodejs/commit/911529fd364eb3ee1b8ecdc568a9fcf38a8b55ca.
    # https://github.com/bazelbuild/rules_nodejs/blob/stable/packages/typescript/internal/build_defs.bzl#L334-L337.
    extract_js_module_output(
        name = "%s_js_module_output" % name,
        provider = "JSEcmaScriptModuleInfo" if use_prodmode_output else "JSModuleInfo",
        include_declarations = True,
        include_default_files = True,
        forward_linker_mappings = False,
        include_external_npm_packages = False,
        deps = deps,
    )

    _pkg_npm(
        name = name,
        # We never set a `package_name` for NPM packages, neither do we enable validation.
        # This is necessary because the source targets of the NPM packages all have
        # package names set and setting a similar `package_name` on the NPM package would
        # result in duplicate linker mappings that will conflict. e.g. consider the following
        # scenario: We have a `ts_library` for `@angular/core`. We will configure a package
        # name for the target so that it can be resolved in NodeJS executions from `node_modules`.
        # If we'd also set a `package_name` for the associated `pkg_npm` target, there would be
        # two mappings for `@angular/core` and the linker will complain. For a better development
        # experience, we want the mapping to resolve to the direct outputs of the `ts_library`
        # instead of requiring tests and other targets to assemble the NPM package first.
        # TODO(devversion): consider removing this if `rules_nodejs` allows for duplicate
        # linker mappings where transitive-determined mappings are skipped on conflicts.
        # https://github.com/bazelbuild/rules_nodejs/issues/2810.
        package_name = None,
        validate = False,
        substitutions = select({
            "//:stamp": stamped_substitutions,
            "//conditions:default": substitutions,
        }),
        visibility = visibility,
        deps = [":%s_js_module_output" % name],
        tgz = name + "_archive.tgz",
        **kwargs
    )
