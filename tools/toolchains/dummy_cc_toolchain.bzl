"""
This file defines a dummy C++ toolchain for Windows.
It is needed to satisfy Bazel's toolchain resolution when cross-compiling for Windows on Linux.
Some rules (e.g. rules_nodejs, js_test) or their dependencies may trigger C++ toolchain resolution
even if no actual C++ compilation is performed for the target platform.
Without this, the build fails with "Unable to find a CC toolchain using toolchain resolution".
"""

load("@rules_cc//cc:defs.bzl", "cc_common")

def _impl(ctx):
    return cc_common.create_cc_toolchain_config_info(
        ctx = ctx,
        toolchain_identifier = "dummy-toolchain",
        host_system_name = "local",
        target_system_name = "local",
        target_cpu = "x64_windows",
        target_libc = "unknown",
        compiler = "dummy",
        abi_version = "unknown",
        abi_libc_version = "unknown",
    )

dummy_cc_toolchain_config = rule(
    implementation = _impl,
    attrs = {},
    provides = [CcToolchainConfigInfo],
)
