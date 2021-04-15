workspace(
    name = "nguniversal",
    managed_directories = {"@npm": ["node_modules"]},
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Add NodeJS rules (explicitly used for sass bundle rules)
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "b3521b29c7cb0c47a1a735cce7e7e811a4f80d8e3720cf3a1b624533e4bb7cb6",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/2.3.2/rules_nodejs-2.3.2.tar.gz"],
)

# Setup the NodeJS toolchain
load("@build_bazel_rules_nodejs//:index.bzl", "check_bazel_version", "node_repositories", "yarn_install")

node_repositories()

check_bazel_version(minimum_bazel_version = "4.0.0")

# Setup the Node.js toolchain
node_repositories(
    node_version = "14.16.1",
    package_json = ["//:package.json"],
)

yarn_install(
    name = "npm",
    # Ensure that the script is available when running `postinstall` in the Bazel sandbox.
    data = [
        "//:angular-metadata.tsconfig.json",
    ],
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

# Install all bazel dependencies of the @ngdeps npm packages
load("@npm//:install_bazel_dependencies.bzl", "install_bazel_dependencies")

install_bazel_dependencies(suppress_warning = True)
