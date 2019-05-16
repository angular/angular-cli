<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->
**Documentation below is for CLI version 6 and we no longer accept PRs to improve this. For version 7 see [here](https://angular.io/cli/build)**.


# ng build

## Overview
`ng build` compiles the application into an output directory.

```bash
ng build [project]
```

### Creating a build

```bash
ng build
```

The build artifacts will be stored in the `dist/` directory.

All commands that build or serve your project, `ng build/serve/e2e`, will delete the output
directory (`dist/` by default).
This can be disabled via the `--delete-output-path=false` option.

### Base tag handling in index.html

When building you can modify base tag (`<base href="/">`) in your index.html with `--base-href your-url` option.

```bash
# Sets base tag href to /myUrl/ in your index.html
ng build --base-href /myUrl/
```

### Bundling & Tree-Shaking

All builds make use of bundling and limited tree-shaking, while `--prod` builds also run limited
dead code elimination via UglifyJS.

### `--build-optimizer` and `--vendor-chunk`

When using Build Optimizer the vendor chunk will be disabled by default.
You can override this with `--vendor-chunk=true`.

Total bundle sizes with Build Optimizer are smaller if there is no separate vendor chunk because
having vendor code in the same chunk as app code makes it possible for Uglify to remove more unused
code.

### CSS resources

Resources in CSS, such as images and fonts, will be copied over automatically as part of a build.
If a resource is less than 10kb it will also be inlined.

You'll see these resources be outputted and fingerprinted at the root of `dist/`.

### ES2015 support

To build in ES2015 mode, edit `./tsconfig.json` to use `"target": "es2015"` (instead of `es5`).

This will cause application TypeScript and Uglify be output as ES2015, and third party libraries
to be loaded through the `es2015` entry in `package.json` if available.

Be aware that JIT does not support ES2015 and so you should build/serve your app with `--aot`.
See https://github.com/angular/angular-cli/issues/7797 for details.

## Options
<details>
  <summary>prod</summary>
  <p>
    <code>--prod</code>
  </p>
  <p>
    Flag to set configuration to "prod".
  </p>
</details>
<details>
  <summary>configuration</summary>
  <p>
    <code>--configuration</code> (alias: <code>-c</code>)
  </p>
  <p>
    Specify the configuration to use.
  </p>
</details>
<details>
  <summary>main</summary>
  <p>
    <code>--main</code>
  </p>
  <p>
    The name of the main entry-point file.
  </p>
</details>
<details>
  <summary>polyfills</summary>
  <p>
    <code>--polyfills</code>
  </p>
  <p>
    The name of the polyfills file.
  </p>
</details>
<details>
  <summary>ts-config</summary>
  <p>
    <code>--ts-config</code>
  </p>
  <p>
    The name of the TypeScript configuration file.
  </p>
</details>
<details>
  <summary>optimization</summary>
  <p>
    <code>--optimization</code>
  </p>
  <p>
    Enables optimization of the build output.
  </p>
</details>
<details>
  <summary>output-path</summary>
  <p>
    <code>--output-path</code>
  </p>
  <p>
    Path where output will be placed.
  </p>
</details>
<details>
  <summary>aot</summary>
  <p>
    <code>--aot</code>
  </p>
  <p>
    Build using Ahead of Time compilation.
  </p>
</details>
<details>
  <summary>source-map</summary>
  <p>
    <code>--source-map</code>
  </p>
  <p>
    Output sourcemaps.
  </p>
</details>
<details>
  <summary>eval-source-map</summary>
  <p>
    <code>--eval-source-map</code>
  </p>
  <p>
    Output in-file eval sourcemaps.
  </p>
</details>
<details>
  <summary>vendor-source-map</summary>
  <p>
    <code>--vendor-source-map</code>
  </p>
  <p>
    Resolve vendor packages sourcemaps.
  </p>
</details>
<details>
  <summary>vendor-chunk</summary>
  <p>
    <code>--vendor-chunk</code>
  </p>
  <p>
    Use a separate bundle containing only vendor libraries.
  </p>
</details>
<details>
  <summary>common-chunk</summary>
  <p>
    <code>--common-chunk</code>
  </p>
  <p>
    Use a separate bundle containing code used across multiple bundles.
  </p>
</details>
<details>
  <summary>base-href</summary>
  <p>
    <code>--base-href</code>
  </p>
  <p>
    Base url for the application being built.
  </p>
</details>
<details>
  <summary>deploy-url</summary>
  <p>
    <code>--deploy-url</code>
  </p>
  <p>
    URL where files will be deployed.
  </p>
</details>
<details>
  <summary>verbose</summary>
  <p>
    <code>--verbose</code>
  </p>
  <p>
    Adds more details to output logging.
  </p>
</details>
<details>
  <summary>progress</summary>
  <p>
    <code>--progress</code>
  </p>
  <p>
    Log progress to the console while building.
  </p>
</details>
<details>
  <summary>i18n-file</summary>
  <p>
    <code>--i18n-file</code>
  </p>
  <p>
    Localization file to use for i18n.
  </p>
</details>
<details>
  <summary>i18n-format</summary>
  <p>
    <code>--i18n-format</code>
  </p>
  <p>
    Format of the localization file specified with --i18n-file.
  </p>
</details>
<details>
  <summary>i18n-locale</summary>
  <p>
    <code>--i18n-locale</code>
  </p>
  <p>
    Locale to use for i18n.
  </p>
</details>
<details>
  <summary>i18n-missing-translation</summary>
  <p>
    <code>--i18n-missing-translation</code>
  </p>
  <p>
    How to handle missing translations for i18n.
  </p>
</details>
<details>
  <summary>extract-css</summary>
  <p>
    <code>--extract-css</code>
  </p>
  <p>
    Extract css from global styles onto css files instead of js ones.
  </p>
</details>
<details>
  <summary>watch</summary>
  <p>
    <code>--watch</code>
  </p>
  <p>
    Run build when files change.
  </p>
</details>
<details>
  <summary>output-hashing</summary>
  <p>
    <code>--output-hashing</code>
  </p>
  <p>
    Define the output filename cache-busting hashing mode.
  </p>
</details>
<details>
  <summary>poll</summary>
  <p>
    <code>--poll</code>
  </p>
  <p>
    Enable and define the file watching poll time period in milliseconds.
  </p>
</details>
<details>
  <summary>delete-output-path</summary>
  <p>
    <code>--delete-output-path</code>
  </p>
  <p>
    Delete the output path before building.
  </p>
</details>
<details>
  <summary>preserve-symlinks</summary>
  <p>
    <code>--preserve-symlinks</code>
  </p>
  <p>
    Do not use the real path when resolving modules.
  </p>
</details>
<details>
  <summary>extract-licenses</summary>
  <p>
    <code>--extract-licenses</code>
  </p>
  <p>
    Extract all licenses in a separate file, in the case of production builds only.
  </p>
</details>
<details>
  <summary>show-circular-dependencies</summary>
  <p>
    <code>--show-circular-dependencies</code>
  </p>
  <p>
    Show circular dependency warnings on builds.
  </p>
</details>
<details>
  <summary>build-optimizer</summary>
  <p>
    <code>--build-optimizer</code>
  </p>
  <p>
    Enables @angular-devkit/build-optimizer optimizations when using the 'aot' option.
  </p>
</details>
<details>
  <summary>named-chunks</summary>
  <p>
    <code>--named-chunks</code>
  </p>
  <p>
    Use file name for lazy loaded chunks.
  </p>
</details>
<details>
  <summary>subresource-integrity</summary>
  <p>
    <code>--subresource-integrity</code>
  </p>
  <p>
    Enables the use of subresource integrity validation.
  </p>
</details>
<details>
  <summary>service-worker</summary>
  <p>
    <code>--service-worker</code>
  </p>
  <p>
    Generates a service worker config for production builds.
  </p>
</details>
<details>
  <summary>ngsw-config-path</summary>
  <p>
    <code>--ngsw-config-path</code>
  </p>
  <p>
    Path to ngsw-config.json.
  </p>
</details>
<details>
  <summary>skip-app-shell</summary>
  <p>
    <code>--skip-app-shell</code>
  </p>
  <p>
    Flag to prevent building an app shell.
  </p>
</details>
<details>
  <summary>index</summary>
  <p>
    <code>--index</code>
  </p>
  <p>
    The name of the index HTML file.
  </p>
</details>
<details>
  <summary>stats-json</summary>
  <p>
    <code>--stats-json</code>
  </p>
  <p>
    Generates a 'stats.json' file which can be analyzed using tools such as: #webpack-bundle-analyzer' or https://webpack.github.io/analyse.
  </p>
</details>
<details>
  <summary>fork-type-checker</summary>
  <p>
    <code>--fork-type-checker</code>
  </p>
  <p>
    Run the TypeScript type checker in a forked process.
  </p>
</details>
