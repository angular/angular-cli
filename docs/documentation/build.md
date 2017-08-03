<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng build

## Overview
`ng build` compiles the application into an output directory

### Creating a build

```bash
ng build
```

The build artifacts will be stored in the `dist/` directory.

All commands that build or serve your project, `ng build/serve/e2e`, will delete the output
directory (`dist/` by default).
This can be disabled via the `--no-delete-output-path` (or `--delete-output-path=false`) flag.

### Build Targets and Environment Files

`ng build` can specify both a build target (`--target=production` or `--target=development`) and an
environment file to be used with that build (`--environment=dev` or `--environment=prod`).
By default, the development build target and environment are used.

The mapping used to determine which environment file is used can be found in `.angular-cli.json`:

```json
"environmentSource": "environments/environment.ts",
"environments": {
  "dev": "environments/environment.ts",
  "prod": "environments/environment.prod.ts"
}
```

These options also apply to the serve command. If you do not pass a value for `environment`,
it will default to `dev` for `development` and `prod` for `production`.

```bash
# these are equivalent
ng build --target=production --environment=prod
ng build --prod --env=prod
ng build --prod
# and so are these
ng build --target=development --environment=dev
ng build --dev --e=dev
ng build --dev
ng build
```

You can also add your own env files other than `dev` and `prod` by doing the following:
- create a `src/environments/environment.NAME.ts`
- add `{ "NAME": 'src/environments/environment.NAME.ts' }` to the `apps[0].environments` object in `.angular-cli.json`
- use them via the `--env=NAME` flag on the build/serve commands.

### Base tag handling in index.html

When building you can modify base tag (`<base href="/">`) in your index.html with `--base-href your-url` option.

```bash
# Sets base tag href to /myUrl/ in your index.html
ng build --base-href /myUrl/
ng build --bh /myUrl/
```

### Bundling & Tree-Shaking

All builds make use of bundling and limited tree-shaking, while `--prod` builds also run limited
dead code elimination via UglifyJS.

### `--dev` vs `--prod` builds

Both `--dev`/`--target=development` and `--prod`/`--target=production` are 'meta' flags, that set other flags.
If you do not specify either you will get the `--dev` defaults.

Flag                | `--dev` | `--prod`
---                 | ---     | ---
`--aot`             | `false` | `true`
`--environment`     | `dev`   | `prod`
`--output-hashing`  | `media` | `all`
`--sourcemaps`      | `true`  | `false`
`--extract-css`     | `false` | `true`
`--named-chunks`    | `true`  | `false`

`--extract-licenses` Extract all licenses in a separate file, in the case of production builds only.
`--i18n-file` Localization file to use for i18n.
`--prod` also sets the following non-flaggable settings:
- Adds service worker if configured in `.angular-cli.json`.
- Replaces `process.env.NODE_ENV` in modules with the `production` value (this is needed for some libraries, like react).
- Runs UglifyJS on the code.

### CSS resources

Resources in CSS, such as images and fonts, will be copied over automatically as part of a build.
If a resource is less than 10kb it will also be inlined.

You'll see these resources be outputted and fingerprinted at the root of `dist/`.

### Service Worker

There is experimental service worker support for production builds available in the CLI.
To enable it, run the following commands:
```
npm install @angular/service-worker --save
ng set apps.0.serviceWorker=true
```

On `--prod` builds a service worker manifest will be created and loaded automatically.
Remember to disable the service worker while developing to avoid stale code.

Note: service worker support is experimental and subject to change.

## Options
<details>
  <summary>aot</summary>
  <p>
    <code>--aot</code> <em>default value: false</em>
  </p>
  <p>
    Build using Ahead of Time compilation.
  </p>
</details>

<details>
  <summary>app</summary>
  <p>
    <code>--app</code> (aliases: <code>-a</code>)
  </p>
  <p>
    Specifies app name or index to use.
  </p>
</details>

<details>
  <summary>base-href</summary>
  <p>
    <code>--base-href</code> (aliases: <code>-bh</code>)
  </p>
  <p>
    Base url for the application being built.
  </p>
</details>

<details>
  <summary>deploy-url</summary>
  <p>
    <code>--deploy-url</code> (aliases: <code>-d</code>)
  </p>
  <p>
    URL where files will be deployed.
  </p>
</details>

<details>
  <summary>environment</summary>
  <p>
    <code>--environment</code> (aliases: <code>-e</code>)
  </p>
  <p>
    Defines the build environment.
  </p>
</details>

<details>
  <summary>extract-css</summary>
  <p>
    <code>--extract-css</code> (aliases: <code>-ec</code>)
  </p>
  <p>
    Extract css from global styles onto css files instead of js ones.
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
  <summary>locale</summary>
  <p>
    <code>--locale</code>
  </p>
  <p>
    Locale to use for i18n.
  </p>
</details>

<details>
  <summary>output-hashing</summary>
  <p>
    <code>--output-hashing</code> (aliases: <code>-oh</code>)
  </p>
  <p>
    Define the output filename cache-busting hashing mode.
  </p>
  <p>
    Values: <code>none</code>, <code>all</code>, <code>media</code>, <code>bundles</code>
  </p>
</details>

<details>
  <summary>output-path</summary>
  <p>
    <code>--output-path</code> (aliases: <code>-op</code>)
  </p>
  <p>
    Path where output will be placed.
  </p>
</details>

<details>
  <summary>delete-output-path</summary>
  <p>
    <code>--delete-output-path</code> (aliases: <code>-dop</code>) <em>default value: true</<em>
  </p>
  <p>
    Delete the output-path directory.
  </p>
</details>

<details>
  <summary>poll</summary>
  <p>
    <code>--poll</code>
  </p>
  <p>
    Enable and define the file watching poll time period (milliseconds).
  </p>
</details>

<details>
  <summary>progress</summary>
  <p>
    <code>--progress</code> (aliases: <code>-pr</code>) <em>default value: true</<em>
  </p>
  <p>
    Log progress to the console while building.
  </p>
</details>

<details>
  <summary>sourcemap</summary>
  <p>
    <code>--sourcemap</code> (aliases: <code>-sm</code>, <code>sourcemaps</code>)
  </p>
  <p>
    Output sourcemaps.
  </p>
</details>

<details>
  <summary>stats-json</summary>
  <p>
    <code>--stats-json</code>
  </p>
  <p>
    Generates a <code>stats.json</code> file which can be analyzed using tools such as: <code>webpack-bundle-analyzer</code> or https://webpack.github.io/analyse.
  </p>
</details>

<details>
  <summary>target</summary>
  <p>
    <code>--target</code> (aliases: <code>-t</code>, <code>-dev</code>, <code>-prod</code>) <em>default value: development</em>
  </p>
  <p>
    Defines the build target.
  </p>
</details>

<details>
  <summary>vendor-chunk</summary>
  <p>
    <code>--vendor-chunk</code> (aliases: <code>-vc</code>) <em>default value: true</em>
  </p>
  <p>
    Use a separate bundle containing only vendor libraries.
  </p>
</details>

<details>
  <summary>common-chunk</summary>
  <p>
    <code>--common-chunk</code> (aliases: <code>-cc</code>) <em>default value: true</em>
  </p>
  <p>
    Use a separate bundle containing code used across multiple bundles.
  </p>
</details>

<details>
  <summary>verbose</summary>
  <p>
    <code>--verbose</code> (aliases: <code>-v</code>) <em>default value: false</em>
  </p>
  <p>
    Adds more details to output logging.
  </p>
</details>

<details>
  <summary>watch</summary>
  <p>
    <code>--watch</code> (aliases: <code>-w</code>)
  </p>
  <p>
    Run build when files change.
  </p>
</details>

<details>
  <summary>show-circular-dependencies</summary>
  <p>
    <code>--show-circular-dependencies</code> (aliases: <code>-scd</code>)
  </p>
  <p>
    Show circular dependency warnings on builds.
  </p>
</details>

<details>
  <summary>build-optimizer</summary>
  <p>
    <code>--build-optimizer</code> (aliases: <code>-bo</code>)
  </p>
  <p>
    (Experimental) Enables @angular-devkit/build-optimizer optimizations when using `--aot`.
  </p>
</details>

<details>
  <summary>named-chunks</summary>
  <p>
    <code>--named-chunks</code> (aliases: <code>-nm</code>)
  </p>
  <p>
    Use file name for lazy loaded chunks.
  </p>
</details>
