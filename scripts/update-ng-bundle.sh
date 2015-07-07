#!/bin/bash
echo ""
echo "updating scripts from angular/dist/bundle"

mkdir -p ./web_modules
cp -R ./angular/dist/bundle/. ./web_modules/

echo "done!"
echo ""
