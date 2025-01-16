load("//:constants.bzl", "RELEASE_ENGINES_NODE", "RELEASE_ENGINES_NPM", "RELEASE_ENGINES_YARN")

_stamp_substitutions = {
    # Version of the local package being built, generated via the `--workspace_status_command` flag.
    "0.0.0-PLACEHOLDER": "{STABLE_PROJECT_VERSION}",
    "0.0.0-EXPERIMENTAL-PLACEHOLDER": "{STABLE_PROJECT_EXPERIMENTAL_VERSION}",
    # ---
    "BUILD_SCM_HASH-PLACEHOLDER": "{BUILD_SCM_ABBREV_HASH}",
    "0.0.0-ENGINES-NODE": RELEASE_ENGINES_NODE,
    "0.0.0-ENGINES-NPM": RELEASE_ENGINES_NPM,
    "0.0.0-ENGINES-YARN": RELEASE_ENGINES_YARN,
    # The below is needed for @angular/ssr FESM file.
    "\\./(.+)/packages/angular/ssr/third_party/beasties": "../third_party/beasties/index.js",
}

_no_stamp_substitutions = dict(_stamp_substitutions, **{
    "0.0.0-PLACEHOLDER": "0.0.0",
    "0.0.0-EXPERIMENTAL-PLACEHOLDER": "0.0.0",
})

def _adjust_substitutions_for_rules_js(subs):
    result = {}
    for key, value in subs.items():
        # in `rules_js`, or `expand_template` from `bazel-lib`, stamp variables
        # can only be retrieved via `{{X}}` syntax.
        result[key] = value.replace("{", "{{").replace("}", "}}")
    return result

substitutions = {
    "legacy": {
        "stamp": _stamp_substitutions,
        "nostamp": _no_stamp_substitutions,
    },
    "rjs": {
        "stamp": _adjust_substitutions_for_rules_js(_stamp_substitutions),
        "nostamp": _adjust_substitutions_for_rules_js(_no_stamp_substitutions),
    },
}
