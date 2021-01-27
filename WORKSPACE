workspace(
    name = "angular_cli",
    managed_directories = {"@npm": ["node_modules"]},
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "121f17d8b421ce72f3376431c3461cd66bfe14de49059edc7bb008d5aebd16be",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/2.3.1/rules_nodejs-2.3.1.tar.gz"],
)

# Check the bazel version and download npm dependencies
load("@build_bazel_rules_nodejs//:index.bzl", "check_bazel_version", "check_rules_nodejs_version", "node_repositories", "yarn_install")

# Bazel version must be at least the following version because:
#   - 0.26.0 managed_directories feature added which is required for nodejs rules 0.30.0
#   - 0.27.0 has a fix for managed_directories after `rm -rf node_modules`
check_bazel_version(
    message = """
You no longer need to install Bazel on your machine.
Angular has a dependency on the @bazel/bazelisk package which supplies it.
Try running `yarn bazel` instead.
    (If you did run that, check that you've got a fresh `yarn install`)
""",
    minimum_bazel_version = "4.0.0",
)

# The NodeJS rules version must be at least the following version because:
#   - 0.15.2 Re-introduced the prod_only attribute on yarn_install
#   - 0.15.3 Includes a fix for the `jasmine_node_test` rule ignoring target tags
#   - 0.16.8 Supports npm installed bazel workspaces
#   - 0.26.0 Fix for data files in yarn_install and npm_install
#   - 0.27.12 Adds NodeModuleSources provider for transtive npm deps support
#   - 0.30.0 yarn_install now uses symlinked node_modules with new managed directories Bazel 0.26.0 feature
#   - 0.31.1 entry_point attribute of nodejs_binary & rollup_bundle is now a label
#   - 0.32.0 yarn_install and npm_install no longer puts build files under symlinked node_modules
#   - 0.32.1 remove override of @bazel/tsetse & exclude typescript lib declarations in node_module_library transitive_declarations
#   - 0.32.2 resolves bug in @bazel/hide-bazel-files postinstall step
#   - 0.34.0 introduces protractor rule
check_rules_nodejs_version(minimum_version_string = "2.0.0")

# Setup the Node.js toolchain
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
    data = [
        "//:tools/yarn/check-yarn.js",
    ],
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

load("@npm//:install_bazel_dependencies.bzl", "install_bazel_dependencies")

install_bazel_dependencies(suppress_warning = True)

##########################
# Remote Execution Setup #
##########################
# Bring in bazel_toolchains for RBE setup configuration.
http_archive(
    name = "bazel_toolchains",
    sha256 = "1adf5db506a7e3c465a26988514cfc3971af6d5b3c2218925cd6e71ee443fc3f",
    strip_prefix = "bazel-toolchains-4.0.0",
    url = "https://github.com/bazelbuild/bazel-toolchains/archive/4.0.0.tar.gz",
)

load("@bazel_toolchains//rules:environments.bzl", "clang_env")
load("@bazel_toolchains//rules:rbe_repo.bzl", "rbe_autoconfig")

rbe_autoconfig(
    name = "rbe_ubuntu1604_angular",
    # Need to specify a base container digest in order to ensure that we can use the checked-in
    # platform configurations for the "ubuntu16_04" image. Otherwise the autoconfig rule would
    # need to pull the image and run it in order determine the toolchain configuration. See:
    # https://github.com/bazelbuild/bazel-toolchains/blob/3.5.0/configs/ubuntu16_04_clang/versions.bzl
    base_container_digest = "sha256:f6568d8168b14aafd1b707019927a63c2d37113a03bcee188218f99bd0327ea1",
    # Note that if you change the `digest`, you might also need to update the
    # `base_container_digest` to make sure marketplace.gcr.io/google/rbe-ubuntu16-04-webtest:<digest>
    # and marketplace.gcr.io/google/rbe-ubuntu16-04:<base_container_digest> have
    # the same Clang and JDK installed. Clang is needed because of the dependency on
    # @com_google_protobuf. Java is needed for the Bazel's test executor Java tool.
    digest = "sha256:f743114235a43355bf8324e2ba0fa6a597236fe06f7bc99aaa9ac703631c306b",
    env = clang_env(),
    registry = "marketplace.gcr.io",
    # We can't use the default "ubuntu16_04" RBE image provided by the autoconfig because we need
    # a specific Linux kernel that comes with "libx11" in order to run headless browser tests.
    repository = "google/rbe-ubuntu16-04-webtest",
    use_checked_in_confs = "Force",
)
