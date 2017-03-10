<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng build

## Overview
`ng build` compiles the application into an output directory

### Creating a build

```bash
ng build
```

The build artifacts will be stored in the `dist/` directory.

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

### Bundling

All builds make use of bundling, and using the `--prod` flag in  `ng build --prod`
or `ng serve --prod` will also make use of uglifying and tree-shaking functionality.

## Options
<details>
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

<details>
  <summary>environment</summary>
  <p>
    `--environment` (aliases: `-e`)
  </p>
  <p>
    Defines the build environment.
  </p>
</details>

<details>
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

<details>
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

<details>
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
    `--target` (aliases: `-t`, `-dev`, `-prod`) _default value: development_
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
