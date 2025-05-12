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
    sha256 = "83e5af4d17385d1c3268c31ae217dbfc8525aa7bcf52508dc6864baffc8b9501",
    strip_prefix = "rules_js-2.3.7",
    url = "https://github.com/aspect-build/rules_js/releases/download/v2.3.7/rules_js-v2.3.7.tar.gz",
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

nodejs_register_toolchains(
    name = "node24",
    node_repositories = {
        "24.0.0-darwin_arm64": ("node-v24.0.0-darwin-arm64.tar.gz", "node-v24.0.0-darwin-arm64", "194e2f3dd3ec8c2adcaa713ed40f44c5ca38467880e160974ceac1659be60121"),
        "24.0.0-darwin_amd64": ("node-v24.0.0-darwin-x64.tar.gz", "node-v24.0.0-darwin-x64", "f716b3ce14a7e37a6cbf97c9de10d444d7da07ef833cd8da81dd944d111e6a4a"),
        "24.0.0-linux_arm64": ("node-v24.0.0-linux-arm64.tar.xz", "node-v24.0.0-linux-arm64", "d40ec7ffe0b82b02dce94208c84351424099bd70fa3a42b65c46d95322305040"),
        "24.0.0-linux_ppc64le": ("node-v24.0.0-linux-ppc64le.tar.xz", "node-v24.0.0-linux-ppc64le", "cfa0e8d51a2f9a446f1bfb81cdf4c7e95336ad622e2aa230e3fa1d093c63d77d"),
        "24.0.0-linux_s390x": ("node-v24.0.0-linux-s390x.tar.xz", "node-v24.0.0-linux-s390x", "e37a04c7ee05416ec1234fd3255e05b6b81287eb0424a57441c8b69f0a155021"),
        "24.0.0-linux_amd64": ("node-v24.0.0-linux-x64.tar.xz", "node-v24.0.0-linux-x64", "59b8af617dccd7f9f68cc8451b2aee1e86d6bd5cb92cd51dd6216a31b707efd7"),
        "24.0.0-windows_amd64": ("node-v24.0.0-win-x64.zip", "node-v24.0.0-win-x64", "3d0fff80c87bb9a8d7f49f2f27832aa34a1477d137af46f5b14df5498be81304"),
    },
    node_version = "24.0.0",
)

load("@aspect_rules_js//js:toolchains.bzl", "rules_js_register_toolchains")

rules_js_register_toolchains(
    node_repositories = NODE_20_REPO,
    node_version = DEFAULT_NODE_VERSION,
)

http_archive(
    name = "aspect_bazel_lib",
    sha256 = "fc8fe1be58ae39f84a8613d554534760c7f0819d407afcc98bbcbd990523bfed",
    strip_prefix = "bazel-lib-2.16.0",
    url = "https://github.com/aspect-build/bazel-lib/releases/download/v2.16.0/bazel-lib-v2.16.0.tar.gz",
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
    name = "npm",
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
        "//tools/baseline_browserslist:package.json",
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

load("@npm//:repositories.bzl", "npm_repositories")

npm_repositories()

http_archive(
    name = "aspect_rules_ts",
    sha256 = "56858e1e4380948e2d5aca5ab2e96fc5ed788652a4a3b7036e8e4b6f019e63bd",
    strip_prefix = "rules_ts-3.5.3",
    url = "https://github.com/aspect-build/rules_ts/releases/download/v3.5.3/rules_ts-v3.5.3.tar.gz",
)

load("@aspect_rules_ts//ts:repositories.bzl", "rules_ts_dependencies")

rules_ts_dependencies(
    # Obtained by: curl --silent https://registry.npmjs.org/typescript/5.8.3 | jq -r '.dist.integrity'
    ts_integrity = "sha512-p1diW6TqL9L07nNxvRMM7hMMw4c5XOo/1ibL4aAIGmSAt9slTE1Xgw5KWuof2uTOvCg9BY7ZRi+GaF+7sfgPeQ==",
    ts_version_from = "//:package.json",
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
    commit = "a4538b2474d3c551f0217c3d1f5f3a99cf4f8eb7",
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

http_archive(
    name = "aspect_rules_esbuild",
    sha256 = "530adfeae30bbbd097e8af845a44a04b641b680c5703b3bf885cbd384ffec779",
    strip_prefix = "rules_esbuild-0.22.1",
    url = "https://github.com/aspect-build/rules_esbuild/releases/download/v0.22.1/rules_esbuild-v0.22.1.tar.gz",
)

load("@aspect_rules_esbuild//esbuild:dependencies.bzl", "rules_esbuild_dependencies")

rules_esbuild_dependencies()

load("@aspect_rules_esbuild//esbuild:repositories.bzl", "LATEST_ESBUILD_VERSION", "esbuild_register_toolchains")

esbuild_register_toolchains(
    name = "esbuild",
    esbuild_version = LATEST_ESBUILD_VERSION,
)

git_repository(
    name = "rules_angular",
    commit = "c0d7927a33802db438c01d2ae8ad1884e6c363fd",
    remote = "https://github.com/devversion/rules_angular.git",
)

load("@rules_angular//setup:step_1.bzl", "rules_angular_step1")

rules_angular_step1()

load("@rules_angular//setup:step_2.bzl", "rules_angular_step2")

rules_angular_step2()

load("@rules_angular//setup:step_3.bzl", "rules_angular_step3")

rules_angular_step3(
    angular_compiler_cli = "//:node_modules/@angular/compiler-cli",
    typescript = "//:node_modules/typescript",
)

http_archive(
    name = "aspect_rules_rollup",
    sha256 = "0b8ac7d97cd660eb9a275600227e9c4268f5904cba962939d1a6ce9a0a059d2e",
    strip_prefix = "rules_rollup-2.0.1",
    url = "https://github.com/aspect-build/rules_rollup/releases/download/v2.0.1/rules_rollup-v2.0.1.tar.gz",
)
