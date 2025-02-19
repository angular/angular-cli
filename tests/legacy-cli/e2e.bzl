load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_test")
load("//tools:toolchain_info.bzl", "TOOLCHAINS_NAMES", "TOOLCHAINS_VERSIONS")

# bazel query --output=label "kind('pkg_tar', //packages/...)"
TESTED_PACKAGES = [
    "//packages/angular/build:npm_package_archive.tgz",
    "//packages/angular/cli:npm_package_archive.tgz",
    "//packages/angular/create:npm_package_archive.tgz",
    "//packages/angular/ssr:npm_package_archive.tgz",
    "//packages/angular/pwa:npm_package_archive.tgz",
    "//packages/angular_devkit/architect:npm_package_archive.tgz",
    "//packages/angular_devkit/architect_cli:npm_package_archive.tgz",
    "//packages/angular_devkit/build_angular:npm_package_archive.tgz",
    "//packages/angular_devkit/build_webpack:npm_package_archive.tgz",
    "//packages/angular_devkit/core:npm_package_archive.tgz",
    "//packages/angular_devkit/schematics:npm_package_archive.tgz",
    "//packages/angular_devkit/schematics_cli:npm_package_archive.tgz",
    "//packages/ngtools/webpack:npm_package_archive.tgz",
    "//packages/schematics/angular:npm_package_archive.tgz",
]

# Number of bazel shards per test target
TEST_SHARD_COUNT = 4

# NB: does not run on rbe because webdriver manager uses an absolute path to chromedriver
# Requires network to fetch npm packages.
TEST_TAGS = ["no-remote-exec", "requires-network"]

# Subset of tests for yarn/esbuild
BROWSER_TESTS = ["tests/misc/browsers.js"]
PACKAGE_MANAGER_SUBSET_TESTS = ["tests/basic/**", "tests/update/**", "tests/commands/add/**", "tests/misc/create-angular.js"]
ESBUILD_TESTS = [
    "tests/basic/**",
    "tests/build/**",
    "tests/commands/add/**",
    "tests/commands/e2e/**",
    "tests/commands/serve/ssr-http-requests-assets.js",
    "tests/i18n/**",
    "tests/vite/**",
    "tests/test/**",
]

WEBPACK_IGNORE_TESTS = [
    "tests/vite/**",
    "tests/build/app-shell/**",
    "tests/i18n/ivy-localize-app-shell.js",
    "tests/i18n/ivy-localize-app-shell-service-worker.js",
    "tests/commands/serve/ssr-http-requests-assets.js",
    "tests/build/prerender/http-requests-assets.js",
    "tests/build/prerender/error-with-sourcemaps.js",
    "tests/build/server-rendering/server-routes-*",
    "tests/build/wasm-esm.js",
    "tests/build/auto-csp*",
    "tests/build/incremental-watch.js",
]

def _to_glob(patterns):
    if len(patterns) == 1:
        return patterns[0]

    return "\"{%s}\"" % ",".join(patterns)

def e2e_suites(name, runner, data):
    """
    Construct all e2e test suite targets

    Args:
        name: the prefix to all rules
        runner: the e2e test runner entry point
        data: runtime deps such as tests and test data
    """

    # Pre-configured test suites
    for toolchain_name, (toolchain, windows_node_repo) in zip(
        TOOLCHAINS_NAMES,
        TOOLCHAINS_VERSIONS,
    ):
        # Default target meant to be run manually for debugging, customizing test cli via bazel
        _e2e_tests(
            name + "_" + toolchain_name,
            runner,
            data = data,
            toolchain = toolchain,
            windows_node_repo = windows_node_repo,
            tags = ["manual"],
        )

        _e2e_suite(name, runner, "npm", data, toolchain_name, toolchain, windows_node_repo)
        _e2e_suite(name, runner, "bun", data, toolchain_name, toolchain, windows_node_repo)
        _e2e_suite(name, runner, "pnpm", data, toolchain_name, toolchain, windows_node_repo)
        _e2e_suite(name, runner, "yarn", data, toolchain_name, toolchain, windows_node_repo)
        _e2e_suite(name, runner, "esbuild", data, toolchain_name, toolchain, windows_node_repo)

    # Saucelabs tests are only run on the default toolchain
    _e2e_suite(name, runner, "saucelabs", data)

def _e2e_tests(name, runner, windows_node_repo, **kwargs):
    # Always specify all the npm packages
    args = kwargs.pop("templated_args", []) + [
        "--package $(rootpath %s)" % p
        for p in TESTED_PACKAGES
    ]

    # Always add all the npm packages as data
    data = kwargs.pop("data", []) + TESTED_PACKAGES

    # Tags that must always be applied
    tags = kwargs.pop("tags", []) + TEST_TAGS

    # Passthru E2E variables in case it is customized by CI etc
    configuration_env_vars = kwargs.pop("configuration_env_vars", []) + ["E2E_TEMP", "E2E_SHARD_INDEX", "E2E_SHARD_TOTAL"]

    env = kwargs.pop("env", {})
    toolchains = kwargs.pop("toolchains", [])

    # The git toolchain + env
    env.update({"GIT_BIN": "$(GIT_BIN_PATH)"})
    toolchains = toolchains + ["@npm//@angular/build-tooling/bazel/git-toolchain:current_git_toolchain"]

    # Chromium browser toolchain
    env.update({
        "CHROME_BIN": "$(CHROMIUM)",
        "CHROME_PATH": "$(CHROMIUM)",
        "CHROMEDRIVER_BIN": "$(CHROMEDRIVER)",
    })
    toolchains = toolchains + ["@npm//@angular/build-tooling/bazel/browsers/chromium:toolchain_alias"]
    data = data + ["@npm//@angular/build-tooling/bazel/browsers/chromium"]

    windows_node_files = [
        "@%s//:node_files" % windows_node_repo,
        "@%s//:npm_files" % windows_node_repo,
        "@%s//:bin/npm.cmd" % windows_node_repo,
    ]

    # In Windows native testing mode, add Windows dependencies. Those are not
    # available by default as we technically execute inside Linux/WSL.
    toolchains = select({
        "//e2e/legacy-cli:native_windows_testing": toolchains + [
            "@org_chromium_chromedriver_windows//:metadata",
            "@org_chromium_chromium_windows//:metadata",
        ],
        "//conditions:default": toolchains,
    })
    data = select({
        "//e2e/legacy-cli:native_windows_testing": data + windows_node_files,
        "//conditions:default": data,
    })

    env.update({
        "NG_E2E_WINDOWS_REPO_SHORT_PATH": "../%s" % windows_node_repo,
    })

    nodejs_test(
        name = name,
        templated_args = args,
        data = data,
        entry_point = runner,
        env = env,
        configuration_env_vars = configuration_env_vars,
        tags = tags,
        toolchains = toolchains,
        **kwargs
    )

def _e2e_suite(name, runner, type, data, toolchain_name = "", toolchain = None, windows_node_repo = None):
    """
    Setup a predefined test suite (yarn|pnpm|bun|esbuild|saucelabs|npm).
    """
    args = []
    tests = None
    ignore = None

    if toolchain_name:
        toolchain_name = "_" + toolchain_name

    if type == "yarn" or type == "bun" or type == "pnpm":
        args.append("--package-manager=%s" % type)
        args.append("--esbuild")
        tests = PACKAGE_MANAGER_SUBSET_TESTS
        ignore = BROWSER_TESTS + WEBPACK_IGNORE_TESTS
    elif type == "esbuild":
        args.append("--esbuild")
        tests = ESBUILD_TESTS
        ignore = BROWSER_TESTS
    elif type == "saucelabs":
        args.append("--esbuild")
        tests = BROWSER_TESTS
        ignore = None
    elif type == "npm":
        tests = None
        ignore = BROWSER_TESTS + WEBPACK_IGNORE_TESTS

    # Standard e2e tests
    _e2e_tests(
        name = "%s.%s%s" % (name, type, toolchain_name),
        runner = runner,
        size = "enormous",
        data = data,
        toolchain = toolchain,
        windows_node_repo = windows_node_repo,
        shard_count = TEST_SHARD_COUNT,
        templated_args = args + [
            "--glob=%s" % _to_glob(tests) if tests else "",
            "--ignore=%s" % _to_glob(ignore) if ignore else "",
        ],
    )

    # e2e tests of snapshot builds
    _e2e_tests(
        name = "%s.snapshots.%s%s" % (name, type, toolchain_name),
        runner = runner,
        size = "enormous",
        data = data,
        toolchain = toolchain,
        windows_node_repo = windows_node_repo,
        shard_count = TEST_SHARD_COUNT,
        templated_args = args + [
            "--ng-snapshots",
            "--glob=%s" % _to_glob(tests) if tests else "",
            "--ignore=%s" % _to_glob(ignore) if ignore else "",
        ],
    )
