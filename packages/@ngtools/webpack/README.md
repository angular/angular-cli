# Angular Ahead-of-Time Webpack Plugin

Webpack 4.0 plugin that AoT compiles your Angular components and modules.

## Usage

In your webpack config, add the following plugin and loader.

Angular version 5 and up, use `AngularCompilerPlugin`:

```typescript
import {AngularCompilerPlugin} from '@ngtools/webpack'

exports = { /* ... */
  module: {
    rules: [
      {
        test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
        loader: '@ngtools/webpack'
      }
    ]
  },

  plugins: [
    new AngularCompilerPlugin({
      tsConfigPath: 'path/to/tsconfig.json',
      entryModule: 'path/to/app.module#AppModule',
      sourceMap: true
    })
  ]
}
```

The loader works with webpack plugin to compile your TypeScript. It's important to include both, and to not include any other TypeScript compiler loader.

## Options

* `tsConfigPath`. The path to the `tsconfig.json` file. This is required. In your `tsconfig.json`, you can pass options to the Angular Compiler with `angularCompilerOptions`.
* `basePath`. Optional. The root to use by the compiler to resolve file paths. By default, use the `tsConfigPath` root.
* `entryModule`. Optional if specified in `angularCompilerOptions`. The path and classname of the main application module. This follows the format `path/to/file#ClassName`.
* `mainPath`. Optional if `entryModule` is specified. The `main.ts` file containing the bootstrap code. The plugin will use AST to determine the `entryModule`.
* `skipCodeGeneration`. Optional, defaults to false. Disable code generation and do not refactor the code to bootstrap. This replaces `templateUrl: "string"` with `template: require("string")` (and similar for styles) to allow for webpack to properly link the resources.
* `sourceMap`. Optional. Include sourcemaps.
* `compilerOptions`. Optional. Override options in `tsconfig.json`.

## Features
The benefits and ability of using [`@ngtools/webpack`](https://www.npmjs.com/~ngtools) standalone from the Angular CLI as presented in [Stephen Fluin's Angular CLI talk](https://youtu.be/uBRK6cTr4Vk?t=6m45s) at Angular Connect 2016:

* Compiles SCSS/LESS
* TypeScript transpilation
* Bundles JavaScript, CSS
* Asset optimization
* Virtual filesystem for assets
 * For serving local assets and compile versions.
* Live-reload via websockets
* Code splitting
 * Recognizing the use of `loadChildren` in the router, and bundling those modules separately so that any dependencies of those modules are not going to be loaded as part of your main bundle. These separate bundles will be pulled out of the critical path of your application, making your total application bundle much smaller and loading it much more performant.
