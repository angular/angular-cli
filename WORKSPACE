workspace(name = "nguniversal")

# This commit matches the version of buildifier in angular/ngcontainer
# If you change this, also check if it matches the version in the angular/ngcontainer
# version in /.circleci/config.yml
BAZEL_BUILDTOOLS_VERSION = "70bc7843bb9950fece2bc014ed16de03419e36e2"

http_archive(
    name = "com_github_bazelbuild_buildtools",
    url = "https://github.com/bazelbuild/buildtools/archive/%s.zip" % BAZEL_BUILDTOOLS_VERSION,
    strip_prefix = "buildtools-%s" % BAZEL_BUILDTOOLS_VERSION,
    sha256 = "367c23a5fe7fc2a7cb57863d3718b4149f0e57426c48c8ad54c45348a0b53cc1",
)

http_archive(
    name = "build_bazel_rules_nodejs",
    url = "https://github.com/bazelbuild/rules_nodejs/archive/1931156c232a08356dfda02e9c8b0275c2e63c00.zip",
    strip_prefix = "rules_nodejs-1931156c232a08356dfda02e9c8b0275c2e63c00",
    sha256 = "9cfe33276a6ac0076ee9ee159c4a2576f9851c0f437435b5ac19b2e592493078",
)


load("@build_bazel_rules_nodejs//:defs.bzl", "check_bazel_version", "node_repositories", "yarn_install")

check_bazel_version("0.11.1")
node_repositories(package_json = ["//:package.json"])


local_repository(
    name = "build_bazel_rules_typescript",
    path = "node_modules/@bazel/typescript",
)

load("@build_bazel_rules_typescript//:defs.bzl", "ts_setup_workspace")
ts_setup_workspace()

# Some of the TypeScript is written in Go.
# Bazel doesn't support transitive WORKSPACE deps, so we must repeat them here.
http_archive(
    name = "io_bazel_rules_go",
    url = "https://github.com/bazelbuild/rules_go/releases/download/0.10.3/rules_go-0.10.3.tar.gz",
    sha256 = "feba3278c13cde8d67e341a837f69a029f698d7a27ddbb2a202be7a10b22142a",
)

load("@io_bazel_rules_go//go:def.bzl", "go_rules_dependencies", "go_register_toolchains")
go_rules_dependencies()
go_register_toolchains()


####################################
# Tell Bazel about some workspaces that were installed from npm.

local_repository(
    name = "angular",
    path = "node_modules/@angular/bazel",
)


local_repository(
    name = "rxjs",
    path = "node_modules/rxjs/src",
)
