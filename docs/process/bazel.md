## Yarn Workspaces

The package architecture of `angular-cli` repository is originally setup using
yarn [workspaces](https://yarnpkg.com/lang/en/docs/workspaces/). This means the
dependencies of various `package.json` in the repository are linked and
installed together.

## Bazel

Since then, Bazel was introduced to manage some of the build dependencies in
`angular-cli` repo. However, Bazel does **not** yet support yarn workspaces,
since it requires laying out more than one `node_modules` directory. In this
mixed mode, developers ought to take extra care to synchronize the dependencies.

Since the `yarn_install` rule that installs all NPM dependencies in this
repository only reads from the **root** `package.json`, every Bazel target that
depends on packages downloaded from the NPM registry will need to have the
dependency declared in the **root** `package.json`.

In addition, if the dependency is also needed at runtime (non-dev dependencies),
the dependency on the individual package's `package.json` has to be updated as
well. This is to ensure that when users download a published version from NPM,
they will be able to install all dependencies correctly without Bazel. It is the
responsibility of the developer to keep both `package.json` in sync.

## Windows support

In general, any sort of node file lookup on Bazel should be subject to `require.resolve`.
This is how rules_nodejs resolves paths using the Bazel runfiles mechanism, where a given
Bazel target only has access to outputs from its dependencies.

In practice, this does not make a lot of difference on Linux.
A symlink forest is laid down where the target is going to actually run, and mostly the
files are resolved correctly whether you use `require.resolve` or not because the files are there.

On Windows though, that's a stricter. Bazel does not lay down a symlink forest on
windows by default. If you don't use `require.resolve`, it's still possible to correctly
resolve some files, like outputs from other rules. But other files, like node modules
dependencies and data files, need to be looked up in the runfiles.

Since the requirement is quite lax on Linux but quite strict on windows, what ends up
happening is that lack of `require.resolve` calls go unnoticed until someone tries to run
things on Windows, at which point it breaks.

## Issues

1. Yarn workspaces is not compatible with Bazel-managed deps
   [(#12736)](https://github.com/angular/angular-cli/issues/12736)

