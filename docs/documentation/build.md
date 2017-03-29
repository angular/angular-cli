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

Production build target applies optimization techniques (uglification and tree-shaking) to the underlaying webpack bundle building. 
Beside that, each target introduces different default values for some of the build options:

- Default build options for **development** target:
  - [***environment***](#user-content-environment) (`--environment`): **dev**
  - [***output-hashing***](#user-content-output-hashing) (`--output-hashing`): **media**
  - [***sourcemaps***](#user-content-sourcemaps) (`--sourcemap`): true
  - [***extract-css***](#user-content-extract-css) (`--extract-css`) : false
  - [***aot***](#user-content-aot) (`--aot`): false
  
- Default build options for **production** target:
  - [***environment***](#user-content-environment) (`--environment`): **prod**
  - [***output-hashing***](#user-content-output-hashing) (`--output-hashing`): **all**
  - [***sourcemaps***](#user-content-sourcemaps) (`--sourcemap`): false
  - [***extract-css***](#user-content-extract-css) (`--extract-css`) : true
  - [***aot***](#user-content-aot) (`--aot`): true


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

### Bundling

All builds make use of bundling, and using the `--prod` flag in  `ng build --prod`
or `ng serve --prod` will also make use of uglifying and tree-shaking functionality.

## Options
<details id="aot">
  <summary>aot</summary>
  <p>
    `--aot` _default: false_
  </p>
  <p>
    Build using Ahead of Time compilation.
  </p>
</details>

<details>
  <summary>app</summary>
  <p>
    `--app` (aliases: `-a`)
  </p>
  <p>
    Specifies app name or index to use.
  </p>
</details>

<details>
  <summary>base-href</summary>
  <p>
    `--base-href` (aliases: `-bh`)
  </p>
  <p>
    Base url for the application being built.
  </p>
</details>

<details>
  <summary>deploy-url</summary>
  <p>
    `--deploy-url` (aliases: `-d`)
  </p>
  <p>
    URL where files will be deployed.
  </p>
</details>

<details>
  <summary>output-path</summary>
  <p>
    `--output-path` (aliases: `-op`)
  </p>
  <p>
    Path where output will be placed
  </p>
</details>

<details id='environment'>
  <summary>environment</summary>
  <p>
    `--environment` (aliases: `-e`, `--env`)
  </p>
  <p>
    Defines the build environment.
  </p>
</details>

<details id="extract-css">
  <summary>extract-css</summary>
  <p>
    `--extract-css` (aliases: `-ec`)
  </p>
  <p>
    Extract css from global styles onto css files instead of js ones.
  </p>
</details>

<details>
  <summary>i18n-file</summary>
  <p>
    `--i18n-file`
  </p>
  <p>
    Localization file to use for i18n.
  </p>
</details>

<details>
  <summary>i18n-format</summary>
  <p>
    `--i18n-format`
  </p>
  <p>
    Format of the localization file specified with --i18n-file.
  </p>
</details>

<details>
  <summary>locale</summary>
  <p>
    `--locale`
  </p>
  <p>
    Locale to use for i18n.
  </p>
</details>

<details id="output-hashing">
  <summary>output-hashing</summary>
  <p>
    `--output-hashing` (aliases: `-oh`)
  </p>
  <p>
    Define the output filename cache-busting hashing mode.
  </p>
  <p>
    Values: `none`, `all`, `media`, `bundles`
  </p>
</details>

<details>
  <summary>output-path</summary>
  <p>
    `--output-path` (aliases: `-op`)
  </p>
  <p>
    Path where output will be placed.
  </p>
</details>

<details>
  <summary>poll</summary>
  <p>
    `--poll`
  </p>
  <p>
    Enable and define the file watching poll time period (milliseconds).
  </p>
</details>

<details>
  <summary>progress</summary>
  <p>
    `--progress` (aliases: `-pr`) _default value: true_
  </p>
  <p>
    Log progress to the console while building.
  </p>
</details>

<details id="sourcemaps">
  <summary>sourcemap</summary>
  <p>
    `--sourcemap` (aliases: `-sm`, `sourcemaps`)
  </p>
  <p>
    Output sourcemaps.
  </p>
</details>

<details>
  <summary>stats-json</summary>
  <p>
    `--stats-json` (aliases: `-`)
  </p>
  <p>
    Generates a `stats.json` file which can be analyzed using tools such as: `webpack-bundle-analyzer` or https://webpack.github.io/analyse.
  </p>
</details>

<details>
  <summary>target</summary>
  <p>
    `--target` (aliases: `-t`) _default value: development_ <br />
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
    `--vendor-chunk` (aliases: `-vc`) _default value: true_
  </p>
  <p>
    Use a separate bundle containing only vendor libraries.
  </p>
</details>

<details>
  <summary>verbose</summary>
  <p>
    `--verbose` (aliases: `-v`) _default value: false_
  </p>
  <p>
    Adds more details to output logging.
  </p>
</details>

<details>
  <summary>watch</summary>
  <p>
    `--watch` (aliases: `-w`)
  </p>
  <p>
    Run build when files change.
  </p>
</details>
