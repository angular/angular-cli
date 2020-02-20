#!/usr/bin/env bash

source $(dirname $0)/scripts/package-builder.sh

readonly tag="$1"

if [[ $tag != 'latest' && $tag != 'next' ]]; then
  echo "Invalid tag: ${tag}. Must be either 'latest' or 'next'"
  exit 1
fi

# Build the npm packages
buildTargetPackages "dist/modules-dist" "legacy" "Production"

# Publish all packages to NPM
for target in $(getAllPackages); do
  echo "=============================================="
  echo "Publishing ${target}"
  echo "=============================================="
  ${bazel_bin} run --config=release "${target}.publish" -- \
    --access public --tag "${tag}"
done
