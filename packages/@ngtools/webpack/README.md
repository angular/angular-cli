# Angular Ahead-of-Time Webpack Plugin

Webpack plugin that AoT compiles your Angular components and modules.

## Usage
In your webpack config, add the following plugin and loader:

```typescript
import {AotPlugin} from '@ngtools/webpack'

exports = { /* ... */
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: '@ngtools/webpack',
      }
    ]
  },

  plugins: [
    new AotPlugin({
      tsConfigPath: 'path/to/tsconfig.json',
      entryModule: 'path/to/app.module#AppModule'
    })
  ]
}
```

The loader works with the webpack plugin to compile your TypeScript. It's important to include both, and to not include any other TypeScript compiler loader.

## Options

* `tsConfigPath`. The path to the `tsconfig.json` file. This is required. In your `tsconfig.json`, you can pass options to the Angular Compiler with `angularCompilerOptions`.
* `basePath`. Optional. The root to use by the compiler to resolve file paths. By default, use the `tsConfigPath` root.
* `entryModule`. Optional if specified in `angularCompilerOptions`. The path and classname of the main application module. This follows the format `path/to/file#ClassName`.
* `mainPath`. Optional if `entryModule` is specified. The `main.ts` file containing the bootstrap code. The plugin will use AST to determine the `entryModule`.
* `skipCodeGeneration`. Optional, defaults to false. Disable code generation and do not refactor the code to bootstrap. This replaces `templateUrl: "string"` with `template: require("string")` (and similar for styles) to allow for webpack to properly link the resources.
* `typeChecking`. Optional, defaults to true. Enable type checking through your application. This will slow down compilation, but show syntactic and semantic errors in webpack.
