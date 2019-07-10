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
    commit = "beaeaeda34e97a6ff9735b33a66e011102ab506b",
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

##########################
# Remote Execution Setup #
##########################
# Bring in bazel_toolchains for RBE setup configuration.
http_archive(
    name = "bazel_toolchains",
    sha256 = "54764b510cf45754c01ac65c9ba83e5f8fc8a033b8296ef74c4e4d6d1dbfaf21",
    strip_prefix = "bazel-toolchains-d67435097bd65153a592ecdcc83094474914c205",
    urls = ["https://github.com/xingao267/bazel-toolchains/archive/d67435097bd65153a592ecdcc83094474914c205.tar.gz"],
)

load("@bazel_toolchains//rules:environments.bzl", "clang_env")
load("@bazel_toolchains//rules:rbe_repo.bzl", "rbe_autoconfig")

rbe_autoconfig(
    name = "rbe_ubuntu1604_angular",
    # The sha256 of marketplace.gcr.io/google/rbe-ubuntu16-04 container that is
    # used by rbe_autoconfig() to pair toolchain configs in the @bazel_toolchains repo.
    base_container_digest = "sha256:677c1317f14c6fd5eba2fd8ec645bfdc5119f64b3e5e944e13c89e0525cc8ad1",
    # Note that if you change the `digest`, you might also need to update the
    # `base_container_digest` to make sure marketplace.gcr.io/google/rbe-ubuntu16-04-webtest:<digest>
    # and marketplace.gcr.io/google/rbe-ubuntu16-04:<base_container_digest> have
    # the same Clang and JDK installed.
    # Clang is needed because of the dependency on @com_google_protobuf.
    # Java is needed for the Bazel's test executor Java tool.
    digest = "sha256:74a8e9dca4781d5f277a7bd8e7ea7ed0f5906c79c9cd996205b6d32f090c62f3",
    env = clang_env(),
    registry = "marketplace.gcr.io",
    repository = "google/rbe-ubuntu16-04-webtest",
)
