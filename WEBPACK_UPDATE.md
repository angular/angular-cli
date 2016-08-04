# Upgrading from angular-cli@1.0.0-beta.10 to the angular-cli@webpack

To update `angular-cli` to the webpack preview, you must update both the global package, project's local package and your project files.

## Global package:
```
npm uninstall -g angular-cli
npm cache clean
npm install -g angular-cli@webpack
```

## Local project package:
```
# commit any changes you have to git first
rm -rf node_modules dist tmp typings
npm install --save-dev angular-cli@webpack
```

IMPORTANT NOTE: 
Currently project generated with `ng new` will use a wrong local CLI version (see https://github.com/angular/angular-cli/issues/1528). After initializing your project, run `npm install --save-dev angular-cli@webpack` to set the correct version.

## Project files

You will need to run `ng init` to check for changes in all the auto-generated files created by `ng new` and allow you to update yours. You are offered four choices for each changed file: `y` (overwrite), `n` (don't overwrite), `d` (show diff between your file and the updated file) and `h` (help).

Carefully read the diffs for each code file, and either accept the changes or incorporate them manually after `ng init` finishes.

You can find a sample github diff of the changes introduced between a beta.10 and webpack preview project at https://github.com/filipesilva/angular-cli-webpack-upgrade/commit/HEAD.

Here is a summary of the file changes:

1. Updated files:
  * `./config/karma.conf.js` - `frameworks`/`plugins`/`files`/`exclude`/`preprocessors` entries changed, added `angularCliConfig` entry.
  * `./e2e/tsconfig.json` - property cleanup, changed `outdir`, added `typeRoots`
  * `./angular-cli.json` - updated version entry.
  * `./README.md` - updated version entry, removed route from generator list.
  * `./package.json` - removed typings postinstall script, removed `ember-cli-inject-live-reload`/`es6-shim`/`systemjs` dependencies, added `core-js`/`ts-helpers` dependencies, updated `angular-cli`/`codelyzer`/`ts-node`/`ts-lint`/`typescript` devDependencies, added `@types/jasmine`/`@types/protractor`/`karma-coverage` devDependencies.
  * `./src/app/app.component.ts` (and all other components) - removed `module.id`, sass/less/stylus preprocessing now uses the real extension in `styleUrls` instead of `.css`.
  * `./src/app/index.ts` - import adjusted due to environment files moving (see below).
  * `./src/index.html` - removed templating tags and `SystemJS` import script.
  * `./src/app/tsconfig.json` - property cleanup, changed `outdir`/`module`, added `libs`/`typeRoots`/`types`
  * `./src/typings.d.ts` - added `System`/`require` typings, removed `typings` ref
1. Mobile app updated files:
  * `./package.json` - local versions of `angular2-universal` now used by the build system, updated package versions.
  * `./src/index.html` - moved service worker code to build system, hardcoded icons.   
  * `./src/main-app-shell.ts` - reworked to interface with the build system, see comments in file.
1. New files:
  * `./src/polyfills.ts` - loads needed polyfills before main app
  * `./src/test.ts` - unit test spec loader
1. These files have moved to `./src/app/environments/`:
  * `./config/environment.dev.ts`
  * `./config/environment.prod.ts`
  * `./src/app/environment.ts`

Lastly, you can delete these files as they are not needed anymore.
  * `./config/karma-test-shim.js`
  * `./src/system-config.ts`
  * `./angular-cli-build.js`
  * `./typings.json`
  * `./.clang-format` (if present)