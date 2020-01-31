workspace(
    name = "nguniversal",
    managed_directories = {"@npm": ["node_modules"]},
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Add NodeJS rules (explicitly used for sass bundle rules)
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "6bcef105e75cac3c5f8212e0d0431b6ec1aaa1963e093b0091474ab98ecf29d2",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/1.2.2/rules_nodejs-1.2.2.tar.gz"],
)

# Setup the NodeJS toolchain
load("@build_bazel_rules_nodejs//:index.bzl", "check_bazel_version", "node_repositories", "yarn_install")

node_repositories()

# The minimum bazel version to use with this repo is 1.1.0
check_bazel_version(minimum_bazel_version = "1.1.0")

node_repositories(
    # For deterministic builds, specify explicit NodeJS and Yarn versions.
    node_version = "10.16.0",
    yarn_repositories = {
        "1.17.3": ("yarn-v1.17.3.tar.gz", "yarn-v1.17.3", "e3835194409f1b3afa1c62ca82f561f1c29d26580c9e220c36866317e043c6f3"),
    },
    yarn_version = "1.17.3",
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

install_bazel_dependencies()

# Setup TypeScript toolchain
load("@npm_bazel_typescript//:index.bzl", "ts_setup_workspace")

ts_setup_workspace()

# Transitive dep of @npm_bazel_karma
http_archive(
    name = "io_bazel_rules_webtesting",
    sha256 = "9bb461d5ef08e850025480bab185fd269242d4e533bca75bfb748001ceb343c3",
    urls = ["https://github.com/bazelbuild/rules_webtesting/releases/download/0.3.3/rules_webtesting.tar.gz"],
)

load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories()
