# Linked libraries

While working on a library, it is common to use [npm link](https://docs.npmjs.com/cli/link) to
avoid reinstalling the library on every build.

While this is very useful there are a few caveats to keep in mind.

## The library needs to be AOT compatible

Angular CLI does static analysis even without the `--aot` flag in order to detect lazy-loade routes.
If your library is not AOT compatible, you will likely get a static analysis error.

## The library still needs to be rebuilt on every change

Angular libraries are usually built using TypeScript and thus require to be built before they
are published.
For simple cases, a linked library might work even without a build step, but this is the exception
rather than the norm.

If a library is not being built using its own build step, then it is being compiled by the
Angular CLI build system and there is no guarantee that it will be correctly built.
Even if it works on development it might not work when deployed.

When linking a library remember to have your build step running in watch mode and the library's
`package.json` pointing at the correct entry points (e.g. 'main' should point at a `.js` file, not
a `.ts` file).

## Use TypesScript path mapping for Peer Dependencies

Angular libraries should list all `@angular/*` dependencies as
[Peer Dependencies](https://nodejs.org/en/blog/npm/peer-dependencies/).
This insures that, when modules ask for Angular, they all get the exact same module.
If a library lists `@angular/core` in `dependencies` instead of `peerDependencies` then it might
get a *different* Angular module instead, which will cause your application to break.

While developing a library, you'll need to have all of your peer dependencies also installed
via `devDependencies` - otherwise you could not compile.
A linked library will then have it's own set of Angular libraries that it is using for building,
located in it's `node_modules` folder.
This can cause problems while building or running your application.

To get around this problem you can use the TypeScript
[path mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping).
With it, you can tell TypeScript that it should load some modules from a specific location.

You should list all the peer dependencies that your library uses in `./tsconfig.json`, pointing
them at the local copy in the apps `node_modules` folder.
This ensures that you all will always load the local copies of the modules your library asks for.

```
{
  "compilerOptions": {
    // ...
    // Note: these paths are relative to `baseUrl` path.
    "paths": {
      "@angular/*": [
        "../node_modules/@angular/*"
      ]
    }
  }
}
```