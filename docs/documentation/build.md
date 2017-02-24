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
`--watch` (`-w`) rebuild when files change

`--target` (`-t`) define the build target

`--environment` (`-e`) defines the build environment

`--prod` flag to set build target and environment to production

`--dev` flag to set build target and environment to development

`--output-path` (`-po`) path where output will be placed

`--aot` flag whether to build using Ahead of Time compilation

`--sourcemap` (`-sm`) output sourcemaps

`--vendor-chunk` (`-vb`) use a separate bundle containing only vendor libraries

`--base-href` (`-bh`) base url for the application being built

`--deploy-url` (`-d`) url where files will be deployed

`--verbose` (`-v`) adds more details to output logging

`--progress` (`-pr`) log progress to the console while building

`--extract-css` (`-ec`) extract css from global styles onto css files instead of js ones

`--output-hashing` define the output filename cache-busting hashing mode

`--stats-json` generates a `stats.json` file which can be analyzed using tools such as: `webpack-bundle-analyzer` or https://webpack.github.io/analyse

`--poll` enable and define the file watching poll time period (milliseconds)
