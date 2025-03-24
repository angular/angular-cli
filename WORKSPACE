workspace(name = "angular_cli")

DEFAULT_NODE_VERSION = "20.11.1"

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive", "http_file")

http_archive(
    name = "bazel_skylib",
    sha256 = "bc283cdfcd526a52c3201279cda4bc298652efa898b10b4db0837dc51652756f",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/bazel-skylib/releases/download/1.7.1/bazel-skylib-1.7.1.tar.gz",
        "https://github.com/bazelbuild/bazel-skylib/releases/download/1.7.1/bazel-skylib-1.7.1.tar.gz",
    ],
)

http_archive(
    name = "io_bazel_rules_webtesting",
    sha256 = "e9abb7658b6a129740c0b3ef6f5a2370864e102a5ba5ffca2cea565829ed825a",
    urls = ["https://github.com/bazelbuild/rules_webtesting/releases/download/0.3.5/rules_webtesting.tar.gz"],
)

http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "5dd1e5dea1322174c57d3ca7b899da381d516220793d0adef3ba03b9d23baa8e",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/5.8.3/rules_nodejs-5.8.3.tar.gz"],
)

load("@build_bazel_rules_nodejs//:repositories.bzl", "build_bazel_rules_nodejs_dependencies")

build_bazel_rules_nodejs_dependencies()

http_archive(
    name = "aspect_rules_js",
    sha256 = "d66f8abf914a0454a69181b7b17acaae56d7b0e2784cb26b40cb3273c4d836d1",
    strip_prefix = "rules_js-2.2.0",
    url = "https://github.com/aspect-build/rules_js/releases/download/v2.2.0/rules_js-v2.2.0.tar.gz",
)

load("@aspect_rules_js//js:repositories.bzl", "rules_js_dependencies")

rules_js_dependencies()

http_archive(
    name = "rules_pkg",
    sha256 = "8c20f74bca25d2d442b327ae26768c02cf3c99e93fad0381f32be9aab1967675",
    urls = ["https://github.com/bazelbuild/rules_pkg/releases/download/0.8.1/rules_pkg-0.8.1.tar.gz"],
)

load("@bazel_tools//tools/sh:sh_configure.bzl", "sh_configure")

sh_configure()

load("@bazel_skylib//:workspace.bzl", "bazel_skylib_workspace")

bazel_skylib_workspace()

load("@rules_pkg//:deps.bzl", "rules_pkg_dependencies")

rules_pkg_dependencies()

# Setup the Node.js toolchain
load("@rules_nodejs//nodejs:repositories.bzl", "nodejs_register_toolchains")

NODE_20_REPO = {
    "20.11.1-darwin_arm64": ("node-v20.11.1-darwin-arm64.tar.gz", "node-v20.11.1-darwin-arm64", "e0065c61f340e85106a99c4b54746c5cee09d59b08c5712f67f99e92aa44995d"),
    "20.11.1-darwin_amd64": ("node-v20.11.1-darwin-x64.tar.gz", "node-v20.11.1-darwin-x64", "c52e7fb0709dbe63a4cbe08ac8af3479188692937a7bd8e776e0eedfa33bb848"),
    "20.11.1-linux_arm64": ("node-v20.11.1-linux-arm64.tar.xz", "node-v20.11.1-linux-arm64", "c957f29eb4e341903520caf362534f0acd1db7be79c502ae8e283994eed07fe1"),
    "20.11.1-linux_ppc64le": ("node-v20.11.1-linux-ppc64le.tar.xz", "node-v20.11.1-linux-ppc64le", "51343cacf5cdf5c4b5e93e919d19dd373d6ef43d5f2c666eae299f26e31d08b5"),
    "20.11.1-linux_s390x": ("node-v20.11.1-linux-s390x.tar.xz", "node-v20.11.1-linux-s390x", "b32616b705cd0ddbb230b95c693e3d7a37becc2ced9bcadea8dc824cceed6be0"),
    "20.11.1-linux_amd64": ("node-v20.11.1-linux-x64.tar.xz", "node-v20.11.1-linux-x64", "d8dab549b09672b03356aa2257699f3de3b58c96e74eb26a8b495fbdc9cf6fbe"),
    "20.11.1-windows_amd64": ("node-v20.11.1-win-x64.zip", "node-v20.11.1-win-x64", "bc032628d77d206ffa7f133518a6225a9c5d6d9210ead30d67e294ff37044bda"),
}

# Set the default nodejs toolchain to the latest supported major version
nodejs_register_toolchains(
    name = "nodejs",
    # The below can be removed once @rules_nodejs/nodejs is updated to latest which contains https://github.com/bazelbuild/rules_nodejs/pull/3701
    node_repositories = NODE_20_REPO,
    node_version = DEFAULT_NODE_VERSION,
)

nodejs_register_toolchains(
    name = "node20",
    # The below can be removed once @rules_nodejs/nodejs is updated to latest which contains https://github.com/bazelbuild/rules_nodejs/pull/3701
    node_repositories = NODE_20_REPO,
    node_version = "20.11.1",
)

nodejs_register_toolchains(
    name = "node22",
    # The below can be removed once @rules_nodejs/nodejs is updated to latest which contains https://github.com/bazelbuild/rules_nodejs/pull/3701
    node_repositories = {
        "22.11.0-darwin_arm64": ("node-v22.11.0-darwin-arm64.tar.gz", "node-v22.11.0-darwin-arm64", "2e89afe6f4e3aa6c7e21c560d8a0453d84807e97850bbb819b998531a22bdfde"),
        "22.11.0-darwin_amd64": ("node-v22.11.0-darwin-x64.tar.gz", "node-v22.11.0-darwin-x64", "668d30b9512137b5f5baeef6c1bb4c46efff9a761ba990a034fb6b28b9da2465"),
        "22.11.0-linux_arm64": ("node-v22.11.0-linux-arm64.tar.xz", "node-v22.11.0-linux-arm64", "6031d04b98f59ff0f7cb98566f65b115ecd893d3b7870821171708cdbaf7ae6e"),
        "22.11.0-linux_ppc64le": ("node-v22.11.0-linux-ppc64le.tar.xz", "node-v22.11.0-linux-ppc64le", "d1d49d7d611b104b6d616e18ac439479d8296aa20e3741432de0e85f4735a81e"),
        "22.11.0-linux_s390x": ("node-v22.11.0-linux-s390x.tar.xz", "node-v22.11.0-linux-s390x", "f474ed77d6b13d66d07589aee1c2b9175be4c1b165483e608ac1674643064a99"),
        "22.11.0-linux_amd64": ("node-v22.11.0-linux-x64.tar.xz", "node-v22.11.0-linux-x64", "83bf07dd343002a26211cf1fcd46a9d9534219aad42ee02847816940bf610a72"),
        "22.11.0-windows_amd64": ("node-v22.11.0-win-x64.zip", "node-v22.11.0-win-x64", "905373a059aecaf7f48c1ce10ffbd5334457ca00f678747f19db5ea7d256c236"),
    },
    node_version = "22.11.0",
)

load("@aspect_rules_js//js:toolchains.bzl", "rules_js_register_toolchains")

rules_js_register_toolchains(
    node_repositories = NODE_20_REPO,
    node_version = DEFAULT_NODE_VERSION,
)

load("@build_bazel_rules_nodejs//:index.bzl", "yarn_install")

# TODO(devversion): Remove this once `ng_package` is ported over to `rules_js`.
yarn_install(
    name = "npm",
    data = [
        "//tools/legacy-rnjs:.yarn/patches/@angular-bazel-https-67c38b3c32.patch",
        "//tools/legacy-rnjs:.yarn/releases/yarn-4.5.0.cjs",
        "//tools/legacy-rnjs:.yarnrc.yml",
    ],
    exports_directories_only = False,
    package_json = "//tools/legacy-rnjs:package.json",
    yarn = "//tools/legacy-rnjs:.yarn/releases/yarn-4.5.0.cjs",
    yarn_lock = "//tools/legacy-rnjs:yarn.lock",
)

http_archive(
    name = "aspect_bazel_lib",
    sha256 = "40ba9d0f62deac87195723f0f891a9803a7b720d7b89206981ca5570ef9df15b",
    strip_prefix = "bazel-lib-2.14.0",
    url = "https://github.com/aspect-build/bazel-lib/releases/download/v2.14.0/bazel-lib-v2.14.0.tar.gz",
)

load("@aspect_bazel_lib//lib:repositories.bzl", "aspect_bazel_lib_dependencies", "aspect_bazel_lib_register_toolchains")

aspect_bazel_lib_dependencies()

aspect_bazel_lib_register_toolchains()

load("@build_bazel_rules_nodejs//toolchains/esbuild:esbuild_repositories.bzl", "esbuild_repositories")

esbuild_repositories(
    npm_repository = "npm",
)

load("@aspect_rules_js//npm:repositories.bzl", "npm_translate_lock")

npm_translate_lock(
    name = "npm2",
    custom_postinstalls = {
        # TODO: Standardize browser management for `rules_js`
        "webdriver-manager": "node ./bin/webdriver-manager update --standalone false --gecko false --versions.chrome 106.0.5249.21",
    },
    data = [
        "//:package.json",
        "//:pnpm-workspace.yaml",
        "//modules/testing/builder:package.json",
        "//packages/angular/build:package.json",
        "//packages/angular/cli:package.json",
        "//packages/angular/pwa:package.json",
        "//packages/angular/ssr:package.json",
        "//packages/angular_devkit/architect:package.json",
        "//packages/angular_devkit/architect_cli:package.json",
        "//packages/angular_devkit/build_angular:package.json",
        "//packages/angular_devkit/build_webpack:package.json",
        "//packages/angular_devkit/core:package.json",
        "//packages/angular_devkit/schematics:package.json",
        "//packages/angular_devkit/schematics_cli:package.json",
        "//packages/ngtools/webpack:package.json",
        "//packages/schematics/angular:package.json",
        "//tests:package.json",
    ],
    lifecycle_hooks_envs = {
        # TODO: Standardize browser management for `rules_js`
        "puppeteer": ["PUPPETEER_DOWNLOAD_PATH=./downloads"],
    },
    lifecycle_hooks_execution_requirements = {
        # Needed for downloading chromedriver.
        # Also `update-config` of webdriver manager would store an absolute path;
        # which would then break execution.
        "webdriver-manager": ["local"],
    },
    npmrc = "//:.npmrc",
    patches = {
        # Note: Patches not needed as the existing patches are only
        # for `rules_nodejs` dependencies :)
    },
    pnpm_lock = "//:pnpm-lock.yaml",
    public_hoist_packages = {
        # TODO: Remove when https://github.com/verdaccio/verdaccio/commit/bf0e09a509e8e0a74167b0307d129202bc3f40d2 is available.
        "@verdaccio/config": [""],
    },
    verify_node_modules_ignored = "//:.bazelignore",
)

load("@npm2//:repositories.bzl", "npm_repositories")

npm_repositories()

http_archive(
    name = "aspect_rules_ts",
    sha256 = "d584e4bc80674d046938563678117d17df962fe105395f6b1efe2e8a248b8100",
    strip_prefix = "rules_ts-3.5.1",
    url = "https://github.com/aspect-build/rules_ts/releases/download/v3.5.1/rules_ts-v3.5.1.tar.gz",
)

load("@aspect_rules_ts//ts:repositories.bzl", "rules_ts_dependencies")

rules_ts_dependencies(
    # ts_version_from = "//:package.json",
    # Obtained by: curl --silent https://registry.npmjs.org/typescript/5.7.2 | jq -r '.dist.integrity'
    ts_integrity = "sha512-i5t66RHxDvVN40HfDd1PsEThGNnlMCMT3jMUuoh9/0TaqWevNontacunWyN02LA9/fIbEWlcHZcgTKb9QoaLfg==",
    ts_version = "5.7.2",
)

http_file(
    name = "tsc_worker",
    sha256 = "5a5c46846ecda83e05b9da26f1672ad51c59bce08fed88419850d0e29c993b30",
    urls = ["https://raw.githubusercontent.com/devversion/rules_angular/4b7532ba2b29078d005899cd15b415593d03cceb/dist/worker.mjs"],
)

http_archive(
    name = "aspect_rules_jasmine",
    sha256 = "0d2f9c977842685895020cac721d8cc4f1b37aae15af46128cf619741dc61529",
    strip_prefix = "rules_jasmine-2.0.0",
    url = "https://github.com/aspect-build/rules_jasmine/releases/download/v2.0.0/rules_jasmine-v2.0.0.tar.gz",
)

load("@aspect_rules_jasmine//jasmine:dependencies.bzl", "rules_jasmine_dependencies")

rules_jasmine_dependencies()

load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

git_repository(
    name = "devinfra",
    commit = "ad960c29189d0bfccbd35c4d47d3d7bff9da3666",
    remote = "https://github.com/angular/dev-infra.git",
)

load("@devinfra//bazel:setup_dependencies_1.bzl", "setup_dependencies_1")

setup_dependencies_1()

load("@devinfra//bazel:setup_dependencies_2.bzl", "setup_dependencies_2")

setup_dependencies_2()

load("@devinfra//bazel/browsers:browser_repositories.bzl", "browser_repositories")

browser_repositories()

register_toolchains(
    "@devinfra//bazel/git-toolchain:git_linux_toolchain",
    "@devinfra//bazel/git-toolchain:git_macos_x86_toolchain",
    "@devinfra//bazel/git-toolchain:git_macos_arm64_toolchain",
    "@devinfra//bazel/git-toolchain:git_windows_toolchain",
)
