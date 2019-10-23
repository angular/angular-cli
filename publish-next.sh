
#!/usr/bin/env bash

set -u -e -o pipefail

# Use for BETA and RC releases
# Query Bazel for npm_package and ng_package rules
# Publish them to npm (tagged next)

# query for all npm packages to be released as part of the framework release
NPM_PACKAGE_LABELS=`bazel query --output=label 'attr("tags", "\[.*release.*\]", //modules/...) intersect kind(".*_package", //modules/...)'`
# build all npm packages in parallel
bazel build --config=release $NPM_PACKAGE_LABELS

# publish all packages in sequence to make it easier to spot any errors or warnings
for packageLabel in $NPM_PACKAGE_LABELS; do
  echo "publishing $packageLabel"
  bazel run --config=release -- ${packageLabel}.publish --access public --tag next
done
