#!/usr/bin/env bash

set -u -e -o pipefail

# see https://circleci.com/docs/2.0/env-vars/#circleci-built-in-environment-variables
CI=${CI:-false}

cd "$(dirname "$0")"

# basedir is the workspace root
readonly basedir=$(pwd)/..

# Track payload size functions
if [$CI != true]; then
  # Not on CircleCI so let's build the packages-dist directory.
  # This should be fast on incremental re-build.
  ${basedir}/scripts/build-modules-dist.sh
fi

# Workaround https://github.com/yarnpkg/yarn/issues/2165
# Yarn will cache file://dist URIs and not update Angular code
readonly cache=.yarn_local_cache
function rm_cache {
  rm -rf $cache
}
rm_cache
mkdir $cache
trap rm_cache EXIT

for testDir in $(ls | grep -v node_modules) ; do
  [[ -d "$testDir" ]] || continue
  echo "#################################"
  echo "Running integration test $testDir"
  echo "#################################"
  (
    cd $testDir
    rm -rf dist

    yarn install --cache-folder ../$cache
    yarn test || exit 1

    # remove the temporary node modules directory to keep the source folder clean.
    rm -rf node_modules
  )
done
