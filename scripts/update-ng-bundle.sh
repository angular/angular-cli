#!/bin/bash
echo ""
echo "updating scripts from angular/dist/bundle"

mkdir -p ./web_modules
# angular submodule

# cp -fR ./angular/dist/. ./web_modules/

# angular npm
mkdir -p ./web_modules/js/bundle
cp -fR ./node_modules/angular2/bundles/. ./web_modules/js/bundle

echo "done!"
echo ""
