workspace(name = "angular_cli")

DEFAULT_NODE_VERSION = "18.19.1"

# Workaround for: https://github.com/bazel-contrib/bazel-lib/issues/968.
# Override toolchain for tar on windows.
register_toolchains(
    "//tools:windows_tar_system_toolchain",
)

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
    sha256 = "fbc34d815a0cc52183a1a26732fc0329e26774a51abbe0f26fc9fd2dab6133b4",
    strip_prefix = "rules_js-2.1.2",
    url = "https://github.com/aspect-build/rules_js/releases/download/v2.1.2/rules_js-v2.1.2.tar.gz",
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

NODE_18_REPO = {
    "18.19.1-darwin_arm64": ("node-v18.19.1-darwin-arm64.tar.gz", "node-v18.19.1-darwin-arm64", "0c7249318868877032ed21cc0ed450015ee44b31b9b281955521cd3fc39fbfa3"),
    "18.19.1-darwin_amd64": ("node-v18.19.1-darwin-x64.tar.gz", "node-v18.19.1-darwin-x64", "ab67c52c0d215d6890197c951e1bd479b6140ab630212b96867395e21d813016"),
    "18.19.1-linux_arm64": ("node-v18.19.1-linux-arm64.tar.xz", "node-v18.19.1-linux-arm64", "228ad1eee660fba3f9fd2cccf02f05b8ebccc294d27f22c155d20b233a9d76b3"),
    "18.19.1-linux_ppc64le": ("node-v18.19.1-linux-ppc64le.tar.xz", "node-v18.19.1-linux-ppc64le", "2e5812b8fc00548e2e8ab9daa88ace13974c16b6ba5595a7a50c35f848f7d432"),
    "18.19.1-linux_s390x": ("node-v18.19.1-linux-s390x.tar.xz", "node-v18.19.1-linux-s390x", "15106acf4c9e3aca02416dd89fb5c71af77097042455a73f9caa064c1988ead5"),
    "18.19.1-linux_amd64": ("node-v18.19.1-linux-x64.tar.xz", "node-v18.19.1-linux-x64", "f35f24edd4415cd609a2ebc03be03ed2cfe211d7333d55c752d831754fb849f0"),
    "18.19.1-windows_amd64": ("node-v18.19.1-win-x64.zip", "node-v18.19.1-win-x64", "ff08f8fe253fba9274992d7052e9d9a70141342d7b36ddbd6e84cbe823e312c6"),
}

nodejs_register_toolchains(
    name = "node18",
    # The below can be removed once @rules_nodejs/nodejs is updated to latest which contains https://github.com/bazelbuild/rules_nodejs/pull/3701
    node_repositories = NODE_18_REPO,
    node_version = "18.19.1",
)

# Set the default nodejs toolchain to the latest supported major version
nodejs_register_toolchains(
    name = "nodejs",
    # The below can be removed once @rules_nodejs/nodejs is updated to latest which contains https://github.com/bazelbuild/rules_nodejs/pull/3701
    node_repositories = NODE_18_REPO,
    node_version = DEFAULT_NODE_VERSION,
)

nodejs_register_toolchains(
    name = "node20",
    # The below can be removed once @rules_nodejs/nodejs is updated to latest which contains https://github.com/bazelbuild/rules_nodejs/pull/3701
    node_repositories = {
        "20.11.1-darwin_arm64": ("node-v20.11.1-darwin-arm64.tar.gz", "node-v20.11.1-darwin-arm64", "e0065c61f340e85106a99c4b54746c5cee09d59b08c5712f67f99e92aa44995d"),
        "20.11.1-darwin_amd64": ("node-v20.11.1-darwin-x64.tar.gz", "node-v20.11.1-darwin-x64", "c52e7fb0709dbe63a4cbe08ac8af3479188692937a7bd8e776e0eedfa33bb848"),
        "20.11.1-linux_arm64": ("node-v20.11.1-linux-arm64.tar.xz", "node-v20.11.1-linux-arm64", "c957f29eb4e341903520caf362534f0acd1db7be79c502ae8e283994eed07fe1"),
        "20.11.1-linux_ppc64le": ("node-v20.11.1-linux-ppc64le.tar.xz", "node-v20.11.1-linux-ppc64le", "51343cacf5cdf5c4b5e93e919d19dd373d6ef43d5f2c666eae299f26e31d08b5"),
        "20.11.1-linux_s390x": ("node-v20.11.1-linux-s390x.tar.xz", "node-v20.11.1-linux-s390x", "b32616b705cd0ddbb230b95c693e3d7a37becc2ced9bcadea8dc824cceed6be0"),
        "20.11.1-linux_amd64": ("node-v20.11.1-linux-x64.tar.xz", "node-v20.11.1-linux-x64", "d8dab549b09672b03356aa2257699f3de3b58c96e74eb26a8b495fbdc9cf6fbe"),
        "20.11.1-windows_amd64": ("node-v20.11.1-win-x64.zip", "node-v20.11.1-win-x64", "bc032628d77d206ffa7f133518a6225a9c5d6d9210ead30d67e294ff37044bda"),
    },
    node_version = "20.11.1",
)

nodejs_register_toolchains(
    name = "node22",
    # The below can be removed once @rules_nodejs/nodejs is updated to latest which contains https://github.com/bazelbuild/rules_nodejs/pull/3701
    node_repositories = {
        "22.0.0-darwin_arm64": ("node-v22.0.0-darwin-arm64.tar.gz", "node-v22.0.0-darwin-arm64", "ea96d349cfaa67aa87ceeaa3e5b52c9167f7ac302fd8d1ff162d0785e9dc0785"),
        "22.0.0-darwin_amd64": ("node-v22.0.0-darwin-x64.tar.gz", "node-v22.0.0-darwin-x64", "422a3887ff5418f0a4552d89cf99346ab8ab51bb5d384660baa88b8444d2c111"),
        "22.0.0-linux_arm64": ("node-v22.0.0-linux-arm64.tar.xz", "node-v22.0.0-linux-arm64", "83711d29cbe46375bdffab5419f3d831892e24294169272f6c39edc364556241"),
        "22.0.0-linux_ppc64le": ("node-v22.0.0-linux-ppc64le.tar.xz", "node-v22.0.0-linux-ppc64le", "2b3fb8707a79243bfb3131312b86716ddc3855bce21bb168095b6b916798e5e9"),
        "22.0.0-linux_s390x": ("node-v22.0.0-linux-s390x.tar.xz", "node-v22.0.0-linux-s390x", "89a8efeeb9f94ce9ea251b8109e079c14919f4c0dc2cbc9f545ec47ef0886737"),
        "22.0.0-linux_amd64": ("node-v22.0.0-linux-x64.tar.xz", "node-v22.0.0-linux-x64", "9122e50f2642afd5f6078cafd1f52ede60fc464284384f05c18a04d13d07ae5a"),
        "22.0.0-windows_amd64": ("node-v22.0.0-win-x64.zip", "node-v22.0.0-win-x64", "32d639b47d4c0a651ff8f8d7d41a454168a3d4045be37985f9a810cf8cef6174"),
    },
    node_version = "22.0.0",
)

load("@aspect_rules_js//js:toolchains.bzl", "rules_js_register_toolchains")

rules_js_register_toolchains(
    node_repositories = NODE_18_REPO,
    node_version = DEFAULT_NODE_VERSION,
)

load("@build_bazel_rules_nodejs//:index.bzl", "yarn_install")

yarn_install(
    name = "npm",
    data = [
        "//:.yarn/releases/yarn-4.5.0.cjs",
        "//:.yarnrc.yml",
        "//:patches/@angular+bazel+19.1.0-next.4.patch",
        "//:patches/@bazel+concatjs+5.8.1.patch",
        "//:patches/@bazel+jasmine+5.8.1.patch",
    ],
    # Currently disabled due to:
    #  1. Missing Windows support currently.
    #  2. Incompatibilites with the `ts_library` rule.
    exports_directories_only = False,
    package_json = "//:package.json",
    yarn = "//:.yarn/releases/yarn-4.5.0.cjs",
    yarn_lock = "//:yarn.lock",
)

http_archive(
    name = "aspect_bazel_lib",
    sha256 = "7b39d9f38b82260a8151b18dd4a6219d2d7fc4a0ac313d4f5a630ae6907d205d",
    strip_prefix = "bazel-lib-2.10.0",
    url = "https://github.com/aspect-build/bazel-lib/releases/download/v2.10.0/bazel-lib-v2.10.0.tar.gz",
)

load("@aspect_bazel_lib//lib:repositories.bzl", "aspect_bazel_lib_dependencies", "aspect_bazel_lib_register_toolchains")

aspect_bazel_lib_dependencies()

aspect_bazel_lib_register_toolchains()

register_toolchains(
    "@npm//@angular/build-tooling/bazel/git-toolchain:git_linux_toolchain",
    "@npm//@angular/build-tooling/bazel/git-toolchain:git_macos_x86_toolchain",
    "@npm//@angular/build-tooling/bazel/git-toolchain:git_macos_arm64_toolchain",
    "@npm//@angular/build-tooling/bazel/git-toolchain:git_windows_toolchain",
)

load("@npm//@angular/build-tooling/bazel/browsers:browser_repositories.bzl", "browser_repositories")

browser_repositories()

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
    update_pnpm_lock = True,
    verify_node_modules_ignored = "//:.bazelignore",
    yarn_lock = "//:yarn.lock",
)

load("@npm2//:repositories.bzl", "npm_repositories")

npm_repositories()

http_archive(
    name = "aspect_rules_ts",
    patch_args = ["-p1"],
    patches = ["//tools:rules_ts_windows.patch"],
    sha256 = "013a10b2b457add73b081780e604778eb50a141709f9194298f97761acdcc169",
    strip_prefix = "rules_ts-3.4.0",
    url = "https://github.com/aspect-build/rules_ts/releases/download/v3.4.0/rules_ts-v3.4.0.tar.gz",
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
    commit = "0ad6a370f70638e785d6ef1f90dc6ede34684a47",
    remote = "https://github.com/angular/dev-infra.git",
)

load("@devinfra//bazel:setup_dependencies_1.bzl", "setup_dependencies_1")

setup_dependencies_1()

load("@devinfra//bazel:setup_dependencies_2.bzl", "setup_dependencies_2")

setup_dependencies_2()
