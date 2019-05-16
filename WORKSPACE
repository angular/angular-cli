workspace(name = "angular_cli")

load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "fb87ed5965cef93188af9a7287511639403f4b0da418961ce6defb9dcf658f51",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/0.27.7/rules_nodejs-0.27.7.tar.gz"],
)

# We use protocol buffers for the Build Event Protocol
git_repository(
    name = "com_google_protobuf",
    commit = "b6375e03aa80274dae89410efdf46346413b2247",
    remote = "https://github.com/protocolbuffers/protobuf",
)

load("@com_google_protobuf//:protobuf_deps.bzl", "protobuf_deps")

protobuf_deps()

load("@build_bazel_rules_nodejs//:defs.bzl", "check_bazel_version", "node_repositories", "yarn_install")

# 0.18.0 is needed for .bazelignore
check_bazel_version(minimum_bazel_version = "0.18.0")

node_repositories(
    node_repositories = {
        "10.9.0-darwin_amd64": (
            "node-v10.9.0-darwin-x64.tar.gz",
            "node-v10.9.0-darwin-x64",
            "3c4fe75dacfcc495a432a7ba2dec9045cff359af2a5d7d0429c84a424ef686fc",
        ),
        "10.9.0-linux_amd64": (
            "node-v10.9.0-linux-x64.tar.xz",
            "node-v10.9.0-linux-x64",
            "c5acb8b7055ee0b6ac653dc4e458c5db45348cecc564b388f4ed1def84a329ff",
        ),
        "10.9.0-windows_amd64": (
            "node-v10.9.0-win-x64.zip",
            "node-v10.9.0-win-x64",
            "6a75cdbb69d62ed242d6cbf0238a470bcbf628567ee339d4d098a5efcda2401e",
        ),
    },
    node_version = "10.9.0",
    yarn_repositories = {
        "1.9.2": (
            "yarn-v1.9.2.tar.gz",
            "yarn-v1.9.2",
            "3ad69cc7f68159a562c676e21998eb21b44138cae7e8fe0749a7d620cf940204",
        ),
    },
    yarn_version = "1.9.2",
)

yarn_install(
    name = "npm",
    data = [
        "//:tools/yarn/check-yarn.js",
    ],
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

load("@npm//:install_bazel_dependencies.bzl", "install_bazel_dependencies")

install_bazel_dependencies()

load("@npm_bazel_typescript//:defs.bzl", "ts_setup_workspace")

ts_setup_workspace()

# Load karma dependencies
load("@npm_bazel_karma//:package.bzl", "rules_karma_dependencies")

rules_karma_dependencies()

# Setup the rules_webtesting toolchain
load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories()
