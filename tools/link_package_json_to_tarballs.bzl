# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
load("@aspect_bazel_lib//lib:jq.bzl", "jq")
load("@aspect_bazel_lib//lib:utils.bzl", "to_label")

def link_package_json_to_tarballs(name, src, pkg_deps, out):
    """Substitute tar paths into a package.json file for the packages it depends on.

    src and pkg_deps must be labels in the bazel-out tree for the derived path to the npm_package_archive.tar.gz to be correct.

    Args:
        name: Name of the rule
        src: package.json file to perform substitions on
        pkg_deps: package.json files of dependencies to substitute
        out: Output package.json file
    """

    src_pkg = to_label(src).package

    # Generate partial jq filters for each dependent package that, when run
    # against a package.json file, can replace its dependency with a tar path.
    filter_files = []
    for i, pkg_dep in enumerate(pkg_deps):
        pkg_dep_name = "%s_%s.name" % (name, i)
        pkg_dep_filter = "%s_%s.filter" % (name, i)
        jq(
            name = "%s_%s_name" % (name, i),
            srcs = [pkg_dep],
            filter = ".name",
            out = pkg_dep_name,
        )

        srcs = [
            pkg_dep_name,
            pkg_dep,
        ]

        # Add dependent tars as srcs to include them in the dependency graph, except
        # for the tar for this package as that would create a circular dependency.
        pkg_label = to_label(pkg_dep)
        if pkg_label.package != src_pkg:
            pkg_tar = "@%s//%s:npm_package_archive.tar.gz" % (pkg_label.workspace_name, pkg_label.package)
            srcs.append(pkg_tar)

        # Deriving the absolute path to the tar in the execroot requries different
        # commands depending on whether or not the action is sandboxed.
        abs_path_sandbox = "readlink $(execpath {pkg_dep})".format(pkg_dep = pkg_dep)
        abs_path_nosandbox = "(cd $$(dirname $(execpath {pkg_dep})) && pwd)".format(pkg_dep = pkg_dep)

        native.genrule(
            name = "%s_%s_filter" % (name, i),
            srcs = srcs,
            cmd = """
                TAR=$$(dirname $$({abs_path_sandbox} || {abs_path_nosandbox}))/npm_package_archive.tar.gz
                PKGNAME=$$(cat $(execpath {pkg_name}))
                if [[ "$$TAR" != *bazel-out* ]]; then
                    echo "ERROR: package.json passed to substitute_tar_deps must be in the output tree. You can use copy_to_bin to copy a source file to the output tree."
                    exit 1
                fi
                echo "(..|objects|select(has($${{PKGNAME}})))[$${{PKGNAME}}] |= \\"file:$${{TAR}}\\"" > $@
            """.format(
                pkg_name = pkg_dep_name,
                abs_path_sandbox = abs_path_sandbox,
                abs_path_nosandbox = abs_path_nosandbox,
            ),
            outs = [pkg_dep_filter],
        )
        filter_files.append(pkg_dep_filter)

    # Combine all of the filter files into a single filter by joining with |
    filter = "%s.filter" % name
    native.genrule(
        name = "%s_filter" % name,
        srcs = filter_files,
        cmd = "cat $(SRCS) | sed '$$!s#$$# |#' > $@",
        outs = [filter],
    )

    # Generate final package.json with tar substitutions using the above filter
    jq(
        name = name,
        srcs = [src],
        filter_file = filter,
        out = out,
    )
