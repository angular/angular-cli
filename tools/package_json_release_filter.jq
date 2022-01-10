# Copyright Google Inc. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
#
# This filter combines a subproject package.json with the root package.json
# and performs substitutions to prepare it for release. It should be called
# with the --slurp argument and be passed the root pacakge.json followed by
# the subproject package.json.
#
# See jq docs for filter syntax: https://stedolan.github.io/jq/manual/.

.[0] as $root
| .[1] as $proj

# Get the fields from root package.json that should override the project
# package.json, i.e., every field except the following
| ($root
    | del(.bin, .description, .dependencies, .name, .main, .peerDependencies, .optionalDependencies, .typings, .version, .private, .workspaces, .resolutions, .scripts, .["ng-update"])
) as $root_overrides

# Use the project package.json as a base and override other fields from root
| $proj + $root_overrides

# Combine keywords from both
| .keywords = ($root.keywords + $proj.keywords | unique)

# Remove devDependencies
| del(.devDependencies)

# Add engines; versions substituted via pkg_npm
+ {"engines": {"node": "0.0.0-ENGINES-NODE", "npm": "0.0.0-ENGINES-NPM", "yarn": "0.0.0-ENGINES-YARN"}}