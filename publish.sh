#!/bin/sh

set -x

npm run build

npm publish --access public dist/ng-express-engine
