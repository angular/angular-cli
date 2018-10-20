workspace(name = "angular_cli")

# We get Buildifier from here.
http_archive(
    name = "com_github_bazelbuild_buildtools",
    url = "https://github.com/bazelbuild/buildtools/archive/0.15.0.zip",
    strip_prefix = "buildtools-0.15.0",
    sha256 = "76d1837a86fa6ef5b4a07438f8489f00bfa1b841e5643b618e01232ba884b1fe",
)

# Load the TypeScript rules, its dependencies, and setup the workspace.
http_archive(
    name = "build_bazel_rules_typescript",
    url = "https://github.com/bazelbuild/rules_typescript/archive/0.20.3.zip",
    strip_prefix = "rules_typescript-0.20.3",
)

load("@build_bazel_rules_typescript//:package.bzl", "rules_typescript_dependencies")
# build_bazel_rules_nodejs is loaded transitively through rules_typescript_dependencies.
rules_typescript_dependencies()

load("@com_github_bazelbuild_buildtools//buildifier:deps.bzl", "buildifier_dependencies")
buildifier_dependencies()

load("@io_bazel_rules_go//go:def.bzl", "go_register_toolchains", "go_rules_dependencies")
go_rules_dependencies()
go_register_toolchains()

load("@build_bazel_rules_typescript//:defs.bzl", "ts_setup_workspace")
ts_setup_workspace()

load("@build_bazel_rules_nodejs//:defs.bzl", "check_bazel_version", "node_repositories", "yarn_install")
# 0.18.0 is needed for .bazelignore
check_bazel_version("0.18.0")
node_repositories(
    node_version = "10.9.0",
    yarn_version = "1.9.2",
    node_repositories = {
        "10.9.0-darwin_amd64": (
            "node-v10.9.0-darwin-x64.tar.gz",
            "node-v10.9.0-darwin-x64",
            "3c4fe75dacfcc495a432a7ba2dec9045cff359af2a5d7d0429c84a424ef686fc"
        ),
        "10.9.0-linux_amd64": (
            "node-v10.9.0-linux-x64.tar.xz",
            "node-v10.9.0-linux-x64",
            "c5acb8b7055ee0b6ac653dc4e458c5db45348cecc564b388f4ed1def84a329ff"
        ),
        "10.9.0-windows_amd64": (
            "node-v10.9.0-win-x64.zip",
            "node-v10.9.0-win-x64",
            "6a75cdbb69d62ed242d6cbf0238a470bcbf628567ee339d4d098a5efcda2401e"
        ),
    },
    yarn_repositories = {
        "1.9.2": (
            "yarn-v1.9.2.tar.gz",
            "yarn-v1.9.2",
            "3ad69cc7f68159a562c676e21998eb21b44138cae7e8fe0749a7d620cf940204"
        ),
    },
)

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
    data = [
        "//:tools/yarn/check-yarn.js",
    ],
)

http_archive(
    name = "rxjs",
    url = "https://registry.yarnpkg.com/rxjs/-/rxjs-6.3.3.tgz",
    strip_prefix = "package/src",
    sha256 = "72b0b4e517f43358f554c125e40e39f67688cd2738a8998b4a266981ed32f403",
)
