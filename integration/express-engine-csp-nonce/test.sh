#!/usr/bin/env bash
set -o errexit -o nounset

# put node on the path
node_path=$(dirname "$1")
if [[ "$node_path" == external/* ]]; then
    node_path="${node_path:9}"
fi
PATH="$PWD/../$node_path:$PATH"

tmpdir=$(mktemp -d)

export CHROME_BIN="$PWD/$CHROME_BIN"
export CHROMEDRIVER_BIN="$PWD/$CHROMEDRIVER_BIN"

echo "Copying e2e test files to tmpdir sandbox $tmpdir"
mkdir -p "$tmpdir/integration/express-engine-csp-nonce"
rsync -a -L integration/express-engine-csp-nonce/ "$tmpdir/integration/express-engine-csp-nonce" --exclude node_modules
rsync -a ../npm/node_modules/ "$tmpdir/node_modules"
mkdir -p "$tmpdir/dist/modules-dist"
rsync -a -L modules/common/npm_package/ "$tmpdir/dist/modules-dist/common" --exclude node_modules
rsync -a -L modules/builders/npm_package/ "$tmpdir/dist/modules-dist/builders" --exclude node_modules
rsync -a -L modules/express-engine/npm_package/ "$tmpdir/dist/modules-dist/express-engine" --exclude node_modules

cd "$tmpdir/integration/express-engine-csp-nonce"

echo "Running e2e test yarn install"
yarn --mutex network cache clean @nguniversal/common
yarn --mutex network cache clean @nguniversal/builders
yarn --mutex network cache clean @nguniversal/express-engine
yarn --mutex network install

echo "Running e2e test"
yarn test
