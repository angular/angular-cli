# TypeScript Third-Party Dependency

This directory provides a local target for the `typescript` package files used by Angular schematics.

Rather than checking in the TypeScript source files directly (vendoring), this directory uses a Bazel `genrule` to copy the required files directly from the repository's root `node_modules/typescript` to reduce the size of the installation.
