workspace(
    name = "nguniversal",
    managed_directories = {"@npm": ["node_modules"]},
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Add NodeJS rules (explicitly used for sass bundle rules)
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "6a67a8a1bf6fddc9113f73471029b819eef4575c3a936a4a01d57e411894d692",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/2.0.2/rules_nodejs-2.0.2.tar.gz"],
)

# Setup the NodeJS toolchain
load("@build_bazel_rules_nodejs//:index.bzl", "check_bazel_version", "node_repositories", "yarn_install")

node_repositories()

# The minimum bazel version to use with this repo is 1.1.0
check_bazel_version(minimum_bazel_version = "3.0.0")

node_repositories(
    node_repositories = {
        "12.14.1-darwin_amd64": ("node-v12.14.1-darwin-x64.tar.gz", "node-v12.14.1-darwin-x64", "0be10a28737527a1e5e3784d3ad844d742fe8b0718acd701fd48f718fd3af78f"),
        "12.14.1-linux_amd64": ("node-v12.14.1-linux-x64.tar.xz", "node-v12.14.1-linux-x64", "07cfcaa0aa9d0fcb6e99725408d9e0b07be03b844701588e3ab5dbc395b98e1b"),
        "12.14.1-windows_amd64": ("node-v12.14.1-win-x64.zip", "node-v12.14.1-win-x64", "1f96ccce3ba045ecea3f458e189500adb90b8bc1a34de5d82fc10a5bf66ce7e3"),
    },
    node_version = "12.14.1",
    package_json = ["//:package.json"],
    yarn_repositories = {
        "1.22.4": ("yarn-v1.22.4.tar.gz", "yarn-v1.22.4", "bc5316aa110b2f564a71a3d6e235be55b98714660870c5b6b2d2d3f12587fb58"),
    },
    yarn_version = "1.22.4",
)

yarn_install(
    name = "npm",
    # Ensure that the script is available when running `postinstall` in the Bazel sandbox.
    data = [
        "//:angular-metadata.tsconfig.json",
        "//:tools/npm/check-npm.js",
    ],
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

# Install all bazel dependencies of the @ngdeps npm packages
load("@npm//:install_bazel_dependencies.bzl", "install_bazel_dependencies")

install_bazel_dependencies(suppress_warning = True)
