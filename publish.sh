#!/bin/sh

set -x

./build.sh

npm publish --access public dist/packages/common
npm publish --access public dist/packages/express-engine
npm publish --access public dist/packages/aspnetcore-engine
npm publish --access public dist/packages/module-map-ngfactory-loader
npm publish --access public dist/packages/hapi-engine

