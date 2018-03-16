#!/usr/bin/env bash

set -eo pipefail

rm -rf dist

yarn ngc -p modules/common/tsconfig.lib.json
cp modules/common/package.json dist/packages/common/package.json
cp modules/common/README.md dist/packages/common/README.md

yarn ngc -p modules/express-engine/tsconfig.fortokens.json
cp modules/express-engine/package.json dist/packages/express-engine/package.json
cp modules/express-engine/README.md dist/packages/express-engine/README.md

yarn ngc -p modules/aspnetcore-engine/tsconfig.fortokens.json
cp modules/aspnetcore-engine/package.json dist/packages/aspnetcore-engine/package.json
cp modules/aspnetcore-engine/README.md dist/packages/aspnetcore-engine/README.md

yarn ngc -p modules/hapi-engine/tsconfig.fortokens.json
cp modules/hapi-engine/package.json dist/packages/hapi-engine/package.json
cp modules/hapi-engine/README.md dist/packages/hapi-engine/README.md

yarn ngc -p modules/module-map-ngfactory-loader/tsconfig.lib.json
cp modules/module-map-ngfactory-loader/package.json dist/packages/module-map-ngfactory-loader/package.json
cp modules/module-map-ngfactory-loader/README.md dist/packages/module-map-ngfactory-loader/README.md
