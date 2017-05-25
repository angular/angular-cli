#!/bin/sh

set -x

npm run build

npm publish --access public dist/express-engine
npm publish --access public dist/aspnetcore-engine
npm publish --access public dist/module-map-ngfactory-loader
npm publish --access public dist/hapi-engine

