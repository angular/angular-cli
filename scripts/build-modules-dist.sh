#!/usr/bin/env bash
# Build the dist/modules-dist directory in the same fashion as the legacy
# /build.sh script, by building the npm packages with Bazel and copying files.
# This is needed for scripts and tests which are not updated to the Bazel output
# layout (which always matches the input layout).
# Do not add new dependencies on this script, instead adapt scripts to use the
# new layout, and write new tests as Bazel targets.

set -u -e -o pipefail

cd "$(dirname "$0")"

# basedir is the workspace root
readonly basedir=$(pwd)/..

echo "##################################"
echo "scripts/build-modules-dist.sh:"
echo "  building @nguniversal/* npm packages"
echo "##################################"
# Ideally these integration tests should run under bazel, and just list the npm
# packages in their deps[].
# Until then, we have to manually run bazel first to create the npm packages we
# want to test.
bazel query --output=label 'kind(.*_package, //modules/...)' \
  | xargs bazel build
readonly bin=$(bazel info bazel-bin)

# Create the legacy dist/modules-dist folder
[ -d "${basedir}/dist/modules-dist" ] || mkdir -p $basedir/dist/modules-dist
# Each package is a subdirectory of bazel-bin/modules/
for pkg in $(ls ${bin}/modules); do
  # Skip any that don't have an "npm_package" target
  srcDir="${bin}/modules/${pkg}/npm_package"
  destDir="${basedir}/dist/modules-dist/${pkg}"
  if [ -d $srcDir ]; then
    echo "# Copy artifacts to ${destDir}"
    rm -rf $destDir
    cp -R $srcDir $destDir
    chmod -R u+w $destDir
  fi
done
