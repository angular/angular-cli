<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng build

## Overview
`ng build` compiles the application into an output directory

### Creating a build

```bash
ng build
```

The build artifacts will be stored in the `dist/` directory.

### Build Targets
There are two possible values for build target: **development** (default) and **production**.
`--dev` and `--prod` are shortcuts for `-target=development` and `-target=production` respectively.

Both build targets make use of bundling and limited tree-shaking.
Production build target applies the following settings in addition to that:
- Adds service worker if configured in `.angular-cli.json`.
- Replaces `process.env.NODE_ENV` in modules with the `production` value (this is needed for some libraries, like react).
- Runs UglifyJS on the code.

Beside that, target is a 'meta' flag and sets different default values for some other flags:

Flag                | development target | production target
---                 | ---                | ---
`--aot`             | `false`            | `true`
`--environment`     | `dev`              | `prod`
`--output-hashing`  | `media`            | `all`
`--sourcemaps`      | `true`             | `false`
`--extract-css`     | `false`            | `true`


### Environments
Environments are defined and mapped to environment definition files, inside `.angular-cli.json`:

```json
"environmentSource": "environments/environment.ts",
"environments": {
  "dev": "environments/environment.ts",
  "prod": "environments/environment.prod.ts"
}
```
Whenever you need environment in your code, you import **environmentSource** which is **environments/environment.ts** by default.
angular cli will merge it (override it) with the specified [***environment***](#user-content-environment) option during `ng build`.

As noted in [build targets](#build-targets), if you do not pass a value for [***environment***](#user-content-environment), it will default to dev for development target and prod for production.

So these are equivalent:
```bash
# most explicit version
ng build --target=production --environment=prod

# no environment specified, --target=production implies --environment=prod
ng build --target=production

# --prod is a shortcut for --target=production
ng build --prod
```

and so are these:
```bash
# most explicit version
ng build --target=development --environment=dev

# no environment specified, --target=development implies --environment=dev
ng build --target=development

# --prod is a shortcut for --target=development
ng build --dev

# default target is development
ng build
```

You can also add your own env files other than `dev` and `prod` by doing the following:
- create a `src/environments/environment.NAME.ts`
- add `{ "NAME": 'src/environments/environment.NAME.ts' }` to the `apps[0].environments` object in `.angular-cli.json`
- use them via the `--environment=NAME` flag on the build/serve commands.

Please note that `production` field inside default generated dev and prod environments has nothing to do with production build target. it's only a variable in the environment definition.

### Base tag handling in index.html

When building you can modify base tag (`<base href="/">`) in your index.html with `--base-href your-url` option.

```bash
# Sets base tag href to /myUrl/ in your index.html
ng build --base-href /myUrl/
ng build --bh /myUrl/
```

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
    <code>--environment</code> (aliases: <code>-e</code>, <code>`--env`</code>)
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
    <code>--target</code> (aliases: <code>-t</code>) <em>default value: development</em> <br />
    Shortcuts: <br/>
    `--dev` is equivalent to `--target=development` <br />
    `--prod` is equivalent to `--target=production`
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
