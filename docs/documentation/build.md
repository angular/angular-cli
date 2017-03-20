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
`--aot` Build using Ahead of Time compilation.

`--app` Specifies app name or index to use.

`--base-href` (`-bh`) Base url for the application being built.

`--deploy-url` (`-d`) URL where files will be deployed.

`--dev` Build target and environment to development.

`--output-path` (`-op`) path where output will be placed

`--environment` (`-e`) Defines the build environment.

`--extract-css` (`-ec`) Extract css from global styles onto css files instead of js ones.

`--i18n-file` Localization file to use for i18n.

`--i18n-format` Format of the localization file specified with --i18n-file.

`--locale` Locale to use for i18n.

`--output-hashing` Define the output filename cache-busting hashing mode.

`--output-path` (`-op`) Path where output will be placed.

`--poll` Enable and define the file watching poll time period (milliseconds).

`--prod` Build target and environment to production.

`--progress` (`-pr`) Log progress to the console while building.

`--sourcemap` (`-sm`) Output sourcemaps.

`--stats-json` Generates a `stats.json` file which can be analyzed using tools such as: `webpack-bundle-analyzer` or https://webpack.github.io/analyse.

`--target` (`-t`) Defines the build target.

`--vendor-chunk` (`-vc`) Use a separate bundle containing only vendor libraries.

`--verbose` (`-v`) Adds more details to output logging.

`--watch` (`-w`) Run build when files change.
