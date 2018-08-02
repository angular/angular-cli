workspace(name = "angular_devkit")

BAZEL_SKYLIB_VERSION = "0.3.1"
http_archive(
    name = "bazel_skylib",
    url = "https://github.com/bazelbuild/bazel-skylib/archive/%s.zip" % BAZEL_SKYLIB_VERSION,
    strip_prefix = "bazel-skylib-%s" % BAZEL_SKYLIB_VERSION,
    sha256 = "95518adafc9a2b656667bbf517a952e54ce7f350779d0dd95133db4eb5c27fb1",
)

RULES_NODEJS_VERSION = "0.11.2"
http_archive(
    name = "build_bazel_rules_nodejs",
    url = "https://github.com/bazelbuild/rules_nodejs/archive/%s.zip" % RULES_NODEJS_VERSION,
    strip_prefix = "rules_nodejs-%s" % RULES_NODEJS_VERSION,
    sha256 = "c00d5381adeefb56e0ef959a7b168cae628535dab933cfad1c2cd1870cd7c9de",
)

load("@build_bazel_rules_nodejs//:defs.bzl", "check_bazel_version", "node_repositories")

check_bazel_version("0.15.0")

node_repositories(package_json = ["//:package.json"])

local_repository(
    name = "rxjs",
    path = "node_modules/rxjs/src",
)

RULES_WEBTESTING_VERSION = "0.2.1"
http_archive(
    name = "io_bazel_rules_webtesting",
    url = "https://github.com/bazelbuild/rules_webtesting/archive/%s.zip" % RULES_WEBTESTING_VERSION,
    strip_prefix = "rules_webtesting-%s" % RULES_WEBTESTING_VERSION,
    sha256 = "7d490aadff9b5262e5251fa69427ab2ffd1548422467cb9f9e1d110e2c36f0fa",
)

RULES_TYPESCRIPT_VERSION = "0.15.3"
http_archive(
    name = "build_bazel_rules_typescript",
    url = "https://github.com/bazelbuild/rules_typescript/archive/%s.zip" % RULES_TYPESCRIPT_VERSION,
    strip_prefix = "rules_typescript-%s" % RULES_TYPESCRIPT_VERSION,
    sha256 = "a2b26ac3fc13036011196063db1bf7f1eae81334449201dc28087ebfa3708c99",
)

load("@build_bazel_rules_typescript//:defs.bzl", "ts_setup_workspace")

ts_setup_workspace()

# We get tools like Buildifier from here
BAZEL_BUILDTOOLS_VERSION = "0.15.0"
http_archive(
    name = "com_github_bazelbuild_buildtools",
    url = "https://github.com/bazelbuild/buildtools/archive/%s.zip" % BAZEL_BUILDTOOLS_VERSION,
    strip_prefix = "buildtools-%s" % BAZEL_BUILDTOOLS_VERSION,
    sha256 = "76d1837a86fa6ef5b4a07438f8489f00bfa1b841e5643b618e01232ba884b1fe",
)

# The Go toolchain is used for Buildifier and some TypeScript tooling.
# We need to use this commit to include Windows path fixes.
RULES_GO_VERSION = "0.14.0"
http_archive(
    name = "io_bazel_rules_go",
    url = "https://github.com/bazelbuild/rules_go/archive/%s.zip" % RULES_GO_VERSION,
    strip_prefix = "rules_go-%s" % RULES_GO_VERSION,
    sha256 = "9bd7c2743f014e4e112b671098ba1da6aec036fe07093b10ca39a9f81ec5cc33",
)

load("@io_bazel_rules_go//go:def.bzl", "go_register_toolchains", "go_rules_dependencies")

go_rules_dependencies()

go_register_toolchains()
