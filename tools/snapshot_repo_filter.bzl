# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license

load("//:constants.bzl", "SNAPSHOT_REPOS")

def _generate_snapshot_repo_filter():
    filter = ""
    for (i, pkg_name) in enumerate(SNAPSHOT_REPOS.keys()):
        filter += "{sep}(..|objects|select(has(\"{pkg_name}\")))[\"{pkg_name}\"] |= \"github:{snapshot_repo}:BUILD_SCM_HASH-PLACEHOLDER\"\n".format(
            sep = "| " if i > 0 else "",
            pkg_name = pkg_name,
            snapshot_repo = SNAPSHOT_REPOS[pkg_name],
        )
    return filter

# jq filter that replaces package.json dependencies with snapshot repos
SNAPSHOT_REPO_JQ_FILTER = _generate_snapshot_repo_filter()
