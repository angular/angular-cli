workspace(
    name = "nguniversal",
    managed_directories = {"@npm": ["node_modules"]},
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Add NodeJS rules (explicitly used for sass bundle rules)
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "0d9660cf0894f1fe1e9840818553e0080fbce0851169812d77a70bdb9981c946",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/0.37.0/rules_nodejs-0.37.0.tar.gz"],
)

# Setup the NodeJS toolchain
load("@build_bazel_rules_nodejs//:defs.bzl", "check_bazel_version", "node_repositories", "yarn_install")

node_repositories()

# The minimum bazel version to use with this repo is 0.27.0
check_bazel_version(minimum_bazel_version = "0.27.0")

node_repositories(
    # For deterministic builds, specify explicit NodeJS and Yarn versions.
    node_version = "10.13.0",
    yarn_repositories = {
        "1.16.0": ("yarn-v1.16.0.tar.gz", "yarn-v1.16.0", "df202627d9a70cf09ef2fb11cb298cb619db1b958590959d6f6e571b50656029"),
    },
    yarn_version = "1.16.0",
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
load("@npm_bazel_typescript//:defs.bzl", "ts_setup_workspace")

ts_setup_workspace()

# Transitive dep of @npm_angular_bazel - should be removed
http_archive(
    name = "io_bazel_rules_webtesting",
    sha256 = "1c0900547bdbe33d22aa258637dc560ce6042230e41e9ea9dad5d7d2fca8bc42",
    urls = ["https://github.com/bazelbuild/rules_webtesting/releases/download/0.3.0/rules_webtesting.tar.gz"],
)

load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories()
