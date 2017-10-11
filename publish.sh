#!/bin/sh

set -x

npm run build

npm publish --tag next --access public dist/common
npm publish --tag next --access public dist/express-engine
npm publish --tag next --access public dist/aspnetcore-engine
npm publish --tag next --access public dist/module-map-ngfactory-loader
npm publish --tag next --access public dist/hapi-engine

