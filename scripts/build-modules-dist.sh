#!/usr/bin/env bash

source $(dirname $0)/package-builder.sh

# Build the npm packages into dist/modules-dist
buildTargetPackages "dist/modules-dist" "legacy" "Production"
