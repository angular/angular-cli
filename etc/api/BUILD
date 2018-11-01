load("@angular//tools/ts-api-guardian:index.bzl", "ts_api_guardian_test")

[ts_api_guardian_test(
    name = "%s_%s_%sapi" % (
        bundle[0],
        bundle[1],
        bundle[2].replace("src/", "").replace("index", "").replace("/", "_"),
    ),
    actual = "angular_cli/packages/%s/%s/npm_package/%s.d.ts" % (
        bundle[0],
        bundle[1],
        bundle[2],
    ),
    data = glob([
        "%s/%s/**/*.d.ts" % (
            bundle[0],
            bundle[1],
        ),
    ]) + [
        "//packages/%s/%s:npm_package" % (
            bundle[0],
            bundle[1],
        ),
    ],
    golden = "angular_cli/etc/api/%s/%s/%s.d.ts" % (
        bundle[0],
        bundle[1],
        bundle[2],
    ),
    # We don't want to analyse these exports nor add them to the golden files
    # in most cases it's because Ts API Guardian doesn't support Symbol Aliases.
    strip_export_pattern = [
        # @angular-devkit/core
        "^json$",
        "^schema$",
        "^experimental$",
        "^logging$",
        "^strings$",
        "^tags$",
        "^virtualFs$",
        "^terminal$",
        "^fs$",
        # @angular-devkit/schematics
        "^workflow$",
        "^engine$",
        "^formats$",
        # @angular-devkit/build-optimizer
        "^buildOptimizerLoader$",
    ],
    allow_module_identifiers = [
        "fs",
        "ts",
        "Symbol",
    ],
    # At the moment using this will ignore a big change
    use_angular_tag_rules = False,
) for bundle in [b[:-len(".d.ts")].split("/", 2) for b in glob(
    ["**/*.d.ts"],
)]]
