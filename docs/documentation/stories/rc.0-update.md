# Angular CLI RC.0 migration guide

In this migration guide we'll be looking at some of the major changes to CLI projects in the
last two months.

Most of these changes were not breaking changes and your project should work fine without them.

But if you've been waiting for the perfect time to update, this is it!
Along with major rebuild speed increases, we've been busy adding a lot of features.

RC means release candidate and we intend to stick to it.
Unless there is a major breaking bug, we will not change the public surface of the API and
its generated projects.

This means that a project upgraded now should need no more code changes all the way to 1.0.

Documentation has also completely moved to [the wiki](https://github.com/angular/angular-cli/wiki).
The new [Stories](https://github.com/angular/angular-cli/wiki/stories) section covers common usage
scenarios, so be sure to have a look!

Below are the changes between a project generated two months ago, with `1.0.0-beta.24` and
a `1.0.0-rc.0` project.
If you kept your project up to date you might have a lot of these already.

You can find more details about changes between versions in [CHANGELOG.md](https://github.com/angular/angular-cli/blob/master/CHANGELOG.md).

If you prefer, you can also generate a new project in a separate folder using
 `ng new upgrade-project --skip-install` and compare the differences.

## @angular/cli

Angular CLI can now be found on NPM under `@angular/cli` instead of `angular-cli`, and has a
minimum requirement of Node 6.9.0 or higher, together with NPM 3 or higher.

If you're using Angular CLI `beta.28` or less, you need to uninstall the `angular-cli` package.
```bash
npm uninstall -g angular-cli
npm uninstall --save-dev angular-cli
```

To update Angular CLI to a new version, you must update both the global package and your project's
local package.

Global package:
```bash
npm uninstall -g @angular/cli
npm cache clean
npm install -g @angular/cli@latest
```

Local project package:
```bash
rm -rf node_modules dist # use rmdir on Windows
npm install --save-dev @angular/cli@latest
npm install
```

## .angular-cli.json

`angular-cli.json` is now `.angular-cli.json`, but we still accept the old config file name.

A few new properties have changed in it:

### Schema

Add the `$schema` property above project for handy IDE support on your config file:

```
"$schema": "./node_modules/@angular/cli/lib/config/schema.json",
```

### Polyfills

There is now a dedicated entry for polyfills ([#3812](https://github.com/angular/angular-cli/pull/3812))
inside `apps[0].polyfills`, between `main` and `test`:

```
"main": "main.ts",
"polyfills": "polyfills.ts",
"test": "test.ts",
```

Add it and remove `import './polyfills.ts';` from `src/main.ts` and `src/test.ts`.

We also added a lot of descriptive comments to the existing `src/polyfills.ts` file, explaining
which polyfills are needed for what browsers.
Be sure to check it out in a new project!

### Environments

A new `environmentSource` entry ([#4705](https://github.com/angular/angular-cli/pull/4705))
replaces the previous source entry inside environments.

To migrate angular-cli.json follow the example below:

Before:
```
"environments": {
  "source": "environments/environment.ts",
  "dev": "environments/environment.ts",
  "prod": "environments/environment.prod.ts"
}
```

After:

```
"environmentSource": "environments/environment.ts",
"environments": {
  "dev": "environments/environment.ts",
  "prod": "environments/environment.prod.ts"
}
```

### Linting

The CLI now uses the TSLint API ([#4248](https://github.com/angular/angular-cli/pull/4248))
to lint several TS projects at once.

There is a new `lint` entry in `.angular-cli.json` between `e2e` and `test` where all linting
targets are listed:

```
"e2e": {
  "protractor": {
    "config": "./protractor.conf.js"
  }
},
"lint": [
  {
    "project": "src/tsconfig.app.json"
  },
  {
    "project": "src/tsconfig.spec.json"
  },
  {
    "project": "e2e/tsconfig.e2e.json"
  }
],
"test": {
  "karma": {
    "config": "./karma.conf.js"
  }
},
```

### Generator defaults

Now you can list generator defaults per generator ([#4389](https://github.com/angular/angular-cli/pull/4389))
in `defaults`.

Instead of:
```
"defaults": {
  "styleExt": "css",
  "prefixInterfaces": false,
  "inline": {
    "style": false,
    "template": false
  },
  "spec": {
    "class": false,
    "component": true,
    "directive": true,
    "module": false,
    "pipe": true,
    "service": true
  }
}
```

You can instead list the flags as they appear on [the generator command](https://github.com/angular/angular-cli/wiki/generate-component):
```
"defaults": {
  "styleExt": "css",
  "component": {
    "inlineTemplate": false,
    "spec": true
  }
}
```

## One tsconfig per app

CLI projects now use one tsconfig per app ([#4924](https://github.com/angular/angular-cli/pull/4924)).

- `src/tsconfig.app.json`: configuration for the Angular app.
```
{
  "compilerOptions": {
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "lib": [
      "es2016",
      "dom"
    ],
    "outDir": "../out-tsc/app",
    "target": "es5",
    "module": "es2015",
    "baseUrl": "",
    "types": []
  },
  "exclude": [
    "test.ts",
    "**/*.spec.ts"
  ]
}
```
- `src/tsconfig.spec.json`: configuration for the unit tests.
```
{
  "compilerOptions": {
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "lib": [
      "es2016"
    ],
    "outDir": "../out-tsc/spec",
    "module": "commonjs",
    "target": "es6",
    "baseUrl": "",
    "types": [
      "jasmine",
      "node"
    ]
  },
  "files": [
    "test.ts"
  ],
  "include": [
    "**/*.spec.ts"
  ]
}
```
- `e2e/tsconfig.e2e.json`: configuration for the e2e tests.
```
{
  "compilerOptions": {
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "lib": [
      "es2016"
    ],
    "outDir": "../dist/out-tsc-e2e",
    "module": "commonjs",
    "target": "es6",
    "types":[
      "jasmine",
      "node"
    ]
  }
}
```

There is an additional root-level `tsconfig.json` that is used for IDE integration.
```
{
  "compileOnSave": false,
  "compilerOptions": {
    "outDir": "./dist/out-tsc",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "lib": [
      "es2016"
    ]
  }
}
```

You can delete `e2e/tsconfig.json` and `src/tsconfig.json` after adding these.

Also update `.angular-cli.json` to use them inside `apps[0]`:

```
"tsconfig": "tsconfig.app.json",
"testTsconfig": "tsconfig.spec.json",
```

Then update `protractor.conf.js` to use the e2e config as well:
```
beforeLaunch: function() {
  require('ts-node').register({
    project: 'e2e'
  });
},
```

## package.json

We've updated a lot of packages over the last months in order to keep projects up to date.

Additions or removals are found in bold below.

Packages in `dependencies`:
- `@angular/*` packages now have a `^2.4.0` minimum (`^3.4.0` for router)
- `core-js` remains unchanged at `^2.4.1`
- `rxjs` to `^5.1.0`
- `zone.js` to `^0.7.6`

Packages in `dependencies`:
- `@angular/cli` at `1.0.0-rc.0` replaces `angular-cli`
- `@angular/compiler-cli` is also at `^2.4.0`
- `@types/jasmine` remains unchanged and pinned at `2.5.38`
- `@types/node` was updated to `~6.0.60`
- `codelyzer` was updated to `~2.0.0`
- `jasmine-core` was updated to `~2.5.2`
- `jasmine-spec-reporter` was **removed**
- `karma` was updated to `~1.4.1`
- `karma-chrome-launcher` was updated to `~2.0.0`
- `karma-cli` was updated to `~1.0.1`
- `karma-jasmine` was updated to `~1.1.0`
- `karma-jasmine-html-reporter` was **added** at `^0.2.2`
- `karma-coverage-istanbul-reporter` was **added** at `^0.2.0`, replacing `karma-remap-istanbul`
- `karma-remap-istanbul` was **removed**
- `protractor` was updated to `~5.1.0`
- `ts-node` was updated to `~2.0.0`
- `tslint` was updated to `~4.4.2`
- `typescript` was updated to `~2.0.0`

See the [karma](#karma.conf.js) and [protractor](#protractor.conf.js) sections below for more
information on changed packages.

The [Linting rules](#Linting rules) section contains a list of rules that changed due to updates.

We also updated the scripts section to make it more simple:

```
"scripts": {
  "ng": "ng",
  "start": "ng serve",
  "test": "ng test",
  "lint": "ng lint",
  "e2e": "ng e2e"
},
```

## karma.conf.js

Karma configuration suffered some changes to improve the code-coverage functionality,
use the new `@angular/cli` package, and the new HTML reporter.

In the `frameworks` array update the CLI package to `@angular/cli`.

In the `plugins` array:
- add `require('karma-jasmine-html-reporter')` and `require('karma-coverage-istanbul-reporter')`
- remove `require('karma-remap-istanbul')`
- update the CLI plugin to `require('@angular/cli/plugins/karma')`

Add a new `client` option just above `patterns`:
```
client:{
  clearContext: false // leave Jasmine Spec Runner output visible in browser
},
files: [
```

Change the preprocessor to use the new CLI package:
```
preprocessors: {
  './src/test.ts': ['@angular/cli']
},
```

Replace `remapIstanbulReporter` with `coverageIstanbulReporter`:
```
coverageIstanbulReporter: {
  reports: [ 'html', 'lcovonly' ],
  fixWebpackSourcePaths: true
},
```

Remove the config entry from `angularCli`:
```
angularCli: {
  environment: 'dev'
},
```

Update the reporters to use `coverage-istanbul` instead of `karma-remap-istanbul`, and
add `kjhtml` (short for karma-jasmine-html-reporter):
```
reporters: config.angularCli && config.angularCli.codeCoverage
          ? ['progress', 'coverage-istanbul']
          : ['progress', 'kjhtml'],
```

## protractor.conf.js

Protractor was updated to the new 5.x major version, but you shouldn't need to change much
to take advantage of all its new features.

Replace the spec reporter import from:
```
var SpecReporter = require('jasmine-spec-reporter');
```
to
```
const { SpecReporter } = require('jasmine-spec-reporter');
```

Remove `useAllAngular2AppRoots: true`.

Update `beforeLaunch` as described in [One tsconfig per app](#one-tsconfig-per-app):
```
beforeLaunch: function() {
  require('ts-node').register({
    project: 'e2e'
  });
},
```

Update `onPrepare`:
```
onPrepare() {
  jasmine.getEnv().addReporter(new SpecReporter({ spec: { displayStacktrace: true } }));
}
```

## Linting rules

The updated versions of `tslint` and `codelyzer` contain a few rule changes that you should
apply to your `tslint.json`:

Add these new rules:
```
"callable-types": true,
"import-blacklist": [true, "rxjs"],
"import-spacing": true,
"interface-over-type-literal": true,
"no-empty-interface": true,
"no-string-throw": true,
"prefer-const": true,
"typeof-compare": true,
"unified-signatures": true,
```

Update `no-inferrable-types` to `"no-inferrable-types": [true, "ignore-params"]`.


