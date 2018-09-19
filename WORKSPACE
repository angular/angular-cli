workspace(name = "angular_devkit")

# We get Buildifier from here.
http_archive(
    name = "com_github_bazelbuild_buildtools",
    url = "https://github.com/bazelbuild/buildtools/archive/0.15.0.zip",
    strip_prefix = "buildtools-0.15.0",
    sha256 = "76d1837a86fa6ef5b4a07438f8489f00bfa1b841e5643b618e01232ba884b1fe",
)

load("@com_github_bazelbuild_buildtools//buildifier:deps.bzl", "buildifier_dependencies")
buildifier_dependencies()

# The Go toolchain is used for Buildifier.
# rules_typescript_dependencies() also tries to load it but we add it explicitely so we
# don't have hidden dependencies. 
# This also means we need to load it before rules_typescript_dependencies().
http_archive(
    name = "io_bazel_rules_go",
    url = "https://github.com/bazelbuild/rules_go/archive/0.14.0.zip",
    strip_prefix = "rules_go-0.14.0",
    sha256 = "9bd7c2743f014e4e112b671098ba1da6aec036fe07093b10ca39a9f81ec5cc33",
)

load("@io_bazel_rules_go//go:def.bzl", "go_register_toolchains", "go_rules_dependencies")
go_rules_dependencies()
go_register_toolchains()

# We need a minimum of this version to include https://github.com/bazelbuild/rules_nodejs/pull/281.
http_archive(
    name = "build_bazel_rules_nodejs",
    url = "https://github.com/bazelbuild/rules_nodejs/archive/0.12.4.zip",
    strip_prefix = "rules_nodejs-0.12.4",
    sha256 = "c482700e032b4df60425cb9a6f8f28152fb1c4c947a9d61e6132fc59ce332b16",
)

# Load the TypeScript rules, its dependencies, and setup the workspace.
http_archive(
    name = "build_bazel_rules_typescript",
    url = "https://github.com/bazelbuild/rules_typescript/archive/0.16.1.zip",
    strip_prefix = "rules_typescript-0.16.1",
    sha256 = "5b2b0bc63cfcffe7bf97cad2dad3b26a73362f806de66207051f66c87956a995",
)

load("@build_bazel_rules_typescript//:package.bzl", "rules_typescript_dependencies")
# build_bazel_rules_nodejs is loaded transitively through rules_typescript_dependencies.
rules_typescript_dependencies()

load("@build_bazel_rules_typescript//:defs.bzl", "ts_setup_workspace")
ts_setup_workspace()

# Load the nodejs dependencies, check minimum Bazel version, and define the local node_modules.
load("@build_bazel_rules_nodejs//:package.bzl", "rules_nodejs_dependencies")
rules_nodejs_dependencies()

load("@build_bazel_rules_nodejs//:defs.bzl", "check_bazel_version", "node_repositories")
check_bazel_version("0.15.0")
node_repositories(
    package_json = ["//:package.json"], 
    preserve_symlinks = True,
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

local_repository(
    name = "rxjs",
    path = "node_modules/rxjs/src",
)
