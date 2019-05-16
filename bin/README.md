# `/bin` Folder

This folder includes binaries that are linked when globally linking this repository.

Each file in this directory follows this pattern:

1. JavaScript only.
1. Requires `../lib/bootstrap-local.js` to bootstrap TypeScript and Node integration.
1. Requires `../lib/packages` and use the package metadata to find the binary script for the 
package the script is bootstrapping.
1. Call out main, or simply require the file if it has no export.

`devkit-admin` does not follow this pattern as it needs to setup logging and run some localized 
logic.

In order to add a new script, you should make sure it's in the root `package.json`, so people
linking this repo get a reference to the script.
