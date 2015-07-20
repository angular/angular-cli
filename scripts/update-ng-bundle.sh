#!/bin/bash
echo ""
echo "updating scripts from angular/dist/bundle"

mkdir -p ./web_modules
mkdir -p ./web_modules/benchpress_bundle
cp -fR ./angular/dist/bundle/. ./web_modules/
cp -fR ./angular/dist/build/benchpress_bundle/. ./web_modules/benchpress_bundle

echo "done!"
echo ""
