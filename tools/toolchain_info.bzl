# look at the toolchains registered in the workspace file with nodejs_register_toolchains

# the name can be anything the user wants this is just added to the target to create unique names
# the order will match against the order in the TOOLCHAIN_VERSION list.
TOOLCHAINS_NAMES = [
    "node20",
    "node22",
    "node24",
]

# this is the list of toolchains that should be used and are registered with nodejs_register_toolchains in the WORKSPACE file
TOOLCHAINS_VERSIONS = [
    "@node20_toolchains//:resolved_toolchain",
    "@node22_toolchains//:resolved_toolchain",
    "@node24_toolchains//:resolved_toolchain",
]

# A default toolchain for use when only one is necessary
DEFAULT_TOOLCHAIN_VERSION = TOOLCHAINS_VERSIONS[len(TOOLCHAINS_VERSIONS) - 1]
