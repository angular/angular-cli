load(
    "//:constants.bzl",
    "ANGULAR_FW_PEER_DEP",
    "ANGULAR_FW_VERSION",
    "BASELINE_DATE",
    "NG_PACKAGR_PEER_DEP",
    "NG_PACKAGR_VERSION",
    "RELEASE_ENGINES_NODE",
    "RELEASE_ENGINES_NPM",
    "RELEASE_ENGINES_YARN",
)

_stamp_substitutions = {
    # Version of the local package being built, generated via the `--workspace_status_command` flag.
    "0.0.0-PLACEHOLDER": "{{STABLE_PROJECT_VERSION}}",
    "0.0.0-EXPERIMENTAL-PLACEHOLDER": "{{STABLE_PROJECT_EXPERIMENTAL_VERSION}}",
    # ---
    "BUILD_SCM_HASH-PLACEHOLDER": "{{BUILD_SCM_ABBREV_HASH}}",
    "BASELINE-DATE-PLACEHOLDER": BASELINE_DATE,
    "0.0.0-ENGINES-NODE": RELEASE_ENGINES_NODE,
    "0.0.0-ENGINES-NPM": RELEASE_ENGINES_NPM,
    "0.0.0-ENGINES-YARN": RELEASE_ENGINES_YARN,
    "0.0.0-NG-PACKAGR-VERSION": NG_PACKAGR_VERSION,
    "0.0.0-NG-PACKAGR-PEER-DEP": NG_PACKAGR_PEER_DEP,
    "0.0.0-ANGULAR-FW-VERSION": ANGULAR_FW_VERSION,
    "0.0.0-ANGULAR-FW-PEER-DEP": ANGULAR_FW_PEER_DEP,
    # The below is needed for @angular/ssr FESM file.
    "\\./(.+)/packages/angular/ssr/third_party/beasties": "../third_party/beasties/index.js",
}

_no_stamp_substitutions = dict(_stamp_substitutions, **{
    "0.0.0-PLACEHOLDER": "0.0.0",
    "0.0.0-EXPERIMENTAL-PLACEHOLDER": "0.0.0",
})

substitutions = {
    "stamp": _stamp_substitutions,
    "nostamp": _no_stamp_substitutions,
}
