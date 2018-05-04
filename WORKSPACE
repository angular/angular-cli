workspace(name = "angular_devkit")

http_archive(
    name = "build_bazel_rules_nodejs",
    url = "https://github.com/bazelbuild/rules_nodejs/archive/0.4.1.zip",
    strip_prefix = "rules_nodejs-0.4.1",
    sha256 = "e9bc013417272b17f302dc169ad597f05561bb277451f010043f4da493417607",
)

load("@build_bazel_rules_nodejs//:defs.bzl", "check_bazel_version", "node_repositories")

check_bazel_version("0.9.0")
node_repositories(package_json = ["//:package.json"])

local_repository(
    name = "rxjs",
    path = "node_modules/rxjs/src",
)

# Pick up the fix for source-map typings
RULES_TYPESCRIPT_VERSION = "00f8fd5467f2b12ac2fbb8d74ea81d2dd5636d31"
http_archive(
    name = "build_bazel_rules_typescript",
    url = "https://github.com/bazelbuild/rules_typescript/archive/%s.zip" % RULES_TYPESCRIPT_VERSION,
    strip_prefix = "rules_typescript-%s" % RULES_TYPESCRIPT_VERSION,
    sha256 = "3606b97a4859cc3f73b47888618b14290cf4b93c411b1bedd821e8bb39b3442b",
)

load("@build_bazel_rules_typescript//:defs.bzl", "ts_setup_workspace")

ts_setup_workspace()

# We get tools like Buildifier from here
git_repository(
    name = "com_github_bazelbuild_buildtools",
    remote = "https://github.com/bazelbuild/buildtools.git",
    commit = "b3b620e8bcff18ed3378cd3f35ebeb7016d71f71",
)

# The Go toolchain is used for Buildifier and some TypeScript tooling.
http_archive(
    name = "io_bazel_rules_go",
    url = "https://github.com/bazelbuild/rules_go/releases/download/0.7.1/rules_go-0.7.1.tar.gz",
    sha256 = "341d5eacef704415386974bc82a1783a8b7ffbff2ab6ba02375e1ca20d9b031c",
)

load("@io_bazel_rules_go//go:def.bzl", "go_rules_dependencies", "go_register_toolchains")

go_rules_dependencies()

go_register_toolchains()

