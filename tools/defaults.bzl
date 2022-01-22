"""Re-export of some bazel rules with repository-wide defaults."""

load("@npm//@bazel/typescript:index.bzl", _ts_library = "ts_library")
load("@build_bazel_rules_nodejs//:index.bzl", "copy_to_bin", _pkg_npm = "pkg_npm")
load("@rules_pkg//:pkg.bzl", "pkg_tar")
load("@npm//@angular/dev-infra-private/bazel:extract_js_module_output.bzl", "extract_js_module_output")
load("@aspect_bazel_lib//lib:utils.bzl", "to_label")
load("@aspect_bazel_lib//lib:jq.bzl", "jq")
load("@aspect_bazel_lib//lib:copy_to_directory.bzl", "copy_to_directory")
load("//tools:link_package_json_to_tarballs.bzl", "link_package_json_to_tarballs")
load("//tools:snapshot_repo_filter.bzl", "SNAPSHOT_REPO_JQ_FILTER")
load("//:constants.bzl", "RELEASE_ENGINES_NODE", "RELEASE_ENGINES_NPM", "RELEASE_ENGINES_YARN")

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

def pkg_npm(name, pkg_deps = [], use_prodmode_output = False, **kwargs):
    """Override of pkg_npm to produce package outputs and version substitutions conventional to the angular-cli project.

    Produces a package and a tar of that package. Expects a package.json file
    in the same folder to exist.

    Args:
        name: Name of the pkg_npm rule. '_archive.tar.gz' is appended to create the tarball.
        pkg_deps: package.json files of dependent packages. These are used for local path substitutions when --config=local is set.
        use_prodmode_output: False to ship ES5 devmode output, True to ship ESM output. Defaults to False.
        **kwargs: Additional arguments passed to the real pkg_npm.
    """
    pkg_json = ":package.json"

    visibility = kwargs.pop("visibility", None)

    NPM_PACKAGE_SUBSTITUTIONS = {
        # Version of the local package being built, generated via the `--workspace_status_command` flag.
        "0.0.0-PLACEHOLDER": "{BUILD_SCM_VERSION}",
        "0.0.0-EXPERIMENTAL-PLACEHOLDER": "{BUILD_SCM_EXPERIMENTAL_VERSION}",
        "BUILD_SCM_HASH-PLACEHOLDER": "{BUILD_SCM_ABBREV_HASH}",
        "0.0.0-ENGINES-NODE": RELEASE_ENGINES_NODE,
        "0.0.0-ENGINES-NPM": RELEASE_ENGINES_NPM,
        "0.0.0-ENGINES-YARN": RELEASE_ENGINES_YARN,
    }

    NO_STAMP_PACKAGE_SUBSTITUTIONS = dict(NPM_PACKAGE_SUBSTITUTIONS, **{
        "0.0.0-PLACEHOLDER": "0.0.0",
        "0.0.0-EXPERIMENTAL-PLACEHOLDER": "0.0.0",
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

    # Merge package.json with root package.json and perform various substitutions to
    # prepare it for release. For jq docs, see https://stedolan.github.io/jq/manual/.
    jq(
        name = "basic_substitutions",
        # Note: this jq filter relies on the order of the inputs
        # buildifier: do not sort
        srcs = ["//:package.json", pkg_json],
        filter_file = "//tools:package_json_release_filter.jq",
        args = ["--slurp"],
        out = "substituted/package.json",
    )

    # Copy package.json files to bazel-out so we can use their bazel-out paths to determine
    # the corresponding package npm package tar.gz path for substitutions.
    copy_to_bin(
        name = "package_json_copy",
        srcs = [pkg_json],
    )
    pkg_deps_copies = []
    for pkg_dep in pkg_deps:
        pkg_label = to_label(pkg_dep)
        if pkg_label.name != "package.json":
            fail("ERROR: only package.json files allowed in pkg_deps of pkg_npm macro")
        pkg_deps_copies.append("@%s//%s:package_json_copy" % (pkg_label.workspace_name, pkg_label.package))

    # Substitute dependencies on other packages in this repo with tarballs.
    link_package_json_to_tarballs(
        name = "tar_substitutions",
        src = "substituted/package.json",
        pkg_deps = [":package_json_copy"] + pkg_deps_copies,
        out = "substituted_with_tars/package.json",
    )

    # Substitute dependencies on other packages in this repo with snapshot repos.
    jq(
        name = "snapshot_repo_substitutions",
        srcs = ["substituted/package.json"],
        filter = SNAPSHOT_REPO_JQ_FILTER,
        out = "substituted_with_snapshot_repos/package.json",
    )

    # Move the generated package.json along with other deps into a directory for pkg_npm
    # to package up because pkg_npm requires that all inputs be in the same directory.
    copy_to_directory(
        name = "package",
        srcs = select({
            # Do tar substitution if config_setting 'package_json_use_tar_deps' is true (local builds)
            "//:package_json_use_tar_deps": [":%s_js_module_output" % name, "substituted_with_tars/package.json"],
            "//:package_json_use_snapshot_repo_deps": [":%s_js_module_output" % name, "substituted_with_snapshot_repos/package.json"],
            "//conditions:default": [":%s_js_module_output" % name, "substituted/package.json"],
        }),
        replace_prefixes = {
            "substituted_with_tars/": "",
            "substituted_with_snapshot_repos/": "",
            "substituted/": "",
        },
        exclude_prefixes = [
            "packages",  # Exclude compiled outputs of dependent packages
        ],
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
            "//:stamp": NPM_PACKAGE_SUBSTITUTIONS,
            "//conditions:default": NO_STAMP_PACKAGE_SUBSTITUTIONS,
        }),
        visibility = visibility,
        nested_packages = ["package"],
        tgz = None,
        **kwargs
    )

    pkg_tar(
        name = name + "_archive",
        srcs = [":%s" % name],
        extension = "tar.gz",
        strip_prefix = "./%s" % name,
        visibility = visibility,
    )
