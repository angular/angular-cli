# `/lib` Folder

This folder includes bootstrap code for the various tools included in this repository. Also
included is the packages meta-information package in `packages.ts`. This is used to read and
understand all the monorepo information (contained in the `.monorepo.json` file, and `package.json`
files across the repo).

`bootstrap-local.js` should be included when running files from this repository without compiling
first. It allows for compiling and loading packages in memory directly from the repo. Not only
does the `devkit-admin` scripts use this to include the library, but also all binaries linked
locally (like `schematics` and `ng`), when not using the npm published packages.
