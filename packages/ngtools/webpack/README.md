# Angular Compiler Webpack Plugin

Webpack 5.x plugin for the Angular Ahead-of-Time compiler. The plugin also supports Angular JIT mode.

## Usage

In your webpack config, add the following plugin and loader.

```typescript
import { AngularWebpackPlugin } from '@ngtools/webpack';

exports = {
  /* ... */
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        loader: '@ngtools/webpack',
      },
    ],
  },

  plugins: [
    new AngularWebpackPlugin({
      tsconfig: 'path/to/tsconfig.json',
    }),
  ],
};
```

The loader works with webpack plugin to compile the application's TypeScript. It is important to include both, and to not include any other TypeScript loader.

## Options

- `tsconfig` [default: `tsconfig.json`] - The path to the application's TypeScript Configuration file. In the `tsconfig.json`, you can pass options to the Angular Compiler with `angularCompilerOptions`. Relative paths will be resolved from the Webpack compilation's context.
- `compilerOptions` [default: none] - Overrides options in the application's TypeScript Configuration file (`tsconfig.json`).
- `jitMode` [default: `false`] - Enables JIT compilation and do not refactor the code to bootstrap. This replaces `templateUrl: "string"` with `template: require("string")` (and similar for styles) to allow for webpack to properly link the resources.
- `directTemplateLoading` [default: `true`] - Causes the plugin to load component templates (HTML) directly from the filesystem. This is more efficient if only using the `raw-loader` to load component templates. Do not enable this option if additional loaders are configured for component templates.
- `fileReplacements` [default: none] - Allows replacing TypeScript files with other TypeScript files in the build. This option acts on fully resolved file paths.
- `inlineStyleFileExtension` [default: none] - When set inline component styles will be processed by Webpack as files with the provided extension.
