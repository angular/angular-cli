load("@aspect_bazel_lib//lib:copy_to_bin.bzl", "copy_to_bin")
load("@aspect_bazel_lib//lib:expand_template.bzl", "expand_template")
load("@aspect_bazel_lib//lib:jq.bzl", "jq")
load("@aspect_bazel_lib//lib:utils.bzl", "to_label")
load("@aspect_rules_js//npm:defs.bzl", _npm_package = "npm_package")
load("@rules_pkg//:pkg.bzl", "pkg_tar")
load("//tools:link_package_json_to_tarballs.bzl", "link_package_json_to_tarballs")
load("//tools:snapshot_repo_filter.bzl", "SNAPSHOT_REPO_JQ_FILTER")
load("//tools:substitutions.bzl", "substitutions")

def npm_package(
        name,
        deps = [],
        visibility = None,
        pkg_deps = [],
        stamp_files = [],
        pkg_json = "package.json",
        **kwargs):
    if name != "pkg":
        fail("Expected npm_package to be named `pkg`. " +
             "This is needed for pnpm workspace integration.")

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
    # the corresponding package npm package tgz path for substitutions.
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

    expand_template(
        name = "final_package_json",
        template = select({
            # Do local tar substitution if config_setting is true.
            "//:package_json_use_tar_deps": "substituted_with_tars/package.json",
            # Do snapshot repo substitution if config_setting is true.
            "//:package_json_use_snapshot_repo_deps": "substituted_with_snapshot_repos/package.json",
            "//conditions:default": "substituted/package.json",
        }),
        out = "substituted_final/package.json",
        substitutions = substitutions["rjs"]["nostamp"],
        stamp_substitutions = substitutions["rjs"]["stamp"],
    )

    stamp_targets = []
    for f in stamp_files:
        expand_template(
            name = "stamp_file_%s" % f,
            template = f,
            out = "substituted/%s" % f,
            substitutions = substitutions["rjs"]["nostamp"],
            stamp_substitutions = substitutions["rjs"]["stamp"],
        )

        stamp_targets.append("stamp_file_%s" % f)

    _npm_package(
        name = "npm_package",
        visibility = visibility,
        # Note: Order matters here! Last file takes precedence after replaced prefixes.
        srcs = deps + stamp_targets + [":final_package_json"],
        replace_prefixes = {
            "substituted_final/": "",
            "substituted_with_tars/": "",
            "substituted_with_snapshot_repos/": "",
            "substituted/": "",
        },
        allow_overwrites = True,
        **kwargs
    )

    # Note: For now, in hybrid mode with RNJS and RJS, we ensure
    # both `:pkg` and `:npm_package` work.
    native.alias(
        name = "pkg",
        actual = ":npm_package",
    )

    if pkg_json:
        pkg_tar(
            name = "npm_package_archive",
            srcs = [":pkg"],
            extension = "tgz",
            strip_prefix = "./npm_package",
            visibility = visibility,
        )
