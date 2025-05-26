# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.dev/license

load("//:constants.bzl", "SNAPSHOT_REPOS")

def _generate_snapshot_repo_filter():
    individual_pkg_filters = []
    for pkg_name, snapshot_repo in SNAPSHOT_REPOS.items():
        individual_pkg_filters.append(
            """
            . as $root
                | [paths(..)]
                | [(.[] | select(
                    contains(["{pkg_name}"]) and
                    contains(["peerDependenciesMeta"]) != true))] as $paths
                | $paths | reduce $paths[] as $path ($root; setpath($path; "github:{snapshot_repo}#BUILD_SCM_HASH-PLACEHOLDER")) | .
            """.format(
                pkg_name = pkg_name,
                snapshot_repo = snapshot_repo,
            ),
        )

    return " | ".join(individual_pkg_filters)

# jq filter that replaces package.json dependencies with snapshot repos
SNAPSHOT_REPO_JQ_FILTER = _generate_snapshot_repo_filter()
