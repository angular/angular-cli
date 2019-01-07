**Documentation below is for CLI version 6 and we no longer accept PRs to improve this. For version 7 see [here](https://angular.io/guide/creating-libs)**.

# Library support in Angular CLI 6

Angular CLI v6 comes with library support via [ng-packagr](https://github.com/dherges/ng-packagr)
plugged into the build system we use in Angular CLI, together with schematics for generating a
library.


## Generating a library

You can create a library in a existing workspace by running the following commands:

```
ng generate library my-lib
```

You should now have a library inside `projects/my-lib`.
It contains a component and a service inside a NgModule.


## Building your library

You can build this library via `ng build my-lib`, and also unit test it and lint it by replacing
`build` with `test` or `lint`.

## Using your library inside your apps

Before you use your library, it's important to understand the mental model of how libraries are
used in general.

When you want to use a library from `npm`, you must:

- install the library into node_modules via `npm install library-name`
- import it in your application by name `import { something } from 'library-name';`

This works because importing a library in Angular CLI looks for a mapping between library name
and location on disk.

Angular CLI first looks in your tsconfig paths, then in the node_modules folder.

When you build your own libraries it doesn't go into node_modules so we use the tsconfig paths
to tell the build system where it is.
Generating a library automatically adds its path to the tsconfig file.

Using your own library follows a similar pattern:

- build the library via `ng build my-lib`
- import it in your application by name `import { something } from 'my-lib';`

It's important to note that your app can never use your library before it is built.

For instance, if you clone your git repository and run `npm install`, your editor will show
the `my-lib` imports as missing.
This is because you haven't yet built your library.

Another common problem is changes to your library not being reflected in your app.
This is often because your app is using an old build of your library.
If this happens just rebuild your library.


## Publishing your library

To publish your library follow these steps:

```
ng build my-lib
cd dist/my-lib
npm publish
```

If you've never published a package in npm before, you will need to create a user account.
You can read more about publishing on npm here:
https://docs.npmjs.com/getting-started/publishing-npm-packages


## Why do I need to build the library everytime I make changes?

Running `ng build my-lib` every time you change a file is bothersome and takes time.
In `Angular CLI` version `6.2` an incremental builds functionality has been added to improve the experience of library developers. 
Everytime a file is changed a partial build is performed that emits the amended files.

The feature can be using by passing `--watch` command argument as show below;

```bash
ng build my-lib --watch
```

Note: This feature requires that Angular's Compiler Option [enableResourceInlining](https://angular.io/guide/aot-compiler#enableresourceinlining) is enabled.
This can be done by adding the below in your `tsconfig.lib.json`.

```javascript
"angularCompilerOptions": {
    "enableResourceInlining": true,
    ...
}
```

## Note for upgraded projects

If you are using an upgraded project, there are some additional changes you have to make to support
monorepo (a workspace with multiple projects) setups:

- in `angular.json`, change the `outputPath` to `dist/project-name` for your app
- remove `baseUrl` in `src/tsconfig.app.json` and `src/tsconfig.spec.json`
- add `"baseUrl": "./"` in `./tsconfig.json`
- change any absolute path imports in your app to be absolute from the root (including `src/`),
or make them relative

This is necessary to support multiple projects in builds and in your editor.
New projects come with this configuration by default.