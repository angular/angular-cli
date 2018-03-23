#!/bin/sh

set -x

npm run build

npm publish --access public dist/releases/common
npm publish --access public dist/releases/express-engine
npm publish --access public dist/releases/aspnetcore-engine
npm publish --access public dist/releases/module-map-ngfactory-loader
npm publish --access public dist/releases/hapi-engine

