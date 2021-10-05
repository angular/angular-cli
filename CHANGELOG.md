<a name="13.0.0-next.8"></a>

# 13.0.0-next.8 (2021-10-05)

## Breaking Changes

### @angular-devkit/build-angular

- With this change a number of deprecated dev-server builder options which proxied to the browser builder have been removed. These options should be configured in the browser builder instead.

The removed options are:

- `aot`
- `sourceMap`
- `deployUrl`
- `baseHref`
- `vendorChunk`
- `commonChunk`
- `optimization`
- `progress`

### @angular/cli

| Commit                                                                                              | Type | Description                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| [e1b954d70](https://github.com/angular/angular-cli/commit/e1b954d707f90622d8a75fc45840cefeb224c286) | fix  | keep relative migration paths during update analysis |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------- |
| [22cd9edfa](https://github.com/angular/angular-cli/commit/22cd9edfafd357bb9d62a93dd56f033b3f34bbe8) | feat | favor es2020 main fields                        |
| [000b0e51c](https://github.com/angular/angular-cli/commit/000b0e51c166ecd26b6f24d6a133ea5076df9849) | feat | remove deprecated dev-server options            |
| [4be6537dd](https://github.com/angular/angular-cli/commit/4be6537ddf4b32e8d204dbaa75f1a53712fe9d44) | fix  | update TS/JS regexp checks to latest extensions |

## Special Thanks

Alan Agius, Charles Lyding and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.8"></a>

# 12.2.8 (2021-10-01)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [821a1b5a9](https://github.com/angular/angular-cli/commit/821a1b5a949d53f2e82f734062b711a166d42e24) | fix  | babel adjust enum plugin incorrectly transforming loose enums |

## Special Thanks

Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.0-next.7"></a>

# 13.0.0-next.7 (2021-09-30)

## Breaking Changes

### @angular-devkit/build-angular

- TypeScript versions prior to 4.4 are no longer supported.

### @schematics/angular

| Commit                                                                                              | Type | Description                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------- |
| [7bdcd7da1](https://github.com/angular/angular-cli/commit/7bdcd7da1ff3a31f4958d90d856beb297e99b187) | feat | create new projects with rxjs 7 |

### @angular/cli

| Commit                                                                                              | Type | Description                        |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------- |
| [c3acf3cc2](https://github.com/angular/angular-cli/commit/c3acf3cc26b9e37a3b8f4c369f42731f46b522ee) | fix  | remove unused cli project options. |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| [fb1ad7c5b](https://github.com/angular/angular-cli/commit/fb1ad7c5b3fa3df85f1d3dff3850e1ad0003ef9d) | feat | support ESM proxy configuration files for the dev server                      |
| [505438cc4](https://github.com/angular/angular-cli/commit/505438cc4146b1950038531ce30e1f62f7c41d00) | feat | support TypeScript 4.4                                                        |
| [0e7277c63](https://github.com/angular/angular-cli/commit/0e7277c63a5fb76d9686289b779561c84c040ba0) | fix  | babel adjust enum plugin incorrectly transforming loose enums                 |
| [f383f3201](https://github.com/angular/angular-cli/commit/f383f3201b69d28f8755c0bd63134619f9da408d) | fix  | ESM-interop loaded plugin creators of `@angular/localize/tools` not respected |
| [884111ac0](https://github.com/angular/angular-cli/commit/884111ac0b8a73dca06d844b2ed795a3e3ed3289) | fix  | update IE unsupported and deprecation messages                                |
| [13cceab8e](https://github.com/angular/angular-cli/commit/13cceab8e737a12d0809f184f852ceb5620d81fb) | fix  | use URLs for absolute import paths with ESM                                   |
| [4e0743c8a](https://github.com/angular/angular-cli/commit/4e0743c8ad5879f212f2ea232ac9492848a8df2c) | perf | change webpack hashing function to `xxhash64`                                 |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.0-next.6"></a>

# 13.0.0-next.6 (2021-09-22)

## Breaking Changes

### @ngtools/webpack

- Applications directly using the `webpack-cli` and not the Angular CLI to build must set the environment variable `DISABLE_V8_COMPILE_CACHE=1`. The `@ngtools/webpack` package now uses dynamic imports to provide support for the ESM `@angular/compiler-cli` package. The `v8-compile-cache` package used by the `webpack-cli` does not currently support dynamic import expressions and will cause builds to fail if the environment variable is not specified. Applications using the Angular CLI are not affected by this limitation.

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                   |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------- |
| [0d76bf04b](https://github.com/angular/angular-cli/commit/0d76bf04bca6e083865972b5398a32bbe9396e14) | fix  | support WASM-based esbuild optimizer fallback |

### @angular-devkit/build-webpack

| Commit                                                                                              | Type | Description                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------ |
| [9efcb32e3](https://github.com/angular/angular-cli/commit/9efcb32e378442714eae4caec43281123c5e30f6) | fix  | better handle concurrent dev-servers |

### @ngtools/webpack

| Commit                                                                                              | Type     | Description                                         |
| --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| [7d98ab3df](https://github.com/angular/angular-cli/commit/7d98ab3df9f7c15612c69cedca5a01a535301508) | refactor | support an ESM-only `@angular/compiler-cli` package |

## Special Thanks

Alan Agius and Charles Lyding

<a name="12.2.7"></a>

# 12.2.7 (2021-09-22)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                   |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------- |
| [d856b4d23](https://github.com/angular/angular-cli/commit/d856b4d2369bea76ce65fc5f6d1585145ad41618) | fix  | support WASM-based esbuild optimizer fallback |

## Special Thanks

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.0-next.5"></a>

# 13.0.0-next.5 (2021-09-15)

### @angular/cli

| Commit                                                                                              | Type | Description                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| [d3fa202e9](https://github.com/angular/angular-cli/commit/d3fa202e9a26926f0660b1e1f156012ea41b1711) | fix  | handle `FORCE_COLOR` when stdout is not instance of `WriteStream` |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| [590c15664](https://github.com/angular/angular-cli/commit/590c15664282e6d80bb655191272ab2be1f2e399) | fix  | add web-streams-polyfill to downlevel exclusion list              |
| [df8f909d8](https://github.com/angular/angular-cli/commit/df8f909d80ca787e24cb040f9ee2517bf050c20b) | fix  | handle `FORCE_COLOR` when stdout is not instance of `WriteStream` |

## Special Thanks

Alan Agius, Charles Lyding and Joey Perrott

<a name="12.2.6"></a>

# 12.2.6 (2021-09-15)

### @angular/cli

| Commit                                                                                              | Type | Description                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| [8b21effad](https://github.com/angular/angular-cli/commit/8b21effad673877cf1a82ef7d0601393a65517fb) | fix  | handle `FORCE_COLOR` when stdout is not instance of `WriteStream` |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| [ea60f0f52](https://github.com/angular/angular-cli/commit/ea60f0f527f2ab8fc5acc967138c4ae993946923) | fix  | handle `FORCE_COLOR` when stdout is not instance of `WriteStream` |

## Special Thanks

Alan Agius

<a name="13.0.0-next.4"></a>

# 13.0.0-next.4 (2021-09-08)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [decb1d14b](https://github.com/angular/angular-cli/commit/decb1d14b038c142213ded334a79570a09e9b31f) | fix  | improve Safari browserslist to esbuild target conversion |

## Special Thanks

Alan Agius, Charles Lyding and Doug Parker

<a name="12.2.5"></a>

# 12.2.5 (2021-09-08)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [0498768c5](https://github.com/angular/angular-cli/commit/0498768c54de225a40c28fdf27bb1fc43959ba20) | fix  | disable dev-server response compression                  |
| [367fce2e9](https://github.com/angular/angular-cli/commit/367fce2e9f9389c41f2ed5361ef6749198c49785) | fix  | improve Safari browserslist to esbuild target conversion |

## Special Thanks:

Alan Agius and Charles Lyding

<a name="13.0.0-next.3"></a>

# 13.0.0-next.3 (2021-09-01)

## Breaking Changes

### @angular-devkit/build-angular

- The dev-server now uses WebSockets to communicate changes to the browser during HMR and live-reloaded. If during your development you are using a proxy you will need to enable proxying of WebSockets.

### @angular-devkit/build-webpack

- Support for `webpack-dev-server` version 3 has been removed. For more information about the migration please see: https://github.com/webpack/webpack-dev-server/blob/master/migration-v4.md

Note: this change only affects users depending on `@angular-devkit/build-webpack` directly.

### @ngtools/webpack

- Deprecated `inlineStyleMimeType` option has been removed from `AngularWebpackPluginOptions`. Use `inlineStyleFileExtension` instead.

### @schematics/angular

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [732ef7985](https://github.com/angular/angular-cli/commit/732ef798523f74994ed3d482a65b191058674d19) | fix  | add browserslist configuration in library projects |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                              |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------- |
| [32dbf659a](https://github.com/angular/angular-cli/commit/32dbf659acb632fac1d76d99d8191ea9c5e6350b) | feat | update `webpack-dev-server` to version 4 |
| [76d6d8826](https://github.com/angular/angular-cli/commit/76d6d8826f9968f84edf219f67b84673d70bbe95) | fix  | set browserslist defaults                |

### @angular-devkit/build-webpack

| Commit                                                                                              | Type | Description                              |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------- |
| [a0b5897d5](https://github.com/angular/angular-cli/commit/a0b5897d50a00ee4668029c2cbc47cacd2ab925f) | feat | update `webpack-dev-server` to version 4 |

### @ngtools/webpack

| Commit                                                                                              | Type     | Description                                    |
| --------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------- |
| [8ce8e4edc](https://github.com/angular/angular-cli/commit/8ce8e4edc5ca2984d6a36fe4c7d308fa7f089102) | refactor | remove deprecated `inlineStyleMimeType` option |

## Special Thanks

Alan Agius and Joey Perrott

<a name="12.2.4"></a>

# 12.2.4 (2021-09-01)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------- |
| [aaadef026](https://github.com/angular/angular-cli/commit/aaadef02698ba729ca04ccd4159bda5b6582babb) | fix  | update `esbuild` to `0.12.24`               |
| [f8a9f4a01](https://github.com/angular/angular-cli/commit/f8a9f4a0100286b7cf656ffbe486c3424cad5172) | fix  | update `mini-css-extract-plugin` to `2.2.1` |

## Special Thanks

Alan Agius

<a name="13.0.0-next.2"></a>

# 13.0.0-next.2 (2021-08-26)

### @schematics/angular

| Commit                                                                                              | Description                                                                                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [4f91816b2](https://github.com/angular/angular-cli/commit/4f91816b2951c0e2b0109ad1938eb0ae632c0c76) | feat(@schematics/angular): migrate libraries to be published from ViewEngine to Ivy Partial compilation |

### @angular-devkit/schematics

| Commit                                                                                              | Description                                                               |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [0565ed62e](https://github.com/angular/angular-cli/commit/0565ed62eb08c1e82cffb2533e6afde216c37eb7) | feat(@angular-devkit/schematics): add UpdateBuffer2 based on magic-string |

### @ngtools/webpack

| Commit                                                                                              | Description                                                                   |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [7928b18ed](https://github.com/angular/angular-cli/commit/7928b18edf34243a404b5a4f40a5d6e40247d797) | perf(@ngtools/webpack): reduce repeat path mapping analysis during resolution |

## Special Thanks:

Alan Agius, Charles Lyding, Doug Parker, Lukas Spirig and Trevor Karjanis

<a name="12.2.3"></a>

# 12.2.3 (2021-08-26)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                    |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| [3e3321857](https://github.com/angular/angular-cli/commit/3e33218578007f93a131dc8be569e9985179098f) | fix  | RGBA converted to hex notation in component styles breaks IE11 |

## Special Thanks:

Alan Agius and Trevor Karjanis

<a name="13.0.0-next.1"></a>

# 13.0.0-next.1 (2021-08-18)

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                                |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [aba54ae78](https://github.com/angular/angular-cli/commit/aba54ae783816502122ec63530a7274229c31762) | fix(@angular-devkit/build-angular): provide supported browsers to esbuild                  |
| [9eb599da2](https://github.com/angular/angular-cli/commit/9eb599da2b71f067e607f86266cecdb008b6a867) | fix(@angular-devkit/build-angular): handle undefined entrypoints when marking async chunks |

## Breaking Changes

### @angular-devkit/core

The deprecated JSON parser has been removed from public API. [jsonc-parser](https://www.npmjs.com/package/jsonc-parser) should be used instead.

## Special Thanks:

Alan Agius, Charles Lyding, Douglas Parker, Joey Perrott and Simon Primetzhofer

<a name="12.2.2"></a>

# 12.2.2 (2021-08-18)

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [a55118a75](https://github.com/angular/angular-cli/commit/a55118a753555c0082cfd434379559df7e3eb7f9) | fix: provide supported browsers to esbuild                  |
| [81baa4f95](https://github.com/angular/angular-cli/commit/81baa4f956443fcc718f9021fd23ab7064d04607) | fix: update Angular peer dependencies to 12.2 stable        |
| [297410ae8](https://github.com/angular/angular-cli/commit/297410ae860860d71905639cf38b49ff05813845) | fix: handle undefined entrypoints when marking async chunks |

### @ngtools/webpack

| Commit                                                                                              | Description                                          |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [b7199f366](https://github.com/angular/angular-cli/commit/b7199f366841d976b502ad5f1923e24ea2f6b302) | fix: update Angular peer dependencies to 12.2 stable |

## Special Thanks:

Alan Agius, Charles Lyding, Joey Perrott and Simon Primetzhofer

<a name="13.0.0-next.0"></a>

# 13.0.0-next.0 (2021-08-11)

### @angular/cli

| Commit                                                                                              | Description                                                                                                     |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [77fe6c4e6](https://github.com/angular/angular-cli/commit/77fe6c4e67147ff42fa6350edaf4ef7dc184a3a6) | fix(@angular/cli): update `engines` to require `node` `12.20.0`                                                 |
| [c0f1b5ea5](https://github.com/angular/angular-cli/commit/c0f1b5ea5200e6ecc05fb40f875fd7ba45803809) | fix(@angular/cli): show error when using non-TTY terminal without passing `--skip-confirmation` during `ng add` |
| [259e26979](https://github.com/angular/angular-cli/commit/259e26979ebc712ee08fd36fb68a9576c1e02447) | fix(@angular/cli): merge npmrc files values                                                                     |

### @schematics/angular

| Commit                                                                                              | Description                                                                                                        |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [3ba13f467](https://github.com/angular/angular-cli/commit/3ba13f467c12f4ad0c314cc92a2d94fb63f640ec) | feat(@schematics/angular): add `noImplicitOverride` and `noPropertyAccessFromIndexSignature` to workspace tsconfig |
| [a7b2e6f51](https://github.com/angular/angular-cli/commit/a7b2e6f512d2a1124f0d2c68caacfe6552a10cd5) | feat(@schematics/angular): update ngsw-config resources extensions                                                 |
| [f227e145d](https://github.com/angular/angular-cli/commit/f227e145dfbec2954cb96c92ab3c4cb97cbe0f32) | fix(@schematics/angular): updated Angular new project version to v13.0 prerelease                                  |
| [268a03b63](https://github.com/angular/angular-cli/commit/268a03b63094d9c680401bc0977edafb22826ce3) | feat(@schematics/angular): add migration to update the workspace config                                            |
| [5986befcd](https://github.com/angular/angular-cli/commit/5986befcdc953c0e8c90c756ac1c89b8c4b66614) | feat(@schematics/angular): remove deprecated options                                                               |
| [9fbd16655](https://github.com/angular/angular-cli/commit/9fbd16655e86ec6fc598a47436e3e80a48beb649) | feat(@schematics/angular): remove IE 11 specific polyfills                                                         |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Description                                                                 |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [b9e7f8958](https://github.com/angular/angular-cli/commit/b9e7f89589626f1443216a584c539491cec19a4d) | fix(@angular-devkit/schematics-cli): log when in debug and/or dry run modes |

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                                              |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [d67e7ad2f](https://github.com/angular/angular-cli/commit/d67e7ad2fc335a7e8476c6049c2d372a0ed45c0c) | fix(@angular-devkit/build-angular): ensure native async is downlevelled in third-party libraries         |
| [8e82263c5](https://github.com/angular/angular-cli/commit/8e82263c5e7da6ca25bdd4e2ce9ad2c775d623b7) | perf(@angular-devkit/build-angular): use esbuild/terser combination to optimize global scripts           |
| [e95ecb8ab](https://github.com/angular/angular-cli/commit/e95ecb8ab0382eb803741619c446d6cc7b215ba0) | feat(@angular-devkit/build-angular): deprecate deployUrl                                                 |
| [cb7d156c2](https://github.com/angular/angular-cli/commit/cb7d156c23a7ef2f1c2f338db1487b85f8b98690) | perf(@angular-devkit/build-angular): use esbuild as a CSS optimizer for global styles                    |
| [cdfaeee08](https://github.com/angular/angular-cli/commit/cdfaeee089f3458b1924eb516a2b4275e662b079) | fix(@angular-devkit/build-angular): support both pure annotation forms for static properties             |
| [2aa6f579d](https://github.com/angular/angular-cli/commit/2aa6f579d7b5af13eeb5bbf35f78d5411738b98a) | fix(@angular-devkit/build-angular): do not consume inline sourcemaps when vendor sourcemaps is disabled. |
| [167eed465](https://github.com/angular/angular-cli/commit/167eed4654be4480c45d7fdfe7a0b9f160170289) | fix(@angular-devkit/build-angular): update Angular peer dependencies to v13.0 prerelease                 |
| [7dcfffaff](https://github.com/angular/angular-cli/commit/7dcfffafff6f3d29bbe679a90cdf77b1292fec0b) | feat(@angular-devkit/build-angular): drop support for `karma-coverage-instanbul-reporter`                |
| [f5d019f9d](https://github.com/angular/angular-cli/commit/f5d019f9d6ad6d8fdea37836564d9ee190deb23c) | fix(@angular-devkit/build-angular): avoid attempting to optimize copied JavaScript assets                |
| [8758e4415](https://github.com/angular/angular-cli/commit/8758e4415d7ef6301c4441db0014e24f1cc8d146) | fix(@angular-devkit/build-angular): handle null maps in JavaScript optimizer worker                      |
| [f53bf9dc2](https://github.com/angular/angular-cli/commit/f53bf9dc21ee9aa8a682b8a82ee8a9870fa859e1) | feat(@angular-devkit/build-angular): add `type=module` to all scripts tags                               |
| [20e48a33c](https://github.com/angular/angular-cli/commit/20e48a33c14a1b0b959ba0a45018df53a3e129c8) | feat(@angular-devkit/build-angular): remove deprecated options                                           |
| [7576136b2](https://github.com/angular/angular-cli/commit/7576136b2fc8a9173b0a92e2ab14c9bc2559081e) | feat(@angular-devkit/build-angular): remove automatic inclusion of ES5 browser polyfills                 |
| [701214d17](https://github.com/angular/angular-cli/commit/701214d174586fe7373b6155024c9b6e97b26377) | feat(@angular-devkit/build-angular): remove differential loading support                                 |
| [e78f6ab5d](https://github.com/angular/angular-cli/commit/e78f6ab5d8f00338d826c8407ce5c8fca40cf097) | feat(@angular-devkit/build-angular): remove deprecated tslint builder                                    |
| [ac3fc2752](https://github.com/angular/angular-cli/commit/ac3fc2752f28761e1cd42157b59dcf2364ae5567) | feat(@angular-devkit/build-angular): drop support for `node-sass`                                        |
| [c1efaa17f](https://github.com/angular/angular-cli/commit/c1efaa17feb1d2911dcdea12688d75086d410bf1) | fix(@angular-devkit/build-angular): calculate valid Angular versions from peerDependencies               |
| [d750c686f](https://github.com/angular/angular-cli/commit/d750c686fd26f3ccfccb039027bd816a91279497) | fix(@angular-devkit/build-angular): add priority to copy-webpack-plugin patterns                         |

### @angular-devkit/build-webpack

| Commit                                                                                              | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [615353022](https://github.com/angular/angular-cli/commit/61535302204a2a767f85053b7efaa6ac5ac64098) | fix(@angular-devkit/build-webpack): emit result when webpack is closed |

### @angular-devkit/core

| Commit                                                                                              | Description                                                      |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [0c92ea5ca](https://github.com/angular/angular-cli/commit/0c92ea5ca34d82849862d55c4210cf62c819d514) | feat(@angular-devkit/core): remove deprecated schema id handling |

### @angular-devkit/schematics

| Commit                                                                                              | Description                                                     |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [8954d1152](https://github.com/angular/angular-cli/commit/8954d1152b6c1a33dd7d4b63d2fa430d91e7b370) | feat(@angular-devkit/schematics): remove deprecated `isAction`  |
| [053b7d66c](https://github.com/angular/angular-cli/commit/053b7d66c269423804891e4d43d61f8605838e24) | feat(@angular-devkit/schematics): remove deprecated tslint APIs |

### @ngtools/webpack

| Commit                                                                                              | Description                                                                 |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [d2a97f919](https://github.com/angular/angular-cli/commit/d2a97f9193fcf7e454fe8eb48c0ed732d3b2f24f) | fix(@ngtools/webpack): update Angular peer dependencies to v13.0 prerelease |

## Breaking Changes

### @schematics/angular

We removed several deprecated `@schematics/angular` deprecated options.

- `lintFix` have been removed from all schematics. `ng lint --fix` should be used instead.
- `legacyBrowsers` have been removed from the `application` schematics since IE 11 is no longer supported.
- `configuration` has been removed from the `web-worker` as it was unused.
- `target` has been removed from the `service-worker` as it was unused.

### @angular/cli

We drop support for Node.js versions prior to `12.20`.

### @angular-devkit/build-angular

Support for `karma-coverage-instanbul-reporter` has been dropped in favor of the official karma coverage plugin `karma-coverage`.
With this change we removed several deprecated builder options

- `extractCss` has been removed from the browser builder. CSS is now always extracted.
- `servePathDefaultWarning` and `hmrWarning` have been removed from the dev-server builder. These options had no effect.

The automatic inclusion of Angular-required ES2015 polyfills to support ES5 browsers has been removed. Previously when targetting ES5 within the application's TypeScript configuration or listing an ES5 requiring browser in the browserslist file, Angular-required polyfills were included in the built application. However, with Angular no longer supporting IE11, there are now no browsers officially supported by Angular that would require these polyfills. As a result, the automatic inclusion of these ES2015 polyfills has been removed. Any polyfills manually added to an application's code are not affected by this change.

Differential loading support has been removed. With Angular no longer supporting IE11, there are now no browsers officially supported by Angular that require ES5 code. As a result, differential loading's functionality for creating and conditionally loading ES5 and ES2015+ variants of an application is no longer required.

Deprecated `@angular-devkit/build-angular:tslint` builder has been removed. Use https://github.com/angular-eslint/angular-eslint instead.

We remove inlining of Google fonts in WOFF format since IE 11 is no longer supported. Other supported browsers use WOFF2.

Support for `node-sass` has been removed. `sass` will be used by default to compile SASS and SCSS files.

### @angular-devkit/core

With this change we drop support for the deprecated behaviour to transform `id` in schemas. Use `$id` instead.

Note: this only effects schematics and builders authors.

### @angular-devkit/schematics

`isAction` has been removed without replacement as it was unused.

With this change we remove the following deprecated APIs

- `TslintFixTask`
- `TslintFixTaskOptions`

**Note:** this only effects schematics developers.

## Special Thanks:

Alan Agius, Charles Lyding, Doug Parker, Joey Perrott and originalfrostig

<a name="12.2.1"></a>

# 12.2.1 (2021-08-11)

### @angular/cli

| Commit                                                                                              | Description                                                                                                     |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [8dc3c895a](https://github.com/angular/angular-cli/commit/8dc3c895a6531316e672031c8d0815781f0c089a) | fix(@angular/cli): show error when using non-TTY terminal without passing `--skip-confirmation` during `ng add` |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Description                                                                 |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [eded01270](https://github.com/angular/angular-cli/commit/eded01270f9aa70f6ba4806a068de8d1c0a52454) | fix(@angular-devkit/schematics-cli): log when in debug and/or dry run modes |

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                                              |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [22e0208a9](https://github.com/angular/angular-cli/commit/22e0208a9ee6257213b3bf93ac61a2c3d4ac9504) | fix(@angular-devkit/build-angular): ensure native async is downlevelled in third-party libraries         |
| [9b4b86fb0](https://github.com/angular/angular-cli/commit/9b4b86fb0d9c88a3c714f5eabf925859bb7b71bb) | fix(@angular-devkit/build-angular): support both pure annotation forms for static properties             |
| [cea028090](https://github.com/angular/angular-cli/commit/cea0280908db39308ac5fa37374b138ceb79ecea) | fix(@angular-devkit/build-angular): do not consume inline sourcemaps when vendor sourcemaps is disabled. |
| [e7ec0346e](https://github.com/angular/angular-cli/commit/e7ec0346e69c090ded7d9ec6d3574deb79926db0) | fix(@angular-devkit/build-angular): avoid attempting to optimize copied JavaScript assets                |
| [4f757c2bc](https://github.com/angular/angular-cli/commit/4f757c2bcf1356d33eaa86bc3b715c0a6b7c2ed8) | fix(@angular-devkit/build-angular): handle null maps in JavaScript optimizer worker                      |

## Special Thanks:

Alan Agius and Charles Lyding

<a name="12.2.0"></a>

# 12.2.0 (2021-08-04)

### @angular/cli

| Commit                                                                                              | Description                                                                                            |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [259e26979](https://github.com/angular/angular-cli/commit/259e26979ebc712ee08fd36fb68a9576c1e02447) | fix(@angular/cli): merge npmrc files values                                                            |
| [c1eddbdc9](https://github.com/angular/angular-cli/commit/c1eddbdc98631fdfff287ce566d79ed43b601e0f) | fix(@angular/cli): handle `YARN_` environment variables during `ng update` and `ng add`                |
| [6b00d1270](https://github.com/angular/angular-cli/commit/6b00d1270acaf33f32ee68c4254ce06951ddcb8c) | fix(@angular/cli): handle NPM_CONFIG environment variables during ng update and ng add                 |
| [88ee85c41](https://github.com/angular/angular-cli/commit/88ee85c4178e37b72001e8946b70a46ba739a0b7) | fix(@angular/cli): disable update notifier when retrieving package manager version during `ng version` |

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [d750c686f](https://github.com/angular/angular-cli/commit/d750c686fd26f3ccfccb039027bd816a91279497) | fix(@angular-devkit/build-angular): add priority to copy-webpack-plugin patterns                                               |
| [4bcd1dc9e](https://github.com/angular/angular-cli/commit/4bcd1dc9ee744343a465d73d51d4a062964a3714) | fix(@angular-devkit/build-angular): allow classes with pure annotated static properties to be optimized                        |
| [ceade0c27](https://github.com/angular/angular-cli/commit/ceade0c27e4b8b0e731e6ca5128fd86cf071d029) | fix(@angular-devkit/build-angular): dasherize disable-host-check suggestion                                                    |
| [8383c6b42](https://github.com/angular/angular-cli/commit/8383c6b421f7005a25a3bff0826048f3a24f3030) | fix(@angular-devkit/build-angular): silence Sass compiler warnings from 3rd party stylesheets                                  |
| [07763702f](https://github.com/angular/angular-cli/commit/07763702fd244ba44aebb714a295dbf5ba72b91d) | fix(@angular-devkit/build-angular): force linker `sourceMapping` option to false.                                              |
| [a5c69722f](https://github.com/angular/angular-cli/commit/a5c69722ffeceb72dcd46901c2bb983e5dc8bf32) | fix(@angular-devkit/build-angular): ensure `NG_PERSISTENT_BUILD_CACHE` always creates a cache in the specified cache directory |
| [c65b04999](https://github.com/angular/angular-cli/commit/c65b049996a8de9d9fcc66631872424cbe5f13f9) | fix(@angular-devkit/build-angular): fail browser build when index generation fails                                             |
| [3d71c63b3](https://github.com/angular/angular-cli/commit/3d71c63b3a11946ebfca3f0d97d4fbf8dca16255) | fix(@angular-devkit/build-angular): fix issue were `@media all` causing critical CSS inling to fail                            |
| [9a04975a2](https://github.com/angular/angular-cli/commit/9a04975a2170c3ecc2c09c32bd15a89c613e198f) | fix(@angular-devkit/build-angular): `extractLicenses` didn't have an effect when using server builder                          |
| [2ac8e9c0e](https://github.com/angular/angular-cli/commit/2ac8e9c0e131bf7fcb2c6e92500eeaa112efcefb) | fix(@angular-devkit/build-angular): display incompatibility errors                                                             |
| [2c2b49919](https://github.com/angular/angular-cli/commit/2c2b499193fb319e1c9cb92318610353b7720e2b) | fix(@angular-devkit/build-angular): limit advanced terser passes to two                                                        |
| [1be3b0783](https://github.com/angular/angular-cli/commit/1be3b07836659487e4aa9b8c71c673635e268a60) | fix(@angular-devkit/build-angular): exclude `outputPath` from persistent build cache key                                       |
| [fefd6d042](https://github.com/angular/angular-cli/commit/fefd6d04213e61d3f48c0484d8c6a8dcff1ecd34) | perf(@angular-devkit/build-angular): use `esbuild` as a CSS optimizer for component styles                                     |
| [18cfa0431](https://github.com/angular/angular-cli/commit/18cfa04317230f934ccba798c080543bb389725f) | feat(@angular-devkit/build-angular): add support to inline Adobe Fonts                                                         |
| [9a751f0f8](https://github.com/angular/angular-cli/commit/9a751f0f81919d67f5eeeaecbe807d5c216f6a7a) | fix(@angular-devkit/build-angular): handle `ENOENT` and `ENOTDIR` errors when deleting outputs                                 |
| [41e645792](https://github.com/angular/angular-cli/commit/41e64579213b9d4a7c976ea45daa6b32d980df10) | fix(@angular-devkit/build-angular): downlevel `for await...of` when targetting ES2018+                                         |
| [070a13364](https://github.com/angular/angular-cli/commit/070a1336478d721bbbb474622f50fab455cda26c) | fix(@angular-devkit/build-angular): configure webpack target in common configuration                                           |
| [da32daa75](https://github.com/angular/angular-cli/commit/da32daa75d08d4be177af5fa16088398d7fb427b) | perf(@angular-devkit/build-angular): use combination of `esbuild` and `terser` as a JavaScript optimizer                       |
| [6a2b11906](https://github.com/angular/angular-cli/commit/6a2b11906e4173562a82b3654ff662dd05513049) | perf(@angular-devkit/build-angular): cache JavaScriptOptimizerPlugin results                                                   |
| [ab17b1721](https://github.com/angular/angular-cli/commit/ab17b1721c05366e592cf805ad6d25e672b314bf) | fix(@angular-devkit/build-angular): handle ng-packagr errors more gracefully.                                                  |
| [d4c5f8518](https://github.com/angular/angular-cli/commit/d4c5f8518d4801b9fd76de289a015dcbb8d8f69b) | fix(@angular-devkit/build-angular): control linker template sourcemapping via builder sourcemap options                        |
| [06181c2fb](https://github.com/angular/angular-cli/commit/06181c2fbf5a20396b2d0e2b3925ceb1276947fb) | fix(@angular-devkit/build-angular): parse web-workers in tests when webWorkerTsConfig is defined                               |

### @angular-devkit/build-webpack

| Commit                                                                                              | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [615353022](https://github.com/angular/angular-cli/commit/61535302204a2a767f85053b7efaa6ac5ac64098) | fix(@angular-devkit/build-webpack): emit result when webpack is closed |

### @ngtools/webpack

| Commit                                                                                              | Description                                                                          |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [dbbcf5c8c](https://github.com/angular/angular-cli/commit/dbbcf5c8c4ec4427609942f4ef7053c1b51773c9) | fix(@ngtools/webpack): only track file dependencies                                  |
| [7536338e0](https://github.com/angular/angular-cli/commit/7536338e0becc7f9cde62becbde58e18a270cb31) | fix(@ngtools/webpack): allow generated assets of Angular component resources         |
| [720feee34](https://github.com/angular/angular-cli/commit/720feee34f910fc11c40e2f68d919d61b7d6cbec) | fix(@ngtools/webpack): avoid non-actionable template type-checker syntax diagnostics |
| [6a7bcf330](https://github.com/angular/angular-cli/commit/6a7bcf3300b459aef80fcf98f2475c977f6244dc) | fix(@ngtools/webpack): encode component style data                                   |
| [12c14b565](https://github.com/angular/angular-cli/commit/12c14b56537d65d6986e245ab1ae4dd9aa8dd378) | fix(@ngtools/webpack): remove no longer needed component styles workaround           |

### @schematics/angular

| Commit                                                                                              | Description                                                                                         |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [20fd33f6d](https://github.com/angular/angular-cli/commit/20fd33f6d4ce6cef1feb508a0221222e83a85630) | feat(@schematics/angular): destroy test module after every test                                     |
| [5b10d4f54](https://github.com/angular/angular-cli/commit/5b10d4f549ebc12645ad08cba8ab7b91eaa87d28) | fix(@schematics/angular): remove unsafe any usage in application spec file                          |
| [1b5e18e7b](https://github.com/angular/angular-cli/commit/1b5e18e7b401efb7ec73d99c4d77d9b29e956724) | fix(@schematics/angular): replace interactive `div` with `button` in application component template |
| [0907b6941](https://github.com/angular/angular-cli/commit/0907b694174d6d684d965baf6cd37b87f49742e8) | fix(@schematics/angular): use stricter semver for `karma-jasmine-html-reporter`                     |
| [8ad1539c5](https://github.com/angular/angular-cli/commit/8ad1539c5e73bad30eb6eb340379d64db208098c) | fix(@schematics/angular): add 'none' value for the 'style' option of the component schematic        |
| [e5ba29c7d](https://github.com/angular/angular-cli/commit/e5ba29c7d54cbd83057cf23a21119ea5a3146993) | fix(@schematics/angular): display warning during migrations when using third-party builders         |
| [a44dc02fe](https://github.com/angular/angular-cli/commit/a44dc02feecaf8735f2dc6128a5b6cc5666b4434) | fix(@schematics/angular): add devtools to ng new                                                    |

## Special Thanks:

Alan Agius, Charles Lyding, David Scourfield, Doug Parker, hien-pham, Joey Perrott, LeonEck, Mike
Jancar, twerske, Vaibhav Singh and originalfrostig

<a name="12.2.0-rc.0"></a>

# 12.2.0-rc.0 (2021-07-28)

### @angular/cli

| Commit                                                                                              | Description                                 |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [259e26979](https://github.com/angular/angular-cli/commit/259e26979ebc712ee08fd36fb68a9576c1e02447) | fix(@angular/cli): merge npmrc files values |

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                      |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [d750c686f](https://github.com/angular/angular-cli/commit/d750c686fd26f3ccfccb039027bd816a91279497) | fix(@angular-devkit/build-angular): add priority to copy-webpack-plugin patterns |

### @angular-devkit/build-webpack

| Commit                                                                                              | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [615353022](https://github.com/angular/angular-cli/commit/61535302204a2a767f85053b7efaa6ac5ac64098) | fix(@angular-devkit/build-webpack): emit result when webpack is closed |

## Special Thanks:

Alan Agius, Charles Lyding, Joey Perrott and originalfrostig

<a name="12.1.4"></a>

# 12.1.4 (2021-07-28)

### @angular/cli

| Commit                                                                                              | Description                                 |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [e02c97dd0](https://github.com/angular/angular-cli/commit/e02c97dd09399443438b32cf1ad47fa0f7011df3) | fix(@angular/cli): merge npmrc files values |

### @schematics/angular

| Commit                                                                                              | Description                                                                          |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [cfc267426](https://github.com/angular/angular-cli/commit/cfc267426716e9ecf0c9833720cb35298284f699) | fix(@schematics/angular): ensure valid SemVer range for new project Angular packages |

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                      |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [55c0bddc8](https://github.com/angular/angular-cli/commit/55c0bddc8b2425309f00733eca96c06f60f867d5) | fix(@angular-devkit/build-angular): add priority to copy-webpack-plugin patterns |

### @angular-devkit/build-webpack

| Commit                                                                                              | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [b3736a3c0](https://github.com/angular/angular-cli/commit/b3736a3c09f39f5ee5dc12d98535fe4b6803ea3b) | fix(@angular-devkit/build-webpack): emit result when webpack is closed |

## Special Thanks:

Alan Agius, Charles Lyding, Joey Perrott and originalfrostig

<a name="12.2.0-next.3"></a>

# 12.2.0-next.3 (2021-07-21)

### @angular/cli

| Commit                                                                                              | Description                                                                             |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [c1eddbdc9](https://github.com/angular/angular-cli/commit/c1eddbdc98631fdfff287ce566d79ed43b601e0f) | fix(@angular/cli): handle `YARN_` environment variables during `ng update` and `ng add` |
| [6b00d1270](https://github.com/angular/angular-cli/commit/6b00d1270acaf33f32ee68c4254ce06951ddcb8c) | fix(@angular/cli): handle NPM_CONFIG environment variables during ng update and ng add  |

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [4bcd1dc9e](https://github.com/angular/angular-cli/commit/4bcd1dc9ee744343a465d73d51d4a062964a3714) | fix(@angular-devkit/build-angular): allow classes with pure annotated static properties to be optimized |
| [ceade0c27](https://github.com/angular/angular-cli/commit/ceade0c27e4b8b0e731e6ca5128fd86cf071d029) | fix(@angular-devkit/build-angular): dasherize disable-host-check suggestion                             |

## Special Thanks:

Alan Agius, Charles Lyding, Joey Perrott, LeonEck and Mike Jancar

<a name="12.1.3"></a>

# 12.1.3 (2021-07-21)

### @angular/cli

| Commit                                                                                              | Description                                                                             |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [eaa2378b6](https://github.com/angular/angular-cli/commit/eaa2378b6bc69a2485cce742ef95b0b94ae994c6) | fix(@angular/cli): handle `YARN_` environment variables during `ng update` and `ng add` |
| [4b9a41bde](https://github.com/angular/angular-cli/commit/4b9a41bdedcdc4e115e8956d31126c5bf6f442ca) | fix(@angular/cli): handle NPM_CONFIG environment variables during ng update and ng add  |

### @angular-devkit/build-angular

| Commit                                                                                              | Description                                                                                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [04e9ffe4f](https://github.com/angular/angular-cli/commit/04e9ffe4f6b262ce5ef630310bed318e1466d238) | fix(@angular-devkit/build-angular): allow classes with pure annotated static properties to be optimized |
| [6ae17e265](https://github.com/angular/angular-cli/commit/6ae17e26547a0174f7a8910c514016db60fe4c7a) | fix(@angular-devkit/build-angular): dasherize disable-host-check suggestion                             |

## Special Thanks:

Alan Agius, Charles Lyding, Joey Perrott, LeonEck and Mike Jancar

<a name="v12.2.0-next.2"></a>

# v12.2.0-next.2 (2021-07-14)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.2.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8383c6b421f7005a25a3bff0826048f3a24f3030"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8383c6b-fix-green.svg" />
</a>
  </td>

  <td>silence Sass compiler warnings from 3rd party stylesheets</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21235">
  [Closes #21235]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/07763702fd244ba44aebb714a295dbf5ba72b91d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0776370-fix-green.svg" />
</a>
  </td>

  <td>force linker `sourceMapping` option to false.</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21271">
  [Closes #21271]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a5c69722ffeceb72dcd46901c2bb983e5dc8bf32"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a5c6972-fix-green.svg" />
</a>
  </td>

  <td>ensure `NG_PERSISTENT_BUILD_CACHE` always creates a cache in the specified cache directory</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c65b049996a8de9d9fcc66631872424cbe5f13f9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c65b049-fix-green.svg" />
</a>
  </td>

  <td>fail browser build when index generation fails</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3d71c63b3a11946ebfca3f0d97d4fbf8dca16255"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3d71c63-fix-green.svg" />
</a>
  </td>

  <td>fix issue were `@media all` causing critical CSS inling to fail</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20804">
  [Closes #20804]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9a04975a2170c3ecc2c09c32bd15a89c613e198f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9a04975-fix-green.svg" />
</a>
  </td>

  <td>`extractLicenses` didn't have an effect when using server builder</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2ac8e9c0e131bf7fcb2c6e92500eeaa112efcefb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2ac8e9c-fix-green.svg" />
</a>
  </td>

  <td>display incompatibility errors</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21322">
  [Closes #21322]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2c2b499193fb319e1c9cb92318610353b7720e2b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2c2b499-fix-green.svg" />
</a>
  </td>

  <td>limit advanced terser passes to two</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1be3b07836659487e4aa9b8c71c673635e268a60"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1be3b07-fix-green.svg" />
</a>
  </td>

  <td>exclude `outputPath` from persistent build cache key</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21275">
  [Closes #21275]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fefd6d04213e61d3f48c0484d8c6a8dcff1ecd34"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/fefd6d0-perf-orange.svg" />
</a>
  </td>

  <td>use `esbuild` as a CSS optimizer for component styles</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.2.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/dbbcf5c8c4ec4427609942f4ef7053c1b51773c9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/dbbcf5c-fix-green.svg" />
</a>
  </td>

  <td>only track file dependencies</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21228">
  [Closes #21228]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7536338e0becc7f9cde62becbde58e18a270cb31"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7536338-fix-green.svg" />
</a>
  </td>

  <td>allow generated assets of Angular component resources</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/720feee34f910fc11c40e2f68d919d61b7d6cbec"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/720feee-fix-green.svg" />
</a>
  </td>

  <td>avoid non-actionable template type-checker syntax diagnostics</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.2.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/20fd33f6d4ce6cef1feb508a0221222e83a85630"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/20fd33f-feat-blue.svg" />
</a>
  </td>

  <td>destroy test module after every test</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21280">
  [Closes #21280]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5b10d4f549ebc12645ad08cba8ab7b91eaa87d28"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/5b10d4f-fix-green.svg" />
</a>
  </td>

  <td>remove unsafe any usage in application spec file</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1b5e18e7b401efb7ec73d99c4d77d9b29e956724"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1b5e18e-fix-green.svg" />
</a>
  </td>

  <td>replace interactive `div` with `button` in application component template</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0907b694174d6d684d965baf6cd37b87f49742e8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0907b69-fix-green.svg" />
</a>
  </td>

  <td>use stricter semver for `karma-jasmine-html-reporter`</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Joey Perrott

<a name="v12.1.2"></a>

# v12.1.2 (2021-07-14)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9d48d69aa851eaca3d491495b8d33d155780fa0d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9d48d69-fix-green.svg" />
</a>
  </td>

  <td>silence Sass compiler warnings from 3rd party stylesheets</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21235">
  [Closes #21235]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9abf44d354efc3c29f53bf167cd18939a310867b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9abf44d-fix-green.svg" />
</a>
  </td>

  <td>ensure `NG_PERSISTENT_BUILD_CACHE` always creates a cache in the specified cache directory</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/159dc5f9270f4e4a4942dd3eb53198c6b9cd9a6b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/159dc5f-fix-green.svg" />
</a>
  </td>

  <td>force linker `sourceMapping` option to false.</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21271">
  [Closes #21271]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7cad85dad15a60310d23dc216d8ebe3b7eea594f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7cad85d-fix-green.svg" />
</a>
  </td>

  <td>fail browser build when index generation fails</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/08c317d1630bd81aaafc3552f753324d7751e39d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/08c317d-fix-green.svg" />
</a>
  </td>

  <td>`extractLicenses` didn't have an effect when using server builder</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c21f6505e3026efaf277aabf5f6878ae3d185c1e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c21f650-fix-green.svg" />
</a>
  </td>

  <td>fix issue were `@media all` causing critical CSS inling to fail</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20804">
  [Closes #20804]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f3b2dc46e91e8cb97cc2f5aef32b701cd527c589"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f3b2dc4-fix-green.svg" />
</a>
  </td>

  <td>display incompatibility errors</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21322">
  [Closes #21322]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5219c050438aff0806b2da813ef74cd9fff2c2f5"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/5219c05-fix-green.svg" />
</a>
  </td>

  <td>exclude `outputPath` from persistent build cache key</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21275">
  [Closes #21275]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/736a5f89deaca85f487b78aec9ff66d4118ceb6a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/736a5f8-fix-green.svg" />
</a>
  </td>

  <td>only track file dependencies</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21228">
  [Closes #21228]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e1074eb4a54f4140d0e3cffd6dd30e2efe7c18e2"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e1074eb-fix-green.svg" />
</a>
  </td>

  <td>allow generated assets of Angular component resources</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/30638d4525b8dc260cb11488088aa7393083227a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/30638d4-fix-green.svg" />
</a>
  </td>

  <td>avoid non-actionable template type-checker syntax diagnostics</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/09ec1f48d67fa7772df8cd86345a01ed5cf6493c"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/09ec1f4-fix-green.svg" />
</a>
  </td>

  <td>remove unsafe any usage in application spec file</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/191dc498521b43d944f5871f1fc8a3dcf80dfaa1"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/191dc49-fix-green.svg" />
</a>
  </td>

  <td>replace interactive `div` with `button` in application component template</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a729381c039771eb17ca8aefc010b4d13ec17285"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a729381-fix-green.svg" />
</a>
  </td>

  <td>use stricter semver for `karma-jasmine-html-reporter`</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Joey Perrott, Terence D. Honles

<a name="v12.1.1"></a>

# v12.1.1 (2021-07-01)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8e52c9c56ddbc9c627508fd41c5b3693b7515197"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8e52c9c-fix-green.svg" />
</a>
  </td>

  <td>handle `ENOENT` and `ENOTDIR` errors when deleting outputs</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21202">
  [Closes #21202]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/dd60228974a75b3c6b2ae98521444f0354161240"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/dd60228-fix-green.svg" />
</a>
  </td>

  <td>downlevel `for await...of` when targetting ES2018+</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21196">
  [Closes #21196]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2039d6201fa91136a0815f0622787dcccedf0e65"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2039d62-fix-green.svg" />
</a>
  </td>

  <td>configure webpack target in common configuration</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21239">
  [Closes #21239]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/49f5755db27f5860c3c71aef2ae532a719f9aa3b"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/49f5755-perf-orange.svg" />
</a>
  </td>

  <td>update `mini-css-extract-plugin` to `1.6.2`</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2105677a468f95bf9097a37cadd8041865a85658"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/2105677-perf-orange.svg" />
</a>
  </td>

  <td>update `webpack` to `5.41.1`</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.1.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e2375c9de8845ba16d3ec22e83922d9138d6f265"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e2375c9-fix-green.svg" />
</a>
  </td>

  <td>disable update notifier when retrieving package manager version during `ng version`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21172">
  [Closes #21172]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/81c7cf232d34e6664edfbe340e6d620d55b4965a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/81c7cf2-fix-green.svg" />
</a>
  </td>

  <td>encode component style data</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21236">
  [Closes #21236]<br />
</a>

  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Doug Parker
<a name="v12.2.0-next.1"></a>

# v12.2.0-next.1 (2021-07-01)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.2.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/18cfa04317230f934ccba798c080543bb389725f"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/18cfa04-feat-blue.svg" />
</a>
  </td>

  <td>add support to inline Adobe Fonts</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21186">
  [Closes #21186]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9a751f0f81919d67f5eeeaecbe807d5c216f6a7a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9a751f0-fix-green.svg" />
</a>
  </td>

  <td>handle `ENOENT` and `ENOTDIR` errors when deleting outputs</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21202">
  [Closes #21202]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/41e64579213b9d4a7c976ea45daa6b32d980df10"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/41e6457-fix-green.svg" />
</a>
  </td>

  <td>downlevel `for await...of` when targetting ES2018+</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21196">
  [Closes #21196]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/070a1336478d721bbbb474622f50fab455cda26c"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/070a133-fix-green.svg" />
</a>
  </td>

  <td>configure webpack target in common configuration</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21239">
  [Closes #21239]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/da32daa75d08d4be177af5fa16088398d7fb427b"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/da32daa-perf-orange.svg" />
</a>
  </td>

  <td>use combination of `esbuild` and `terser` as a JavaScript optimizer</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6a2b11906e4173562a82b3654ff662dd05513049"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/6a2b119-perf-orange.svg" />
</a>
  </td>

  <td>cache JavaScriptOptimizerPlugin results</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.2.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/88ee85c4178e37b72001e8946b70a46ba739a0b7"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/88ee85c-fix-green.svg" />
</a>
  </td>

  <td>disable update notifier when retrieving package manager version during `ng version`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21172">
  [Closes #21172]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.2.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6a7bcf3300b459aef80fcf98f2475c977f6244dc"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6a7bcf3-fix-green.svg" />
</a>
  </td>

  <td>encode component style data</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21236">
  [Closes #21236]<br />
</a>

  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Doug Parker
<a name="v12.2.0-next.0"></a>

# v12.2.0-next.0 (2021-06-24)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ab17b1721c05366e592cf805ad6d25e672b314bf"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ab17b17-fix-green.svg" />
</a>
  </td>

  <td>handle ng-packagr errors more gracefully.</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d4c5f8518d4801b9fd76de289a015dcbb8d8f69b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d4c5f85-fix-green.svg" />
</a>
  </td>

  <td>control linker template sourcemapping via builder sourcemap options</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/06181c2fbf5a20396b2d0e2b3925ceb1276947fb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/06181c2-fix-green.svg" />
</a>
  </td>

  <td>parse web-workers in tests when webWorkerTsConfig is defined</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/12c14b56537d65d6986e245ab1ae4dd9aa8dd378"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/12c14b5-fix-green.svg" />
</a>
  </td>

  <td>remove no longer needed component styles workaround</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8ad1539c5e73bad30eb6eb340379d64db208098c"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8ad1539-feat-blue.svg" />
</a>
  </td>

  <td>add 'none' value for the 'style' option of the component schematic</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e5ba29c7d54cbd83057cf23a21119ea5a3146993"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e5ba29c-fix-green.svg" />
</a>
  </td>

  <td>display warning during migrations when using third-party builders</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a44dc02feecaf8735f2dc6128a5b6cc5666b4434"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a44dc02-fix-green.svg" />
</a>
  </td>

  <td>add devtools to ng new</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Vaibhav Singh, Joey Perrott, twerske, David Scourfield, hien-pham
<a name="v12.1.0"></a>

# v12.1.0 (2021-06-24)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c146e9c086025e49dd207e039dc738a143e5672e"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/c146e9c-feat-blue.svg" />
</a>
  </td>

  <td>enable webpack Trusted Types support</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fb21c4a968c8b4d8a3d17237d0864b795fffba49"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/fb21c4a-feat-blue.svg" />
</a>
  </td>

  <td>deprecate protractor builder</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b35ef57b0f6e3b437ae81d475fb932adc212f939"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/b35ef57-feat-blue.svg" />
</a>
  </td>

  <td>suppport using TypeScript 4.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/79c5284892f79de6dfb54b5433a5fa5f6e0cb044"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/79c5284-fix-green.svg" />
</a>
  </td>

  <td>revert open to 8.0.2</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20807">
  [Closes #20807]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/92c9be44fa4510ab6eccd0dfde82696d70412b39"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/92c9be4-fix-green.svg" />
</a>
  </td>

  <td>correctly ignore inline styles during i18n extraction</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0fe6cfef644211e21f71e7166dd017f9e07ab2e2"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0fe6cfe-fix-green.svg" />
</a>
  </td>

  <td>use the name as chunk filename instead of id</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ab17b1721c05366e592cf805ad6d25e672b314bf"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ab17b17-fix-green.svg" />
</a>
  </td>

  <td>handle ng-packagr errors more gracefully.</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d4c5f8518d4801b9fd76de289a015dcbb8d8f69b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d4c5f85-fix-green.svg" />
</a>
  </td>

  <td>control linker template sourcemapping via builder sourcemap options</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/06181c2fbf5a20396b2d0e2b3925ceb1276947fb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/06181c2-fix-green.svg" />
</a>
  </td>

  <td>parse web-workers in tests when webWorkerTsConfig is defined</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0ebf7569f6506a673996dc2f8a7edcc4cbc61d81"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/0ebf756-perf-orange.svg" />
</a>
  </td>

  <td>use CSS optimization plugin that leverages workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f90a8324b46bd96e87a7b889a74aab432a391015"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/f90a832-perf-orange.svg" />
</a>
  </td>

  <td>enable opt-in usage of file system cache</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/57640bebfd0de417456db6c5d3cead45d528c055"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/57640be-feat-blue.svg" />
</a>
  </td>

  <td>show Node.js version support status in version command</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20879">
  [Closes #20879]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/77c96f8b2ae219bf69dc9d5278cff39dc981c680"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/77c96f8-fix-green.svg" />
</a>
  </td>

  <td>handle unscoped authentication details in `.npmrc` files</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e9717e58120dc1c91ddb228a8f6d25b94e7401bf"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e9717e5-fix-green.svg" />
</a>
  </td>

  <td>don't resolve `.npmrc` from parent directories</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/76308fecaa510bebaa869d250ca2102175e1dfd1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/76308fe-feat-blue.svg" />
</a>
  </td>

  <td>support using TypeScript 4.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f9657bc919a223e449d2dd559347eed85b1f8919"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f9657bc-fix-green.svg" />
</a>
  </td>

  <td>remove redundant inline style cache</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0c2a862db00ccfe3d309c34b3788001c719aa21d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0c2a862-fix-green.svg" />
</a>
  </td>

  <td>ensure plugin provided Webpack instance is used</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f2f15c089361bb55a809563c55a327887a401d43"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f2f15c0-fix-green.svg" />
</a>
  </td>

  <td>disable caching for ngcc synchronous Webpack resolver</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/12c14b56537d65d6986e245ab1ae4dd9aa8dd378"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/12c14b5-fix-green.svg" />
</a>
  </td>

  <td>remove no longer needed component styles workaround</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4251343aee405275ab3e5d8e3be85cab79047f43"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/4251343-feat-blue.svg" />
</a>
  </td>

  <td>create new projects with TypeScript 4.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c9f531d70398babba1b1eb96a38dea1068c10f0a"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/c9f531d-feat-blue.svg" />
</a>
  </td>

  <td>add migration to replace deprecated `--prod`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21036">
  [Closes #21036]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8ad1539c5e73bad30eb6eb340379d64db208098c"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8ad1539-feat-blue.svg" />
</a>
  </td>

  <td>add 'none' value for the 'style' option of the component schematic</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e5ba29c7d54cbd83057cf23a21119ea5a3146993"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e5ba29c-fix-green.svg" />
</a>
  </td>

  <td>display warning during migrations when using third-party builders</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a44dc02feecaf8735f2dc6128a5b6cc5666b4434"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a44dc02-fix-green.svg" />
</a>
  </td>

  <td>add devtools to ng new</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Joey Perrott, Bjarki, Vaibhav Singh, twerske, David Scourfield, hien-pham, Alberto Calvo, Paul Gschwendtner, Keen Yee Liau
<a name="v12.1.0-next.6"></a>

# v12.1.0-next.6 (2021-06-17)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0-next.6)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/071c8d10ce347a8acb40833ef0b2480986625ab5"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/071c8d1-fix-green.svg" />
</a>
  </td>

  <td>don't parse `new Worker` syntax when `webWorkerTsConfig` is not defined in karma builder</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21108">
  [Closes #21108]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/83602515faa1f50dbc250f4eb59886984310c490"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8360251-fix-green.svg" />
</a>
  </td>

  <td>explicitly set compilation target in test configuration</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21111">
  [Closes #21111]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0fe6cfef644211e21f71e7166dd017f9e07ab2e2"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0fe6cfe-fix-green.svg" />
</a>
  </td>

  <td>use the name as chunk filename instead of id</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f90a8324b46bd96e87a7b889a74aab432a391015"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/f90a832-perf-orange.svg" />
</a>
  </td>

  <td>enable opt-in usage of file system cache</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.1.0-next.6)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/77c96f8b2ae219bf69dc9d5278cff39dc981c680"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/77c96f8-fix-green.svg" />
</a>
  </td>

  <td>handle unscoped authentication details in `.npmrc` files</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e9717e58120dc1c91ddb228a8f6d25b94e7401bf"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e9717e5-fix-green.svg" />
</a>
  </td>

  <td>don't resolve `.npmrc` from parent directories</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.0-next.6)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c9f531d70398babba1b1eb96a38dea1068c10f0a"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/c9f531d-feat-blue.svg" />
</a>
  </td>

  <td>add migration to replace deprecated `--prod`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21036">
  [Closes #21036]<br />
</a>

  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Joey Perrott, Alberto Calvo, Charles Lyding
<a name="v12.0.5"></a>

# v12.0.5 (2021-06-17)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/427c4223488be5564de13c13d4daca85a83a9ad6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/427c422-fix-green.svg" />
</a>
  </td>

  <td>don't parse `new Worker` syntax when `webWorkerTsConfig` is not defined in karma builder</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21108">
  [Closes #21108]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f2ce053885a718f7a040e2ff66deef1fe9042cea"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f2ce053-fix-green.svg" />
</a>
  </td>

  <td>explicitly set compilation target in test configuration</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21111">
  [Closes #21111]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.0.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/911b5e4d9cea185dcfb9afd3ce73bf1f258556bc"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/911b5e4-fix-green.svg" />
</a>
  </td>

  <td>handle unscoped authentication details in .npmrc files</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Joey Perrott

<a name="v12.1.0-next.5"></a>

# v12.1.0-next.5 (2021-06-10)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b35ef57b0f6e3b437ae81d475fb932adc212f939"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/b35ef57-feat-blue.svg" />
</a>
  </td>

  <td>suppport using TypeScript 4.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/11a414e4689fc33270ee0a99667c9019616a7edb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/11a414e-fix-green.svg" />
</a>
  </td>

  <td>ensure all Webpack Stats assets are present on rebuilds</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21038">
  [Closes #21038]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1dd5c28f8d32e382d271a3da2bed25f16e88153a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1dd5c28-fix-green.svg" />
</a>
  </td>

  <td>dispose Sass worker resources on Webpack shutdown</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20985">
  [Closes #20985]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bd829675235ad7f862b4ccdfc317ec87e3b34710"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bd82967-fix-green.svg" />
</a>
  </td>

  <td>show progress during re-builds</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2d0d82ba5b00944fc201977befee4c70ffbef243"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2d0d82b-fix-green.svg" />
</a>
  </td>

  <td>correctly mark async chunks as non initial in dev-server</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c43ace73835fb2a21f3ff3eceec4e44e05937d72"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c43ace7-fix-green.svg" />
</a>
  </td>

  <td>add web-workers in lazy chunks in stats output</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21059">
  [Closes #21059]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/dc5a58528a9612b709fbd0e7bab9122ce7d680e3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/dc5a585-fix-green.svg" />
</a>
  </td>

  <td>styles CSS files not available in unit tests</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21054">
  [Closes #21054]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/699802d48853cedbf9468b94d196fd8106d43485"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/699802d-perf-orange.svg" />
</a>
  </td>

  <td>reduce memory usage by cleaning output directory before emitting</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/schematics (12.1.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a30525b68bc54a75fc0b0cc432b739c1db5da7a1"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a30525b-fix-green.svg" />
</a>
  </td>

  <td>handle updating renamed files</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/14255">
  [Closes #14255]<br />
</a>

<a href="https://github.com/angular/angular-cli/issues/21083">
  [Closes #21083]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.1.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0978ff5dc826b1a861e0492dada5f173b269c648"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0978ff5-fix-green.svg" />
</a>
  </td>

  <td>avoid shell exec when bootstrapping update command</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/cf3b22de581104d276806d7083f199049dfc93f1"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/cf3b22d-fix-green.svg" />
</a>
  </td>

  <td>correctly redirect nested Angular schematic dependency requests</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21075">
  [Closes #21075]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/76308fecaa510bebaa869d250ca2102175e1dfd1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/76308fe-feat-blue.svg" />
</a>
  </td>

  <td>support using TypeScript 4.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0c2a862db00ccfe3d309c34b3788001c719aa21d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0c2a862-fix-green.svg" />
</a>
  </td>

  <td>ensure plugin provided Webpack instance is used</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f2f15c089361bb55a809563c55a327887a401d43"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f2f15c0-fix-green.svg" />
</a>
  </td>

  <td>disable caching for ngcc synchronous Webpack resolver</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4251343aee405275ab3e5d8e3be85cab79047f43"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/4251343-feat-blue.svg" />
</a>
  </td>

  <td>create new projects with TypeScript 4.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/052b8fa4db63bf0c08aa95ca727bd18420f19f6e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/052b8fa-fix-green.svg" />
</a>
  </td>

  <td>added webWorkerTsConfig into test option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d13a8661046023419d74c2d626a6b2adc4027c90"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d13a866-fix-green.svg" />
</a>
  </td>

  <td>working with formatting</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Charles Lyding, Alan Agius, Doug Parker, Santosh Mahto, Joey Perrott
<a name="v12.0.4"></a>

# v12.0.4 (2021-06-09)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/10a263a7af99fbdafea799ae6d41d893ad888fb6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/10a263a-fix-green.svg" />
</a>
  </td>

  <td>ensure all Webpack Stats assets are present on rebuilds</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21038">
  [Closes #21038]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8575056949e1a8bc7d90d76e7647f7064d69201e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8575056-fix-green.svg" />
</a>
  </td>

  <td>dispose Sass worker resources on Webpack shutdown</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20985">
  [Closes #20985]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2b166566b615e100f17a74e96e65f69c5cb67097"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2b16656-fix-green.svg" />
</a>
  </td>

  <td>show progress during re-builds</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/83a9c469282bcbda392d9ba6fd2991b96eeb7c5e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/83a9c46-fix-green.svg" />
</a>
  </td>

  <td>correctly mark async chunks as non initial in dev-server</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3fcf3181f46a6feaf2fa9283f1465bf46f2a0714"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3fcf318-fix-green.svg" />
</a>
  </td>

  <td>add web-workers in lazy chunks in stats output</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21059">
  [Closes #21059]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7604e62e2e8a3ce4f95f11f2804d220c45cb0a04"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7604e62-fix-green.svg" />
</a>
  </td>

  <td>styles CSS files not available in unit tests</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21054">
  [Closes #21054]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4c2bd2f5a6de7eb3b1d75998fc80afc9ce8a1143"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/4c2bd2f-perf-orange.svg" />
</a>
  </td>

  <td>reduce memory usage by cleaning output directory before emitting</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/schematics (12.0.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4b98448d965080dabaacc8a9cd4f9f1387d2ec65"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/4b98448-fix-green.svg" />
</a>
  </td>

  <td>handle updating renamed files</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/14255">
  [Closes #14255]<br />
</a>

<a href="https://github.com/angular/angular-cli/issues/21083">
  [Closes #21083]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c00a045d852126bb5dc862b0e5e98ec5915ef045"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c00a045-fix-green.svg" />
</a>
  </td>

  <td>avoid shell exec when bootstrapping update command</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/814f0bb669423baf0f04e15ae739a9d4070a8dc0"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/814f0bb-fix-green.svg" />
</a>
  </td>

  <td>correctly redirect nested Angular schematic dependency requests</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/21075">
  [Closes #21075]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e09dc5c2ae56573e56f64f62421e604f86c91b29"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e09dc5c-fix-green.svg" />
</a>
  </td>

  <td>ensure plugin provided Webpack instance is used</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b867066396e11254c135822fadb12362496af67b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/b867066-fix-green.svg" />
</a>
  </td>

  <td>added webWorkerTsConfig into test option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b57580e50b0988ed4b99afbbd0d43170e41fcdce"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/b57580e-fix-green.svg" />
</a>
  </td>

  <td>working with formatting</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Santosh Mahto, Joey Perrott, Doug Parker
<a name="v12.0.3"></a>

# v12.0.3 (2021-06-02)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/19ef42a37e705cc81ec18a04fc69d01e14937136"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/19ef42a-fix-green.svg" />
</a>
  </td>

  <td>do not resolve web-workers in server builds</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20877">
  [Closes #20877]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/662a2b8409d778fa89761e5ab81afa4c5baaec38"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/662a2b8-fix-green.svg" />
</a>
  </td>

  <td>provided earlier build feedback in console</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20957">
  [Closes #20957]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/83fbaca6428f6581a2a52dee22eb3afdf6287062"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/83fbaca-fix-green.svg" />
</a>
  </td>

  <td>correctly ignore inline styles during i18n extraction</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20968">
  [Closes #20968]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bd88af5154e379a2f587edaf594b05f93af38080"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/bd88af5-perf-orange.svg" />
</a>
  </td>

  <td>update `license-webpack-plugin` to `2.3.19`</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/build-webpack (0.1200.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c68572f4eab8f129d6948fbe5f238d3d1324f1ed"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/c68572f-perf-orange.svg" />
</a>
  </td>

  <td>include only required stats in webpackStats</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.0.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bf1122bd2fc4c50e6e72739f7197b7d1e547ea4f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bf1122b-fix-green.svg" />
</a>
  </td>

  <td>show allowed enum values when validation on enum fails</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/86161a1ec3fd1bf6d93b50e5dd8ece46fe0fe9a4"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/86161a1-fix-green.svg" />
</a>
  </td>

  <td>handle complex smart defaults in schemas</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f457f0e42bc573c72c3a3bbf99d6dda3d996a326"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f457f0e-fix-green.svg" />
</a>
  </td>

  <td>handle async schema validations</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7bba44662b3d7809b45a11d7eca09493e777a762"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7bba446-fix-green.svg" />
</a>
  </td>

  <td>transform path using getSystemPath for NodeJsAsyncHost's `exists` method</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.0.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6c2642189ceed3d247cc9df97a9a4ef53dbf99d7"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6c26421-fix-green.svg" />
</a>
  </td>

  <td>update supported range of node versions to be less restrictive</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20796">
  [Closes #20796]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ff87570b22a57b0ccd0382d3244dfb53d1c4e772"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ff87570-fix-green.svg" />
</a>
  </td>

  <td>normalize paths when adding file dependencies</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20891">
  [Closes #20891]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a9c3a35fc2777926689928b68d730cbbcddfe200"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a9c3a35-fix-green.svg" />
</a>
  </td>

  <td>remove redundant inline style cache</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/06e0a724f67f4c4bdc3d1efe5c8d4c21b7669738"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/06e0a72-fix-green.svg" />
</a>
  </td>

  <td>make version 12 workspace config migration idempotent</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20979">
  [Closes #20979]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b36c0c96ec55aa93764ae5b46e932267495d9a8b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/b36c0c9-fix-green.svg" />
</a>
  </td>

  <td>show better error when non existing project is passed to the component schematic</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Doug Parker, Charles Lyding, why520crazy
<a name="v12.1.0-next.4"></a>

# v12.1.0-next.4 (2021-06-02)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/77f81dc7f72c218e3b26c92c15b927b505f91240"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/77f81dc-fix-green.svg" />
</a>
  </td>

  <td>do not resolve web-workers in server builds</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20877">
  [Closes #20877]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f9acdc75caa52366174649042e2e987b6e5c2a83"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f9acdc7-fix-green.svg" />
</a>
  </td>

  <td>provided earlier build feedback in console</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20957">
  [Closes #20957]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/92c9be44fa4510ab6eccd0dfde82696d70412b39"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/92c9be4-fix-green.svg" />
</a>
  </td>

  <td>correctly ignore inline styles during i18n extraction</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/build-webpack (0.1201.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/023d0937c44f94e297aa0980cb05e9c52d3d0045"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/023d093-perf-orange.svg" />
</a>
  </td>

  <td>include only required stats in webpackStats</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.1.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/600d266ca4ea478f8f23664140cdb4c2db26d74c"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/600d266-fix-green.svg" />
</a>
  </td>

  <td>show allowed enum values when validation on enum fails</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9f85bc5625845fd244a123477ed475b28356cf68"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9f85bc5-fix-green.svg" />
</a>
  </td>

  <td>handle complex smart defaults in schemas</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/06af7d7e7b6b3f5b854555771db3b60b9484d4b3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/06af7d7-fix-green.svg" />
</a>
  </td>

  <td>handle async schema validations</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/966c0aebbc8c80d68c859a0d0ea083c9a1ccbd23"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/966c0ae-fix-green.svg" />
</a>
  </td>

  <td>transform path using getSystemPath for NodeJsAsyncHost's `exists` method</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.1.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6467717e0286713c5d9a78b7b70faf0078865dc4"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6467717-fix-green.svg" />
</a>
  </td>

  <td>update supported range of node versions to be less restrictive</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20796">
  [Closes #20796]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3afa5567cb6c5ebfb43c2aa447f4c7d6a0e60c75"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3afa556-fix-green.svg" />
</a>
  </td>

  <td>normalize paths when adding file dependencies</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20891">
  [Closes #20891]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f9657bc919a223e449d2dd559347eed85b1f8919"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f9657bc-fix-green.svg" />
</a>
  </td>

  <td>remove redundant inline style cache</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/afc9d10688ab9308a1a8b51a80e0aedf24b66bfc"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/afc9d10-fix-green.svg" />
</a>
  </td>

  <td>make version 12 workspace config migration idempotent</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20979">
  [Closes #20979]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7cd801eb066543fe751ac6b7840c279e37b6e74a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7cd801e-fix-green.svg" />
</a>
  </td>

  <td>show better error when non existing project is passed to the component schematic</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Doug Parker, Charles Lyding, why520crazy
<a name="v12.1.0-next.3"></a>

# v12.1.0-next.3 (2021-05-26)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0-next.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c146e9c086025e49dd207e039dc738a143e5672e"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/c146e9c-feat-blue.svg" />
</a>
  </td>

  <td>enable webpack Trusted Types support</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fb21c4a968c8b4d8a3d17237d0864b795fffba49"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/fb21c4a-feat-blue.svg" />
</a>
  </td>

  <td>deprecate protractor builder</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4dc7cf952961183abcd201db6a5747a7b22e5953"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/4dc7cf9-fix-green.svg" />
</a>
  </td>

  <td>ensure Sass worker implementation supports Node.js 12.14</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bea90a6130836c79bab5d64f94eb30ddfd5a12ff"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bea90a6-fix-green.svg" />
</a>
  </td>

  <td>don't add `.hot-update.js` script tags</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20855">
  [Closes #20855]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d1953bf1aab39743058cdf73debc8493af503fc0"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d1953bf-fix-green.svg" />
</a>
  </td>

  <td>correctly generate ServiceWorker config on Windows</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20894">
  [Closes #20894]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9433bb61799d0078a6b0481acf2fb9f7a659d892"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9433bb6-fix-green.svg" />
</a>
  </td>

  <td>ensure latest inline stylesheet data is used during rebuilds</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6e07cb19c0d25a32d51ecc323bbd17eba4ed693f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6e07cb1-fix-green.svg" />
</a>
  </td>

  <td>allow  i18n extraction on application that uses web-workers</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20930">
  [Closes #20930]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/02bea8cc18ab3d514eae85fc26f970e962fe689b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/02bea8c-fix-green.svg" />
</a>
  </td>

  <td>hide stacktraces from dart-sass errors</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/861a69567c48bdb5f985c88262e5e0e70ebf2999"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/861a695-fix-green.svg" />
</a>
  </td>

  <td>resolve absolute outputPath properly</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20935">
  [Closes #20935]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7ff41e4e5a61c1e9a165aa629ae04cce2da968b5"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7ff41e4-fix-green.svg" />
</a>
  </td>

  <td>show `--disable-host-check` warning only when not using `disableHostCheck`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20951">
  [Closes #20951]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1ab2ef9a3f3d416241db9f34e285da265d9cc27f"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/1ab2ef9-perf-orange.svg" />
</a>
  </td>

  <td>disable CSS optimization parallelism for components styles</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20883">
  [Closes #20883]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/640a749515726eb9ee961a7f07a15a8e3b456d92"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/640a749-perf-orange.svg" />
</a>
  </td>

  <td>load postcss-preset-env configuration once</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.1.0-next.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/57640bebfd0de417456db6c5d3cead45d528c055"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/57640be-feat-blue.svg" />
</a>
  </td>

  <td>show Node.js version support status in version command</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20879">
  [Closes #20879]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/15e5bfa55b7a78286026a5097276b141f11d2074"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/15e5bfa-fix-green.svg" />
</a>
  </td>

  <td>ng update on windows to allow path</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.0-next.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5855374eb540d4d23855c6e00018c64be71e8b45"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/5855374-fix-green.svg" />
</a>
  </td>

  <td>re-emit component stylesheet assets</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20882">
  [Closes #20882]<br />
</a>

  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Bjarki, Hassan Sani, JoostK, George Kalpakas, Joey Perrott
<a name="v12.0.2"></a>

# v12.0.2 (2021-05-26)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6482a64b91ac5ce51e7396836f0089e3d6003d35"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6482a64-fix-green.svg" />
</a>
  </td>

  <td>ensure Sass worker implementation supports Node.js 12.14</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3764a3155b80d22ebc6a08cac8d52e5df59ccd89"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3764a31-fix-green.svg" />
</a>
  </td>

  <td>don't add `.hot-update.js` script tags</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20855">
  [Closes #20855]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/467172ce086196c56eb73c37dd02c21efdbe0e14"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/467172c-fix-green.svg" />
</a>
  </td>

  <td>correctly generate ServiceWorker config on Windows</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20894">
  [Closes #20894]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8e741e187a2885c52e97ef084b5cbbf20d9c89fe"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8e741e1-fix-green.svg" />
</a>
  </td>

  <td>ensure latest inline stylesheet data is used during rebuilds</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/224dbbc06e77a1044b988909997c6084c828bfe8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/224dbbc-fix-green.svg" />
</a>
  </td>

  <td>allow  i18n extraction on application that uses web-workers</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20930">
  [Closes #20930]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fb8bd56ceb854ca23946e88925a982b2e2747532"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/fb8bd56-fix-green.svg" />
</a>
  </td>

  <td>hide stacktraces from dart-sass errors</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b0dd4e1ad0235849013e4be049df5e0c75ee8c57"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/b0dd4e1-fix-green.svg" />
</a>
  </td>

  <td>resolve absolute outputPath properly</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20935">
  [Closes #20935]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/923f56e3ffc0ceb476cd3a5aecfbb17bff105fd6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/923f56e-fix-green.svg" />
</a>
  </td>

  <td>show `--disable-host-check` warning only when not using `disableHostCheck`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20951">
  [Closes #20951]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/394a0012abb7de3712fa8ccceac6ffe9c886d46d"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/394a001-perf-orange.svg" />
</a>
  </td>

  <td>update PostCSS to 8.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/72a7bc0d225d75560c30f295e0a2a0b5ff5802d9"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/72a7bc0-perf-orange.svg" />
</a>
  </td>

  <td>disable CSS optimization parallelism for components styles</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20883">
  [Closes #20883]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/22985624d5d7a867386c94121964e2ded91584c4"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/2298562-perf-orange.svg" />
</a>
  </td>

  <td>load postcss-preset-env configuration once</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f4e1c6712140fbbd71fb6709ae63ccc502ed1fb7"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f4e1c67-fix-green.svg" />
</a>
  </td>

  <td>ng update on windows to allow path</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/99cb11712ffa060e20b0d94719288f61285b98c9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/99cb117-fix-green.svg" />
</a>
  </td>

  <td>re-emit component stylesheet assets</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20882">
  [Closes #20882]<br />
</a>

  </td>
</tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Hassan Sani, JoostK, George Kalpakas, Joey Perrott
<a name="v12.0.1"></a>

# v12.0.1 (2021-05-19)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6b26f661e6db0f1ac1f7de50f5ab92dbeb554bd3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6b26f66-fix-green.svg" />
</a>
  </td>

  <td>add experimental web-assembly</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20762">
  [Closes #20762]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3943f5c1f1e9a9092c337cf8b79007733f664c3b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3943f5c-fix-green.svg" />
</a>
  </td>

  <td>fix error with inline styles when running extract-i18n</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/69da7553235a49caa3f552bc9c9a657b1d4fca5d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/69da755-fix-green.svg" />
</a>
  </td>

  <td>add `NG_BUILD_MAX_WORKERS` settimgs to control maximum number of workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4ac556ba636952c96685803bf33a442b3982a13d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/4ac556b-fix-green.svg" />
</a>
  </td>

  <td>non injected styles should not count as initial</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20781">
  [Closes #20781]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a125e6745afefaa77989e99e4adcfa83e999af71"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a125e67-fix-green.svg" />
</a>
  </td>

  <td>revert open to 8.0.2</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20807">
  [Closes #20807]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1e34e9874057d72261438f33a82c96e1e0b937ed"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1e34e98-fix-green.svg" />
</a>
  </td>

  <td>correctly resolve babel runtime helpers</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20800">
  [Closes #20800]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/894feaf8eeb8b22afb7740763750ddd8abaff7d4"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/894feaf-fix-green.svg" />
</a>
  </td>

  <td>compile schema in synchronously</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20847">
  [Closes #20847]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b89fdc36123e401a2df11b59b477d842fc8cec15"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/b89fdc3-perf-orange.svg" />
</a>
  </td>

  <td>execute dart-sass in a worker</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d5a46a1ba58a4f116056da205715840066f3a76b"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/d5a46a1-perf-orange.svg" />
</a>
  </td>

  <td>reduce JSON stats</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5e72056d6bcbf6b80afe65e0e6374893384e417e"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/5e72056-perf-orange.svg" />
</a>
  </td>

  <td>use CSS optimization plugin that leverages workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7718efe98ad892ffd08d253935f9be7443a4ad9f"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/7718efe-perf-orange.svg" />
</a>
  </td>

  <td>render Sass using a pool of workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b36a35d6aabac94dc604bac71f3e8619cfdf6b5d"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/b36a35d-perf-orange.svg" />
</a>
  </td>

  <td>clean no-longer used assets during builds</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.0.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a8175921880271568066f15e8d3204c411967e88"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a817592-fix-green.svg" />
</a>
  </td>

  <td>cannot locate bin for temporary package</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c0694cad3c0ad84847eaa89a2143a0d81458b12b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c0694ca-fix-green.svg" />
</a>
  </td>

  <td>clean node modules directory prior to updating</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/effc96196a917162c3d6d52057f2c5658ae15215"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/effc961-fix-green.svg" />
</a>
  </td>

  <td>improve `--prod` deprecation warning</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20806">
  [Closes #20806]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fd9ad77ab854ea5291bd172dc2a004066e46c0df"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/fd9ad77-perf-orange.svg" />
</a>
  </td>

  <td>reduce non-watch mode TypeScript diagnostic analysis overhead</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/da99ff904749ed6e9f5b3fe2055af95dff5d8f90"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/da99ff9-fix-green.svg" />
</a>
  </td>

  <td>remove --prod option from README template</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c0b6a5d38913736a820badf6154760fb23ce47df"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c0b6a5d-fix-green.svg" />
</a>
  </td>

  <td>don't add `skipTest` option to module schematic options</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20811">
  [Closes #20811]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f47e45641a2f494b7afdf5db4455ab98e73cc9f2"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f47e456-fix-green.svg" />
</a>
  </td>

  <td>add migration to remove `skipTests` from `@schematics/angular:module`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20848">
  [Closes #20848]<br />
</a>

  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Joey Perrott, Keen Yee Liau, Luca Vazzano, Pankaj Patil, Ryan Lester, Terence D. Honles, Alan Cohen

<a name="v12.1.0-next.2"></a>

# v12.1.0-next.2 (2021-05-19)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.1.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7df9d19297d1160e6b8614f1763e11b307aeef8b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7df9d19-fix-green.svg" />
</a>
  </td>

  <td>add experimental web-assembly</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20762">
  [Closes #20762]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4367c3a5626aa92b1301746519602d52bc7cd1b0"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/4367c3a-fix-green.svg" />
</a>
  </td>

  <td>add `NG_BUILD_MAX_WORKERS` settimgs to control maximum number of workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2643fb11a96befa5800683433a65b37c6bbeb6d7"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2643fb1-fix-green.svg" />
</a>
  </td>

  <td>non injected styles should not count as initial</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20781">
  [Closes #20781]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/79c5284892f79de6dfb54b5433a5fa5f6e0cb044"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/79c5284-fix-green.svg" />
</a>
  </td>

  <td>revert open to 8.0.2</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20807">
  [Closes #20807]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d34dc8853d24195f3e8cf49777664f1a353216a2"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d34dc88-fix-green.svg" />
</a>
  </td>

  <td>correctly resolve babel runtime helpers</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20800">
  [Closes #20800]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/43926a21ba1b689804d35f282f80842e8c63286a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/43926a2-fix-green.svg" />
</a>
  </td>

  <td>compile schema in synchronously</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20847">
  [Closes #20847]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/cc7f75f25b5c38c73912023cd26fd0c82192344c"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/cc7f75f-perf-orange.svg" />
</a>
  </td>

  <td>execute dart-sass in a worker</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d9566bfac84a913b6d6f6dcfb8ae94279d71708b"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/d9566bf-perf-orange.svg" />
</a>
  </td>

  <td>reduce JSON stats</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0ebf7569f6506a673996dc2f8a7edcc4cbc61d81"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/0ebf756-perf-orange.svg" />
</a>
  </td>

  <td>use CSS optimization plugin that leverages workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/438c6d932e169dbfdf2877daae40f646b7e17667"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/438c6d9-perf-orange.svg" />
</a>
  </td>

  <td>render Sass using a pool of workers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f5f41ea929444102cede1a6aef8bd75937c45a6e"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/f5f41ea-perf-orange.svg" />
</a>
  </td>

  <td>clean no-longer used assets during builds</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.1.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6e34d1bf897dcbf76d8edd40a3d70e4d3f190312"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6e34d1b-fix-green.svg" />
</a>
  </td>

  <td>cannot locate bin for temporary package</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6926b37c0c8093dd5427e80cb8da9e41a15c6cc0"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6926b37-fix-green.svg" />
</a>
  </td>

  <td>clean node modules directory prior to updating</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ddb92d815e4030abbce0cb58b460b4d8af8543ae"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ddb92d8-fix-green.svg" />
</a>
  </td>

  <td>improve `--prod` deprecation warning</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20806">
  [Closes #20806]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.1.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4f2df00511cdd0d358c040090eca68733539ac0e"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/4f2df00-perf-orange.svg" />
</a>
  </td>

  <td>reduce non-watch mode TypeScript diagnostic analysis overhead</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.1.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ff752951b0280a029eb77e2ac5bf7cd0eabdbc48"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ff75295-fix-green.svg" />
</a>
  </td>

  <td>remove --prod option from README template</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/36b5040cc470cdb2c0554785a9a368ce3c226ad1"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/36b5040-fix-green.svg" />
</a>
  </td>

  <td>don't add `skipTest` option to module schematic options</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20811">
  [Closes #20811]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1080a52c963207c731fbad2641dda357e0af539d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1080a52-fix-green.svg" />
</a>
  </td>

  <td>add migration to remove `skipTests` from `@schematics/angular:module`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20848">
  [Closes #20848]<br />
</a>

  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Joey Perrott, Keen Yee Liau, Luca Vazzano, Pankaj Patil, Ryan Lester, Alan Cohen, Paul Gschwendtner
<a name="v12.0.0"></a>

# v12.0.0 (2021-05-12)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/architect (0.1200.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1da359ac08d1a5503ab152db72ee6cee927391b8"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1da359a-feat-blue.svg" />
</a>
  </td>

  <td>add implementation for defaultConfiguration</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/93376177235108ed15a2fbba8ea079bc565802ce"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/9337617-feat-blue.svg" />
</a>
  </td>

  <td>add `postcss-preset-env` with stage 3 features</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fa5cf53b644c96a50d09dce5f9e9ee401bf66053"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/fa5cf53-feat-blue.svg" />
</a>
  </td>

  <td>drop support for karma version 5.2</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/44e75be5b127545bf87e2d6d61370944f4d380a1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/44e75be-feat-blue.svg" />
</a>
  </td>

  <td>drop support for ng-packagr version 11</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/aa3ea885ed69cfde0914abae547e15d6d499a908"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/aa3ea88-feat-blue.svg" />
</a>
  </td>

  <td>enable inlineCritical by default</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/71eab3ddb603cb70a98120012a174cb159d9b28d"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/71eab3d-feat-blue.svg" />
</a>
  </td>

  <td>show warning during build when project requires IE 11 support</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1525e7ab2c3c6cd95ee91cf01243af78174246ca"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1525e7a-feat-blue.svg" />
</a>
  </td>

  <td>expose legacy-migrate message format</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2616ef0d3fdf6821a60f5ae9dcb54d65be0506e1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/2616ef0-feat-blue.svg" />
</a>
  </td>

  <td>integrate JIT mode linker</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20281">
  [Closes #20281]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d883ce5d7e39de774fe90e4ccdbc9a84a600b7e8"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/d883ce5-feat-blue.svg" />
</a>
  </td>

  <td>upgrade to Webpack 5 throughout the build system</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d47b4417d46f85f9f5bb460576d32aa0104e6d43"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/d47b441-feat-blue.svg" />
</a>
  </td>

  <td>support processing component inline CSS styles</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bac563e5ee1efcda4bfb1334ecc0906796584cbd"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/bac563e-feat-blue.svg" />
</a>
  </td>

  <td>support specifying stylesheet language for inline component styles</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6a7d1e0be4c59b27e78d1b03c083bdb2982c3845"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6a7d1e0-fix-green.svg" />
</a>
  </td>

  <td>remove left-over `experimentalRollupPass` option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d5645675fd555e7f1afd523d4f2d42095034fc46"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d564567-fix-green.svg" />
</a>
  </td>

  <td>support writing large Webpack stat outputs</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ac4c109bebac3ea3d562f000c46a98d61b1bd148"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ac4c109-fix-green.svg" />
</a>
  </td>

  <td>ensure output directory is present before writing stats JSON</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/012700ace56d6d0e35d6798c5a19534ffa5a5a0e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/012700a-fix-green.svg" />
</a>
  </td>

  <td>remove deprecated View Engine support for i18n extraction</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/677913fc389f0ffa20e3e1928d7244427c07ef35"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/677913f-fix-green.svg" />
</a>
  </td>

  <td>remove usage of deprecated View Engine compiler</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/eca5a01f6e8d1c3ad874d74c58e6ffbddab6a031"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/eca5a01-fix-green.svg" />
</a>
  </td>

  <td>remove deprecated i18nLocale and i18nFormat options from i18n-extract</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f1453126666af62a4ac4b4adca7d4282ecac0038"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f145312-fix-green.svg" />
</a>
  </td>

  <td>update karma builder to use non-deprecated API</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bd0aba7c80cee63f6fbcb94247fdf3506e9b4afa"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bd0aba7-fix-green.svg" />
</a>
  </td>

  <td>disable webpack cache when using `NG_BUILD_CACHE`</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/cc52e5453cbf40810f56b6ea443c5f089c635a5d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/cc52e54-fix-green.svg" />
</a>
  </td>

  <td>remove duplicate application bundle generation complete message</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/27e63e2b33be48b26a44da69c09198ef9a8dce21"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/27e63e2-fix-green.svg" />
</a>
  </td>

  <td>mark programmatic builder execution functions as experimental</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/88bea1ad72e5b5df8c7e4870fa49f517c263ba05"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/88bea1a-fix-green.svg" />
</a>
  </td>

  <td>avoid double build optimizer processing</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a6e5103b9d3b3c20a5593542823d784e1e68896f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a6e5103-fix-green.svg" />
</a>
  </td>

  <td>replace Webpack 4 `hashForChunk` hook usage</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c53a17886a263e686151c440938233e5f245218d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c53a178-fix-green.svg" />
</a>
  </td>

  <td>use new Webpack watch API in karma webpack plugin</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bac34e5268b1aa9348edcf079240668bb6583b5f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bac34e5-fix-green.svg" />
</a>
  </td>

  <td>recover from CSS optimization errors</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/88467b3b659f2ae6a34f2214705d2dec4c046c76"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/88467b3-fix-green.svg" />
</a>
  </td>

  <td>disable Webpack 5 automatic public path support</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/898a486315a9e2762208c6b95b439751928e1ec7"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/898a486-fix-green.svg" />
</a>
  </td>

  <td>always inject live reload client when using live reload</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/656f8d75a3368a5affd1c55145841123dafdb007"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/656f8d7-fix-green.svg" />
</a>
  </td>

  <td>change several builder options defaults</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7a8686abe9d490f22ff25f6b02709c9e18d3c410"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7a8686a-fix-green.svg" />
</a>
  </td>

  <td>show warning when using stylus</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/33ca65aaa80c22c708c64a19f0374f5493244995"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/33ca65a-fix-green.svg" />
</a>
  </td>

  <td>avoid triggering file change after file build</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/57ac7f306b23063f50c5f63edacb9f64685ba00b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/57ac7f3-fix-green.svg" />
</a>
  </td>

  <td>remove left-over `forkTypeChecker` option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c8d2d687108701f6aec0956970683a1c3f03d0e3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c8d2d68-fix-green.svg" />
</a>
  </td>

  <td>disable CSS declaration sorting optimizations</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20693">
  [Closes #20693]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/00ff390feaeb457812d67c367f65ba799d3ac66a"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/00ff390-perf-orange.svg" />
</a>
  </td>

  <td>disable `showCircularDependencies` by default</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fa0fc45b8782910e09689bd40a6f8d2743c5b0ce"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/fa0fc45-perf-orange.svg" />
</a>
  </td>

  <td>use Webpack's GC memory caching in watch mode</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9a32ed9800eb4494e72537bacae4104692a54d70"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/9a32ed9-perf-orange.svg" />
</a>
  </td>

  <td>improve incremental time during Karma tests</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/54696e788a04c0bfad3514e2e36d420d7dee5aee"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/54696e7-perf-orange.svg" />
</a>
  </td>

  <td>avoid async downlevel for known ES2015 code</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/build-optimizer (0.1200.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1f83f305db88aeb5164f6d13869f7cc10e44527e"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1f83f30-feat-blue.svg" />
</a>
  </td>

  <td>support Webpack 5</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/build-webpack (0.1200.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ff32ada86b486d96922c693f703e25e01848d020"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/ff32ada-feat-blue.svg" />
</a>
  </td>

  <td>provide output path in builder results</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/18c954129279d68b5c02c9f486a7db34be5492d1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/18c9541-feat-blue.svg" />
</a>
  </td>

  <td>support Webpack 5</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.0.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8e981d08809a7f1084b5cae7a539217d6fe7f757"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8e981d0-feat-blue.svg" />
</a>
  </td>

  <td>add handling for `defaultConfiguration` target definition property</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/08753138d336fb870a66face70f5624ba64b4c69"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/0875313-feat-blue.svg" />
</a>
  </td>

  <td>update schema validator</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3bb3c6cd51d24fe5636cdcf63670ea164f57aa63"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3bb3c6c-fix-green.svg" />
</a>
  </td>

  <td>ensure job input values are processed in order</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4a68ad7c4b787c8daff75a80f2a36b6301a509b3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/4a68ad7-fix-green.svg" />
</a>
  </td>

  <td>improve handling of set schema values</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20594">
  [Closes #20594]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f7e3e2335dfd6f54f435c95baa024c60a94b791c"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f7e3e23-feat-blue.svg" />
</a>
  </td>

  <td>add `defaultConfiguration` property to architect schema</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a5877bf91765af71c1368fd2fb61d29079931205"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/a5877bf-feat-blue.svg" />
</a>
  </td>

  <td>deprecate `--prod` command line argument</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/985dc1a4c71693ad78c35f5d6e95397f9753239e"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/985dc1a-feat-blue.svg" />
</a>
  </td>

  <td>confirm ng add action before installation</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/79856644b4d476d50013eafee949d1a508b86104"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/7985664-feat-blue.svg" />
</a>
  </td>

  <td>support TypeScript 4.2</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b179a704829fef72191045a443b4b7eb7d20141c"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/b179a70-fix-green.svg" />
</a>
  </td>

  <td>ensure odd number Node.js version message is a warning</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/065ac4546fbb4928245609d52c1f6d81fdd48cb9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/065ac45-fix-green.svg" />
</a>
  </td>

  <td>remove npm 7 incompatibility notification</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/06335515eb05c84d8dfdbfa10f8e3201b714d5da"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0633551-fix-green.svg" />
</a>
  </td>

  <td>avoid exceptions for expected errors in architect commands</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e84fa72751b377ec4cf2419357190a79b0513377"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e84fa72-fix-green.svg" />
</a>
  </td>

  <td>ensure update migrations are fully executed</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8a805fe0b9a0db3329aa51d95a41f3baacd45feb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8a805fe-fix-green.svg" />
</a>
  </td>

  <td>exclude deprecated packages with removal migrations from update</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d68cb92dc2113753e7eefb91e54b70a60c1acd94"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d68cb92-fix-green.svg" />
</a>
  </td>

  <td>add message update updating from non LTS versions of the CLI</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5cc1a4e382b0fb43339bddbf9f2fcbddbda7744a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/5cc1a4e-fix-green.svg" />
</a>
  </td>

  <td>ignore `tsickle` during updates</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/cd198d5f2f04558bb7f518c6db19a6236f83b620"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/cd198d5-fix-green.svg" />
</a>
  </td>

  <td>run all migrations when updating from or between prereleases</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7c288c81a0caa9dba098c49e29f38d9dbd38c55b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7c288c8-fix-green.svg" />
</a>
  </td>

  <td>add package manager name and version in `ng version` output</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/07e8bf99903daa72914d192ba6d7a43b7f8652b8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/07e8bf9-fix-green.svg" />
</a>
  </td>

  <td>Support XDG Base Directory Specfication</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3a231300ba046ce1e2a11ab98bb16f1be7ba25a8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3a23130-fix-green.svg" />
</a>
  </td>

  <td>don't display options multiple times in schematics help output</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/95cb13e6e3377a52cc67f89196ae8322743d3b08"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/95cb13e-fix-green.svg" />
</a>
  </td>

  <td>change package installation to async</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bc015937b2117f47c0caa5cad265b938d5b1afe6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bc01593-fix-green.svg" />
</a>
  </td>

  <td>infer schematic defaults correctly when using `--project`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20666">
  [Closes #20666]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8b0cefbed2e9253313067b5b715844ddac3fd808"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8b0cefb-fix-green.svg" />
</a>
  </td>

  <td>propagate update's force option to package managers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/853fdffcb8752bc2217bdad2d8bb23a26457c63e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/853fdff-fix-green.svg" />
</a>
  </td>

  <td>allow unsetting config when value is `undefined`</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c0efbe7c67a3edb2dd053fbce2f9debb1bdd180b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c0efbe7-fix-green.svg" />
</a>
  </td>

  <td>allow config object to be of JSON.</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8524d20fd7484449971df894a977aa5be83cb3ec"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8524d20-fix-green.svg" />
</a>
  </td>

  <td>disallow additional properties in builders sections</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/789e05d800c1093881d24a066fb7881c26332349"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/789e05d-feat-blue.svg" />
</a>
  </td>

  <td>support Webpack 5</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0dc73276cafd42415dcaa6507ab221f1116273b5"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/0dc7327-feat-blue.svg" />
</a>
  </td>

  <td>drop support for string based lazy loading</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/46e9d0e8a646805ba9e48aac1bc95761f2668571"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/46e9d0e-feat-blue.svg" />
</a>
  </td>

  <td>support multiple plugin instances per compilation</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5e5b2d9b1a15dc0f4f1690bab109bdd8e5613be3"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/5e5b2d9-feat-blue.svg" />
</a>
  </td>

  <td>support generating data URIs for inline component styles in JIT</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8c7d56e03adb9c3303760fc2e38e2d6d96452bac"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8c7d56e-feat-blue.svg" />
</a>
  </td>

  <td>support processing inline component styles in AOT</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3504c43e48d8e265ca0943005f3cea2d25290cbd"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3504c43-fix-green.svg" />
</a>
  </td>

  <td>remove Webpack 5 deprecation warning in resource loader</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/430ee441bd2e5729a8a24f72a1df8fd782c9f9f6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/430ee44-fix-green.svg" />
</a>
  </td>

  <td>use correct Webpack asset stage in resource loader</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/160102ae57d780dded6c9002faf07b601a866d3d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/160102a-fix-green.svg" />
</a>
  </td>

  <td>remove Webpack plugin for deprecated ViewEngine compiler</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ca5ceaa10780bf5d05262bd2bc2e5909d51d3aa9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ca5ceaa-fix-green.svg" />
</a>
  </td>

  <td>only track actual resource file dependencies</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/95aa2b8f925ee295b8edf659b5d8e706d122ffec"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/95aa2b8-perf-orange.svg" />
</a>
  </td>

  <td>avoid adding transitive dependencies to Webpack's dependency graph</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/dfefd6ba4fcda6baa3dc172978ca84acaa48ec54"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/dfefd6b-perf-orange.svg" />
</a>
  </td>

  <td>use precalculated dependencies in unused file check</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/aeebd14f04b8e520b0144a77e765da807a08dda0"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/aeebd14-perf-orange.svg" />
</a>
  </td>

  <td>only check affected files for Angular semantic diagnostics</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/22ac3b387c2a4231556e188bb7e6d9eda6989a39"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/22ac3b3-perf-orange.svg" />
</a>
  </td>

  <td>cache results of processed inline resources</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/057ba0cfefe9ae22bc90ffa4d7ab2aebd4848c93"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/057ba0c-perf-orange.svg" />
</a>
  </td>

  <td>rebuild Angular required files asynchronously</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1ec630fa88bfc818eea9d0810b2c7a6bf8268eb5"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/1ec630f-perf-orange.svg" />
</a>
  </td>

  <td>reduce source file and Webpack module iteration</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f424529d9ccaeb16643a8383ad3647af82062b16"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f424529-feat-blue.svg" />
</a>
  </td>

  <td>add migration to remove deprecated options from 'angular.json'</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b105ed63c7610dd1397a3d24d4a7439564a019aa"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/b105ed6-feat-blue.svg" />
</a>
  </td>

  <td>strict mode by default</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bb38f85202f749040b241c8277280fab21c3379c"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/bb38f85-feat-blue.svg" />
</a>
  </td>

  <td>use new zone.js entry-points</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7d57dd2f3e7d36cc4ed2c356f79139486790cbfa"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/7d57dd2-feat-blue.svg" />
</a>
  </td>

  <td>add migration to use new zone.js entry-points</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/96a4467ce90fb6b88f5be39f73c8fd64ce057a4a"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/96a4467-feat-blue.svg" />
</a>
  </td>

  <td>add migration to remove emitDecoratorMetadata</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1199205bc2844e2c83d8f8e5092e89f8bd24eec1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1199205-feat-blue.svg" />
</a>
  </td>

  <td>augment `universal` schematics to import `platform-server` shims</td>

  <td>
<a href="https://github.com/angular/angular/issues/40559">
  [Closes #40559]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d19d2ccae55f96d4d8260da6572f34a47616a89b"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/d19d2cc-feat-blue.svg" />
</a>
  </td>

  <td>update new project dependencies version</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20106">
  [Closes #20106]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1de6d71edd899465a01c65790f6fb04159acc821"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1de6d71-feat-blue.svg" />
</a>
  </td>

  <td>production builds by default</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3b7470d4836bcfff31ee4bf90ec4396f2905c633"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/3b7470d-feat-blue.svg" />
</a>
  </td>

  <td>deprecate `legacyBrowsers` application and ng-new option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f4875b967ae9ca5640cb27bfb37166528cab88d8"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f4875b9-feat-blue.svg" />
</a>
  </td>

  <td>add migration to remove `lazyModules` configuration option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3ee12af89be58ccea8996e2e86a18a23d193abbe"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/3ee12af-feat-blue.svg" />
</a>
  </td>

  <td>add migration to update lazy loading string syntax to use dynamic imports</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/81129e12d0ae4cbaeb5ab537facb7990be9b8b45"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/81129e1-feat-blue.svg" />
</a>
  </td>

  <td>update several TypeScript compilation target (Syntax)</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/226a8d274d27d191651926bc7970af11cfee2597"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/226a8d2-feat-blue.svg" />
</a>
  </td>

  <td>remove tslint and codelyzer from new projects</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20105">
  [Closes #20105]<br />
</a>

<a href="https://github.com/angular/angular-cli/issues/18465">
  [Closes #18465]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c7e126609f4a0d86bd47a226717ab6430fd85cfd"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/c7e1266-feat-blue.svg" />
</a>
  </td>

  <td>add production by default optional migration</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f22f7e7371c0daa2dc59110cd21e3ff3fb4620d5"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f22f7e7-feat-blue.svg" />
</a>
  </td>

  <td>update new workspaces to use Karma 6.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8582ddc35e153b8bc409d0505f29bc43e6cef455"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8582ddc-feat-blue.svg" />
</a>
  </td>

  <td>remove `entryComponent` from `component` schematic</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/695a01ba02b8c6e9656ed5ed5b0c5e17760ba21d"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/695a01b-feat-blue.svg" />
</a>
  </td>

  <td>configure new libraries to be published in Ivy partial mode</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/84e023120864c014a2d1a275265c0941a0a16df2"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/84e0231-feat-blue.svg" />
</a>
  </td>

  <td>update `jasmine-spec-reporter` to version 7</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e33a3061f02828303e3c6ef508b5b23cbc73eef2"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/e33a306-feat-blue.svg" />
</a>
  </td>

  <td>migrate web workers to support Webpack 5</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/575b1a75b17f0b03748c137c07976e00be4c8b51"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/575b1a7-fix-green.svg" />
</a>
  </td>

  <td>only update removed v12 options in migration</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ba6f546a026a3dba613c1c54ce0c767fe0940d0f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ba6f546-fix-green.svg" />
</a>
  </td>

  <td>add `additionalProperties` to all schemas</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/663c4bc9c10aa3df3defa188a1ba8f90c63b2722"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/663c4bc-fix-green.svg" />
</a>
  </td>

  <td>remove references to the prod flag</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3bf831fac6166f6943a78b34bfd5f3c167f8911d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3bf831f-fix-green.svg" />
</a>
  </td>

  <td>only show legacy browsers deprecation warning when option is used</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/09daf7a7e0886738f25f071aa5e072e1dc06bf7e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/09daf7a-fix-green.svg" />
</a>
  </td>

  <td>remove leftover workspace tslint config</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fb14945c02a3f150d6965e77324416b1ec7cc575"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/fb14945-fix-green.svg" />
</a>
  </td>

  <td>correctly handle adding multi-line strings to `@NgModule` metadata</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/645353db26e9d6e8f893322a52b320ccd5ca1d5d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/645353d-fix-green.svg" />
</a>
  </td>

  <td>run update-i18n migration for server builder</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/df988c249363682aa6f9d3d95ae3b8636e24ebf9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/df988c2-fix-green.svg" />
</a>
  </td>

  <td>update web-worker to support Webpack 5</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1bf976f663e938164eb3ff55540ea0b3934d3a00"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1bf976f-fix-green.svg" />
</a>
  </td>

  <td>set `inlineStyleLanguage` when application `style` option is used</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ab44cb2df79da301dc5cde167bc8a51cfe15e1d6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ab44cb2-fix-green.svg" />
</a>
  </td>

  <td>set `inlineStyleLanguage` for universal if present in build options</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/21b601b5a77a70c6239249833e8639d7dd9cee98"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/21b601b-fix-green.svg" />
</a>
  </td>

  <td>remove jasmine-spec-reporter and ts-node from default workspace</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/81471c06cf8583ec81a409c2c8037edf784c945e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/81471c0-fix-green.svg" />
</a>
  </td>

  <td>remove Protractor from home page</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bc3f8dc34265f9a31dffd92598a03c0d8fe88aa5"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bc3f8dc-fix-green.svg" />
</a>
  </td>

  <td>remove lint command from package.json</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20618">
  [Closes #20618]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0ca35b1d47fa5003e4ed5d821b5573d6352a4dcc"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0ca35b1-fix-green.svg" />
</a>
  </td>

  <td>fix migration for namedChunks and option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/82158881a49b3104783c971e8a8155480fe13042"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8215888-fix-green.svg" />
</a>
  </td>

  <td>add "type" option in enum schematic</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/89360ab4876db6fcf92f5508971da49228543e08"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/89360ab-fix-green.svg" />
</a>
  </td>

  <td>only run `emitDecoratorMetadata` removal migration in safe workspaces</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ec7f3ad19c21e7a7106ff6a44edf676168b46054"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ec7f3ad-fix-green.svg" />
</a>
  </td>

  <td>replace `clientProject` with `project`</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

<a href="#breaking-changes">&nbsp;</a>

# Breaking Changes

<h3>
    @schematics/angular: remove `stylus` from `style` options (<a href="https://github.com/angular/angular-cli/commit/fd729aca0e74c242797d4697786fbede06bc844b">fd729ac</a>)
</h3>
`styl` (Stylus) is no longer a supported value as `style` in `application`, `component`, `ng-new` schematics. Stylus is not actively maintained and only 0.3% of the Angular CLI users use it.

(cherry picked from commit 0272fc55b67d1a3f986b996c8eb21aea31eedf51)

<h3>
    @angular-devkit/build-angular: change several builder options defaults (<a href="https://github.com/angular/angular-cli/commit/656f8d75a3368a5affd1c55145841123dafdb007">656f8d7</a>)
</h3>
A number of browser and server builder options have had their default values changed. The aim of these changes is to reduce the configuration complexity and support the new "production builds by default" initiative.

**Browser builder**
| Option | Previous default value | New default value |
|----------------------------------------|---------------------------|-------------------|
| optimization | false | true |
| aot | false | true |
| buildOptimizer | false | true |
| sourceMap | true | false |
| extractLicenses | false | true |
| namedChunks | true | false |
| vendorChunk | true | false |

**Server builder**
| Option | Previous default value | New default value |
|---------------|------------------------|-------------------|
| optimization | false | true |
| sourceMap | true | false |

(cherry picked from commit 0a74d0d28daf68510459ed73ef048c91bfcabbbc)

<h3>
    @angular-devkit/core: update schema validator (<a href="https://github.com/angular/angular-cli/commit/08753138d336fb870a66face70f5624ba64b4c69">0875313</a>)
</h3>
support for JSON Schema draft-04 and draft-06 is removed. If you have schemas using the `id` keyword replace them with `$id`. For an interim period we will auto rename any top level `id` keyword to `$id`.

**NB**: This change only effects schematics and builders authors.

<h3>
    @angular-devkit/build-angular: upgrade to Webpack 5 throughout the build system (<a href="https://github.com/angular/angular-cli/commit/d883ce5d7e39de774fe90e4ccdbc9a84a600b7e8">d883ce5</a>)
</h3>
Webpack 5 lazy loaded file name changes
Webpack 5 generates similar but differently named files for lazy loaded JavaScript files in development configurations (when the `namedChunks` option is enabled).
For the majority of users this change should have no effect on the application and/or build process. Production builds should also not be affected as the `namedChunks` option is disabled by default in production configurations.
However, if a project's post-build process makes assumptions as to the file names then adjustments may need to be made to account for the new naming paradigm.
Such post-build processes could include custom file transformations after the build, integration into service-side frameworks, or deployment procedures.
Example development file name change: `lazy-lazy-module.js` --> `src_app_lazy_lazy_module_ts.js`

Webpack 5 now includes web worker support. However, the structure of the URL within the `Worker` constructor must be in a specific format that differs from the current requirement.
Web worker usage should be updated as shown below (where `./app.worker` should be replaced with the actual worker name):
Before: `new Worker('./app.worker', ...)`
After: `new Worker(new URL('./app.worker', import.meta.url), ...)`

<h3>
    @ngtools/webpack: remove Webpack plugin for deprecated ViewEngine compiler (<a href="https://github.com/angular/angular-cli/commit/160102ae57d780dded6c9002faf07b601a866d3d">160102a</a>)
</h3>
Removal of View Engine support from application builds
With the removal of the deprecated View Engine compiler in Angular version 12 for applications, the View Engine Webpack plugin has been removed.
The Ivy-based Webpack plugin is the default used within the Angular CLI.
If using a custom standalone Webpack configuration, the removed `AngularCompilerPlugin` should be replaced with the Ivy-based `AngularWebpackPlugin`.

<h3>
    @angular-devkit/build-angular: remove deprecated i18n options from server and browser builder (<a href="https://github.com/angular/angular-cli/commit/5cf9a08dc7a1c84568d00df8f957d55b10ce0193">5cf9a08</a>)
</h3>
Removal of deprecated browser and server command options.
- `i18nFile`,  use `locales` object in the project metadata instead.
- `i18nFormat`, No longer needed as the format will be determined automatically.
- `i18nLocale`, use `localize` option instead.

<h3>
    @angular-devkit/build-angular: remove deprecated i18nLocale and i18nFormat options from i18n-extract (<a href="https://github.com/angular/angular-cli/commit/eca5a01f6e8d1c3ad874d74c58e6ffbddab6a031">eca5a01</a>)
</h3>
Removal of deprecated `extract-i18n` command options
The deprecated `i18nLocale` option has been removed and the `i18n.sourceLocale` within a project's configuration should be used instead.
The deprecated `i18nFormat` option has been removed and the `format` option should be used instead.

<h3>
    @angular-devkit/build-angular: remove usage of deprecated View Engine compiler (<a href="https://github.com/angular/angular-cli/commit/677913fc389f0ffa20e3e1928d7244427c07ef35">677913f</a>)
</h3>
Removal of View Engine support from application builds
With the removal of the deprecated View Engine compiler in Angular version 12 for applications, Ivy-based compilation will always be used when building an application.
The default behavior for applications is to use the Ivy compiler when building and no changes are required for these applications.
For applications that have opted-out of Ivy, a warning will be shown and an Ivy-based build will be attempted. If the build fails,
the application may need to be updated to become Ivy compatible.

<h3>
    @schematics/angular: remove `entryComponent` from `component` schematic (<a href="https://github.com/angular/angular-cli/commit/8582ddc35e153b8bc409d0505f29bc43e6cef455">8582ddc</a>)
</h3>
`entryComponent` option has been removed from the `component` schematic as this was intended to be used with the the now no longer supported ViewEngine rendering engine.

<h3>
    @angular-devkit/build-angular: remove view engine app-shell generation (<a href="https://github.com/angular/angular-cli/commit/1c2aeeb46a23fd511c89f9c8800ac2a5ab0c2734">1c2aeeb</a>)
</h3>
App-shell builder now only supports generation using Ivy

<h3>
    @angular-devkit/build-angular: remove deprecated View Engine support for i18n extraction (<a href="https://github.com/angular/angular-cli/commit/012700ace56d6d0e35d6798c5a19534ffa5a5a0e">012700a</a>)
</h3>
Removal of View Engine support from i18n extraction
With the removal of the deprecated View Engine compiler in Angular version 12 for applications, the `ng extract-i18n` command will now always use the Ivy compiler.
The `--ivy` option has also been removed as Ivy-based extraction is always enabled.
The default behavior for applications is to use the Ivy compiler for building/extraction and no changes are required for these applications.
For applications that have opted-out of Ivy, a warning will be shown and Ivy-based extraction will be attempted. If the extraction fails,
the application may need to be updated to become Ivy compatible.

<h3>
    @angular/cli: confirm ng add action before installation (<a href="https://github.com/angular/angular-cli/commit/985dc1a4c71693ad78c35f5d6e95397f9753239e">985dc1a</a>)
</h3>
The `ng add` command will now ask the user to confirm the package and version prior to installing and executing an uninstalled package.
This new behavior allows a user to abort the action if the version selected is not appropriate or if a typo occurred on the command line and an incorrect package would be installed.
A `--skip-confirmation` option has been added to skip the prompt and directly install and execute the package. This option is useful in CI and non-TTY scenarios such as automated scripts.

<h3>
    @angular-devkit/build-angular: remove deprecated `lazyModules` option (<a href="https://github.com/angular/angular-cli/commit/8d669123236c49e7f6bee1a7171c002abe03df1a">8d66912</a>)
</h3>
Server and Browser builder `lazyModules` option has been removed without replacement.

<h3>
    @ngtools/webpack: drop support for string based lazy loading (<a href="https://github.com/angular/angular-cli/commit/0dc73276cafd42415dcaa6507ab221f1116273b5">0dc7327</a>)
</h3>
With this change we drop support for string based lazy loading `./lazy.module#LazyModule`  use dynamic imports instead.

The following options which were used to support the above syntax were removed without replacement.

- discoverLazyRoutes
- additionalLazyModules
- additionalLazyModuleResources
- contextElementDependencyConstructor

<h3>
    @angular-devkit/build-angular: enable inlineCritical by default (<a href="https://github.com/angular/angular-cli/commit/aa3ea885ed69cfde0914abae547e15d6d499a908">aa3ea88</a>)
</h3>
Critical CSS inlining is now enabled by default. If you wish to turn this off set `inlineCritical` to `false`.

See: https://angular.io/guide/workspace-config#optimization-configuration

<h3>
    @angular-devkit/build-angular: drop support for zone.js 0.10 (<a href="https://github.com/angular/angular-cli/commit/f309516bcdcee711fc5693b5f14d6fef1cfa5dba">f309516</a>)
</h3>
Minimum supported `zone.js` version is `0.11.4`

<h3>
    @angular-devkit/build-angular: drop support for ng-packagr version 11 (<a href="https://github.com/angular/angular-cli/commit/44e75be5b127545bf87e2d6d61370944f4d380a1">44e75be</a>)
</h3>
Minimum supported `ng-packagr` version is `12.0.0-next`

<h3>
    @angular-devkit/build-angular: drop support for karma version 5.2 (<a href="https://github.com/angular/angular-cli/commit/fa5cf53b644c96a50d09dce5f9e9ee401bf66053">fa5cf53</a>)
</h3>
Minimum supported `karma` version is `6.0.0`

<h3>
    set minimum Node.js version to 12.13 (<a href="https://github.com/angular/angular-cli/commit/d1f616930de4a8312e3441410098d9f248855d9d">d1f6169</a>)
</h3>
Node.js version 10 will become EOL on 2021-04-30.
Angular CLI 12 will require Node.js 12.13+ or 14.15+. Node.js 12.13 and 14.15 are the first LTS releases for their respective majors.

<h3>
    @angular-devkit/build-angular: remove file-loader dependency (<a href="https://github.com/angular/angular-cli/commit/6732294ff34ca35698cec5a9ca91b664dd684289">6732294</a>)
</h3>
The unsupported/undocumented, Webpack specific functionality to `import`/`require()` a non-module file has been removed.

Before

```js
import img from './images/asset.png';
```

After

```html
<img src="images/asset.png" />
```

---

# Special Thanks

Alan Agius, Charles Lyding, Keen Yee Liau, Joey Perrott, Doug Parker, Cédric Exbrayat, Douglas Parker, George Kalpakas, Sam Bulatov, Joshua Chapman, Santosh Yadav, David Shevitz, Kristiyan Kostadinov
<a name="v12.0.0-rc.3"></a>

# v12.0.0-rc.3 (2021-05-10)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular/cli (12.0.0-rc.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8b0cefbed2e9253313067b5b715844ddac3fd808"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8b0cefb-fix-green.svg" />
</a>
  </td>

  <td>propagate update's force option to package managers</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/853fdffcb8752bc2217bdad2d8bb23a26457c63e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/853fdff-fix-green.svg" />
</a>
  </td>

  <td>allow unsetting config when value is `undefined`</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c0efbe7c67a3edb2dd053fbce2f9debb1bdd180b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c0efbe7-fix-green.svg" />
</a>
  </td>

  <td>allow config object to be of JSON.</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8524d20fd7484449971df894a977aa5be83cb3ec"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8524d20-fix-green.svg" />
</a>
  </td>

  <td>disallow additional properties in builders sections</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

# Special Thanks

Alan Agius, Charles Lyding, Joey Perrott
<a name="v12.0.0-rc.2"></a>

# v12.0.0-rc.2 (2021-05-05)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0-rc.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c8d2d687108701f6aec0956970683a1c3f03d0e3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c8d2d68-fix-green.svg" />
</a>
  </td>

  <td>disable CSS declaration sorting optimizations</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20693">
  [Closes #20693]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-rc.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3a231300ba046ce1e2a11ab98bb16f1be7ba25a8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3a23130-fix-green.svg" />
</a>
  </td>

  <td>don't display options multiple times in schematics help output</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/95cb13e6e3377a52cc67f89196ae8322743d3b08"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/95cb13e-fix-green.svg" />
</a>
  </td>

  <td>change package installation to async</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bc015937b2117f47c0caa5cad265b938d5b1afe6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bc01593-fix-green.svg" />
</a>
  </td>

  <td>infer schematic defaults correctly when using `--project`</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20666">
  [Closes #20666]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-rc.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/057ba0cfefe9ae22bc90ffa4d7ab2aebd4848c93"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/057ba0c-perf-orange.svg" />
</a>
  </td>

  <td>rebuild Angular required files asynchronously</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1ec630fa88bfc818eea9d0810b2c7a6bf8268eb5"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/1ec630f-perf-orange.svg" />
</a>
  </td>

  <td>reduce source file and Webpack module iteration</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-rc.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/82158881a49b3104783c971e8a8155480fe13042"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8215888-fix-green.svg" />
</a>
  </td>

  <td>add "type" option in enum schematic</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/89360ab4876db6fcf92f5508971da49228543e08"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/89360ab-fix-green.svg" />
</a>
  </td>

  <td>only run `emitDecoratorMetadata` removal migration in safe workspaces</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ec7f3ad19c21e7a7106ff6a44edf676168b46054"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ec7f3ad-fix-green.svg" />
</a>
  </td>

  <td>replace `clientProject` with `project`</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Keen Yee Liau, Sam Bulatov, Doug Parker
<a name="v12.0.0-rc.1"></a>

# v12.0.0-rc.1 (2021-04-28)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0-rc.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/57ac7f306b23063f50c5f63edacb9f64685ba00b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/57ac7f3-fix-green.svg" />
</a>
  </td>

  <td>remove left-over `forkTypeChecker` option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/46a5261cd0e857501d616ee9dbae41415498c54b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/46a5261-fix-green.svg" />
</a>
  </td>

  <td>output webpack-dev-server and webpack-dev-middleware errors</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9a32ed9800eb4494e72537bacae4104692a54d70"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/9a32ed9-perf-orange.svg" />
</a>
  </td>

  <td>improve incremental time during Karma tests</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/54696e788a04c0bfad3514e2e36d420d7dee5aee"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/54696e7-perf-orange.svg" />
</a>
  </td>

  <td>avoid async downlevel for known ES2015 code</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.0.0-rc.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/4a68ad7c4b787c8daff75a80f2a36b6301a509b3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/4a68ad7-fix-green.svg" />
</a>
  </td>

  <td>improve handling of set schema values</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20594">
  [Closes #20594]<br />
</a>

  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-rc.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7c288c81a0caa9dba098c49e29f38d9dbd38c55b"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7c288c8-fix-green.svg" />
</a>
  </td>

  <td>add package manager name and version in `ng version` output</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/07e8bf99903daa72914d192ba6d7a43b7f8652b8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/07e8bf9-fix-green.svg" />
</a>
  </td>

  <td>Support XDG Base Directory Specfication</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-rc.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/21b601b5a77a70c6239249833e8639d7dd9cee98"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/21b601b-fix-green.svg" />
</a>
  </td>

  <td>remove jasmine-spec-reporter and ts-node from default workspace</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/81471c06cf8583ec81a409c2c8037edf784c945e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/81471c0-fix-green.svg" />
</a>
  </td>

  <td>remove Protractor from home page</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bc3f8dc34265f9a31dffd92598a03c0d8fe88aa5"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bc3f8dc-fix-green.svg" />
</a>
  </td>

  <td>remove lint command from package.json</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20618">
  [Closes #20618]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/dd1d4efd592e5ed5338e17e80042e10dbf29eb8d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/dd1d4ef-fix-green.svg" />
</a>
  </td>

  <td>avoid unuse imports for canLoad guard generation</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0ca35b1d47fa5003e4ed5d821b5573d6352a4dcc"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0ca35b1-fix-green.svg" />
</a>
  </td>

  <td>fix migration for namedChunks and option</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/schematics-cli (12.0.0-rc.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/94957d18bc80110614116996d83f68d8433c9ab8"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/94957d1-fix-green.svg" />
</a>
  </td>

  <td>accept windows like paths for schematics</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Alan Agius, Charles Lyding, Joey Perrott, Cédric Exbrayat, Doug Parker, Joshua Chapman, Billy Lando, Santosh Yadav, mzocateli
<a name="v12.0.0-rc.0"></a>

# v12.0.0-rc.0 (2021-04-21)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0-rc.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/88bea1ad72e5b5df8c7e4870fa49f517c263ba05"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/88bea1a-fix-green.svg" />
</a>
  </td>

  <td>avoid double build optimizer processing</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a6e5103b9d3b3c20a5593542823d784e1e68896f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a6e5103-fix-green.svg" />
</a>
  </td>

  <td>replace Webpack 4 `hashForChunk` hook usage</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c53a17886a263e686151c440938233e5f245218d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c53a178-fix-green.svg" />
</a>
  </td>

  <td>use new Webpack watch API in karma webpack plugin</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bac34e5268b1aa9348edcf079240668bb6583b5f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bac34e5-fix-green.svg" />
</a>
  </td>

  <td>recover from CSS optimization errors</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/88467b3b659f2ae6a34f2214705d2dec4c046c76"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/88467b3-fix-green.svg" />
</a>
  </td>

  <td>disable Webpack 5 automatic public path support</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/898a486315a9e2762208c6b95b439751928e1ec7"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/898a486-fix-green.svg" />
</a>
  </td>

  <td>always inject live reload client when using live reload</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/656f8d75a3368a5affd1c55145841123dafdb007"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/656f8d7-fix-green.svg" />
</a>
  </td>

  <td>change several builder options defaults</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7a8686abe9d490f22ff25f6b02709c9e18d3c410"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7a8686a-fix-green.svg" />
</a>
  </td>

  <td>show warning when using stylus</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a11f4644861616f7d0929e62ae9833e795dd8649"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a11f464-fix-green.svg" />
</a>
  </td>

  <td>set Tailwind CSS mode when using Tailwind</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/33ca65aaa80c22c708c64a19f0374f5493244995"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/33ca65a-fix-green.svg" />
</a>
  </td>

  <td>avoid triggering file change after file build</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fa0fc45b8782910e09689bd40a6f8d2743c5b0ce"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/fa0fc45-perf-orange.svg" />
</a>
  </td>

  <td>use Webpack's GC memory caching in watch mode</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-rc.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5cc1a4e382b0fb43339bddbf9f2fcbddbda7744a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/5cc1a4e-fix-green.svg" />
</a>
  </td>

  <td>ignore `tsickle` during updates</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/cd198d5f2f04558bb7f518c6db19a6236f83b620"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/cd198d5-fix-green.svg" />
</a>
  </td>

  <td>run all migrations when updating from or between prereleases</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-rc.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ca5ceaa10780bf5d05262bd2bc2e5909d51d3aa9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ca5ceaa-fix-green.svg" />
</a>
  </td>

  <td>only track actual resource file dependencies</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/22ac3b387c2a4231556e188bb7e6d9eda6989a39"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/22ac3b3-perf-orange.svg" />
</a>
  </td>

  <td>cache results of processed inline resources</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-rc.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1bf976f663e938164eb3ff55540ea0b3934d3a00"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1bf976f-fix-green.svg" />
</a>
  </td>

  <td>set `inlineStyleLanguage` when application `style` option is used</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ab44cb2df79da301dc5cde167bc8a51cfe15e1d6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ab44cb2-fix-green.svg" />
</a>
  </td>

  <td>set `inlineStyleLanguage` for universal if present in build options</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @schematics/angular: remove `stylus` from `style` options (<a href="https://github.com/angular/angular-cli/commit/fd729aca0e74c242797d4697786fbede06bc844b">fd729ac</a>)
</h3>
`styl` (Stylus) is no longer a supported value as `style` in `application`, `component`, `ng-new` schematics. Stylus is not actively maintained and only 0.3% of the Angular CLI users use it.

(cherry picked from commit 0272fc55b67d1a3f986b996c8eb21aea31eedf51)

<h3>
    @angular-devkit/build-angular: change several builder options defaults (<a href="https://github.com/angular/angular-cli/commit/656f8d75a3368a5affd1c55145841123dafdb007">656f8d7</a>)
</h3>
A number of browser and server builder options have had their default values changed. The aim of these changes is to reduce the configuration complexity and support the new "production builds by default" initiative.

**Browser builder**
| Option | Previous default value | New default value |
|----------------------------------------|---------------------------|-------------------|
| optimization | false | true |
| aot | false | true |
| buildOptimizer | false | true |
| sourceMap | true | false |
| extractLicenses | false | true |
| namedChunks | true | false |
| vendorChunk | true | false |

**Server builder**
| Option | Previous default value | New default value |
|---------------|------------------------|-------------------|
| optimization | false | true |
| sourceMap | true | false |

(cherry picked from commit 0a74d0d28daf68510459ed73ef048c91bfcabbbc)

---

# Special Thanks

Alan Agius, Charles Lyding, Keen Yee Liau, Joey Perrott, David Shevitz
<a name="v12.0.0-next.9"></a>

# v12.0.0-next.9 (2021-04-14)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0-next.9)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d883ce5d7e39de774fe90e4ccdbc9a84a600b7e8"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/d883ce5-feat-blue.svg" />
</a>
  </td>

  <td>upgrade to Webpack 5 throughout the build system</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d47b4417d46f85f9f5bb460576d32aa0104e6d43"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/d47b441-feat-blue.svg" />
</a>
  </td>

  <td>support processing component inline CSS styles</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bac563e5ee1efcda4bfb1334ecc0906796584cbd"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/bac563e-feat-blue.svg" />
</a>
  </td>

  <td>support specifying stylesheet language for inline component styles</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f1453126666af62a4ac4b4adca7d4282ecac0038"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f145312-fix-green.svg" />
</a>
  </td>

  <td>update karma builder to use non-deprecated API</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bd0aba7c80cee63f6fbcb94247fdf3506e9b4afa"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/bd0aba7-fix-green.svg" />
</a>
  </td>

  <td>disable webpack cache when using `NG_BUILD_CACHE`</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/cc52e5453cbf40810f56b6ea443c5f089c635a5d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/cc52e54-fix-green.svg" />
</a>
  </td>

  <td>remove duplicate application bundle generation complete message</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/27e63e2b33be48b26a44da69c09198ef9a8dce21"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/27e63e2-fix-green.svg" />
</a>
  </td>

  <td>mark programmatic builder execution functions as experimental</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/build-webpack (0.1200.0-next.9)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/18c954129279d68b5c02c9f486a7db34be5492d1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/18c9541-feat-blue.svg" />
</a>
  </td>

  <td>support Webpack 5</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.0.0-next.9)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/08753138d336fb870a66face70f5624ba64b4c69"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/0875313-feat-blue.svg" />
</a>
  </td>

  <td>update schema validator</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.9)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d68cb92dc2113753e7eefb91e54b70a60c1acd94"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d68cb92-fix-green.svg" />
</a>
  </td>

  <td>add message update updating from non LTS versions of the CLI</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.9)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/46e9d0e8a646805ba9e48aac1bc95761f2668571"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/46e9d0e-feat-blue.svg" />
</a>
  </td>

  <td>support multiple plugin instances per compilation</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5e5b2d9b1a15dc0f4f1690bab109bdd8e5613be3"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/5e5b2d9-feat-blue.svg" />
</a>
  </td>

  <td>support generating data URIs for inline component styles in JIT</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8c7d56e03adb9c3303760fc2e38e2d6d96452bac"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8c7d56e-feat-blue.svg" />
</a>
  </td>

  <td>support processing inline component styles in AOT</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.9)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/695a01ba02b8c6e9656ed5ed5b0c5e17760ba21d"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/695a01b-feat-blue.svg" />
</a>
  </td>

  <td>configure new libraries to be published in Ivy partial mode</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/84e023120864c014a2d1a275265c0941a0a16df2"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/84e0231-feat-blue.svg" />
</a>
  </td>

  <td>update `jasmine-spec-reporter` to version 7</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e33a3061f02828303e3c6ef508b5b23cbc73eef2"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/e33a306-feat-blue.svg" />
</a>
  </td>

  <td>migrate web workers to support Webpack 5</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/df988c249363682aa6f9d3d95ae3b8636e24ebf9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/df988c2-fix-green.svg" />
</a>
  </td>

  <td>update web-worker to support Webpack 5</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @angular-devkit/core: update schema validator (<a href="https://github.com/angular/angular-cli/commit/08753138d336fb870a66face70f5624ba64b4c69">0875313</a>)
</h3>
support for JSON Schema draft-04 and draft-06 is removed. If you have schemas using the `id` keyword replace them with `$id`. For an interim period we will auto rename any top level `id` keyword to `$id`.

**NB**: This change only effects schematics and builders authors.

<h3>
    @angular-devkit/build-angular: upgrade to Webpack 5 throughout the build system (<a href="https://github.com/angular/angular-cli/commit/d883ce5d7e39de774fe90e4ccdbc9a84a600b7e8">d883ce5</a>)
</h3>
Webpack 5 generates similar but differently named files for lazy loaded JavaScript files in development configurations (when the `namedChunks` option is enabled).
For the majority of users this change should have no effect on the application and/or build process. Production builds should also not be affected as the `namedChunks` option is disabled by default in production configurations.
However, if a project's post-build process makes assumptions as to the file names then adjustments may need to be made to account for the new naming paradigm.
Such post-build processes could include custom file transformations after the build, integration into service-side frameworks, or deployment procedures.
Example development file name change: `lazy-lazy-module.js` --> `src_app_lazy_lazy_module_ts.js`

<h3>
    @angular-devkit/build-angular: upgrade to Webpack 5 throughout the build system (<a href="https://github.com/angular/angular-cli/commit/d883ce5d7e39de774fe90e4ccdbc9a84a600b7e8">d883ce5</a>)
</h3>
Webpack 5 now includes web worker support. However, the structure of the URL within the `Worker` constructor must be in a specific format that differs from the current requirement.
Web worker usage should be updated as shown below (where `./app.worker` should be replaced with the actual worker name):

Before:

```
new Worker('./app.worker', ...)
```

After:

```
new Worker(new URL('./app.worker', import.meta.url), ...)
```

---

# Special Thanks

Alan Agius, Charles Lyding, Keen Yee Liau, Doug Parker, Douglas Parker
<a name="v12.0.0-next.8"></a>

# v12.0.0-next.8 (2021-04-07)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.8)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/eca5a01f6e8d1c3ad874d74c58e6ffbddab6a031"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/eca5a01-fix-green.svg" />
</a>
  </td>

  <td>remove deprecated i18nLocale and i18nFormat options from i18n-extract</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.8)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/160102ae57d780dded6c9002faf07b601a866d3d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/160102a-fix-green.svg" />
</a>
  </td>

  <td>remove Webpack plugin for deprecated ViewEngine compiler</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.8)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/645353db26e9d6e8f893322a52b320ccd5ca1d5d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/645353d-fix-green.svg" />
</a>
  </td>

  <td>run update-i18n migration for server builder</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @ngtools/webpack: remove Webpack plugin for deprecated ViewEngine compiler (<a href="https://github.com/angular/angular-cli/commit/160102ae57d780dded6c9002faf07b601a866d3d">160102a</a>)
</h3>
Removal of View Engine support from application builds
With the removal of the deprecated View Engine compiler in Angular version 12 for applications, the View Engine Webpack plugin has been removed.
The Ivy-based Webpack plugin is the default used within the Angular CLI.
If using a custom standalone Webpack configuration, the removed `AngularCompilerPlugin` should be replaced with the Ivy-based `AngularWebpackPlugin`.

<h3>
    @angular-devkit/build-angular: remove deprecated i18n options from server and browser builder (<a href="https://github.com/angular/angular-cli/commit/5cf9a08dc7a1c84568d00df8f957d55b10ce0193">5cf9a08</a>)
</h3>
Removal of deprecated browser and server command options.
- `i18nFile`,  use `locales` object in the project metadata instead.
- `i18nFormat`, No longer needed as the format will be determined automatically.
- `i18nLocale`, use `localize` option instead.

<h3>
    @angular-devkit/build-angular: remove deprecated i18nLocale and i18nFormat options from i18n-extract (<a href="https://github.com/angular/angular-cli/commit/eca5a01f6e8d1c3ad874d74c58e6ffbddab6a031">eca5a01</a>)
</h3>
Removal of deprecated `extract-i18n` command options
The deprecated `i18nLocale` option has been removed and the `i18n.sourceLocale` within a project's configuration should be used instead.
The deprecated `i18nFormat` option has been removed and the `format` option should be used instead.

---

# Special Thanks

Charles Lyding, Renovate Bot, Alan Agius, Doug Parker, Joey Perrott
<a name="v12.0.0-next.7"></a>

# v12.0.0-next.7 (2021-04-02)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.7)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/51cb3181ea947b851bab42e816a87bb181dad15e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/51cb318-fix-green.svg" />
</a>
  </td>

  <td>validate scripts and styles bundleName</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20360">
  [Closes #20360]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/012700ace56d6d0e35d6798c5a19534ffa5a5a0e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/012700a-fix-green.svg" />
</a>
  </td>

  <td>remove deprecated View Engine support for i18n extraction</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/677913fc389f0ffa20e3e1928d7244427c07ef35"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/677913f-fix-green.svg" />
</a>
  </td>

  <td>remove usage of deprecated View Engine compiler</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.7)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/e84fa72751b377ec4cf2419357190a79b0513377"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/e84fa72-fix-green.svg" />
</a>
  </td>

  <td>ensure update migrations are fully executed</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8a805fe0b9a0db3329aa51d95a41f3baacd45feb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8a805fe-fix-green.svg" />
</a>
  </td>

  <td>exclude deprecated packages with removal migrations from update</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.7)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/430ee441bd2e5729a8a24f72a1df8fd782c9f9f6"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/430ee44-fix-green.svg" />
</a>
  </td>

  <td>use correct Webpack asset stage in resource loader</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/aeebd14f04b8e520b0144a77e765da807a08dda0"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/aeebd14-perf-orange.svg" />
</a>
  </td>

  <td>only check affected files for Angular semantic diagnostics</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.7)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8582ddc35e153b8bc409d0505f29bc43e6cef455"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8582ddc-feat-blue.svg" />
</a>
  </td>

  <td>remove `entryComponent` from `component` schematic</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fb14945c02a3f150d6965e77324416b1ec7cc575"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/fb14945-fix-green.svg" />
</a>
  </td>

  <td>correctly handle adding multi-line strings to `@NgModule` metadata</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6fa88567211ededc657f5cbeb71afb8592191058"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6fa8856-fix-green.svg" />
</a>
  </td>

  <td>explicitly specify ServiceWorker registration strategy</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @angular-devkit/build-angular: remove usage of deprecated View Engine compiler (<a href="https://github.com/angular/angular-cli/commit/677913fc389f0ffa20e3e1928d7244427c07ef35">677913f</a>)
</h3>
Removal of View Engine support from application builds
With the removal of the deprecated View Engine compiler in Angular version 12 for applications, Ivy-based compilation will always be used when building an application.
The default behavior for applications is to use the Ivy compiler when building and no changes are required for these applications.
For applications that have opted-out of Ivy, a warning will be shown and an Ivy-based build will be attempted. If the build fails,
the application may need to be updated to become Ivy compatible.

<h3>
    @schematics/angular: remove `entryComponent` from `component` schematic (<a href="https://github.com/angular/angular-cli/commit/8582ddc35e153b8bc409d0505f29bc43e6cef455">8582ddc</a>)
</h3>
`entryComponent` option has been removed from the `component` schematic as this was intended to be used with the the now no longer supported ViewEngine rendering engine.

<h3>
    @angular-devkit/build-angular: remove view engine app-shell generation (<a href="https://github.com/angular/angular-cli/commit/1c2aeeb46a23fd511c89f9c8800ac2a5ab0c2734">1c2aeeb</a>)
</h3>
App-shell builder now only supports generation using Ivy

<h3>
    @angular-devkit/build-angular: remove deprecated View Engine support for i18n extraction (<a href="https://github.com/angular/angular-cli/commit/012700ace56d6d0e35d6798c5a19534ffa5a5a0e">012700a</a>)
</h3>
Removal of View Engine support from i18n extraction
With the removal of the deprecated View Engine compiler in Angular version 12 for applications, the `ng extract-i18n` command will now always use the Ivy compiler.
The `--ivy` option has also been removed as Ivy-based extraction is always enabled.
The default behavior for applications is to use the Ivy compiler for building/extraction and no changes are required for these applications.
For applications that have opted-out of Ivy, a warning will be shown and Ivy-based extraction will be attempted. If the extraction fails,
the application may need to be updated to become Ivy compatible.

---

# Special Thanks

Charles Lyding, Alan Agius, Renovate Bot, George Kalpakas, Joey Perrott, Keen Yee Liau
<a name="v12.0.0-next.6"></a>

# v12.0.0-next.6 (2021-03-24)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.6)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ac4c109bebac3ea3d562f000c46a98d61b1bd148"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ac4c109-fix-green.svg" />
</a>
  </td>

  <td>ensure output directory is present before writing stats JSON</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.6)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c7e126609f4a0d86bd47a226717ab6430fd85cfd"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/c7e1266-feat-blue.svg" />
</a>
  </td>

  <td>add production by default optional migration</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f22f7e7371c0daa2dc59110cd21e3ff3fb4620d5"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f22f7e7-feat-blue.svg" />
</a>
  </td>

  <td>update new workspaces to use Karma 6.3</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/09daf7a7e0886738f25f071aa5e072e1dc06bf7e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/09daf7a-fix-green.svg" />
</a>
  </td>

  <td>remove leftover workspace tslint config</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Renovate Bot, Alan Agius, Charles Lyding, Keen Yee Liau
<a name="v12.0.0-next.5"></a>

# v12.0.0-next.5 (2021-03-18)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1525e7ab2c3c6cd95ee91cf01243af78174246ca"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1525e7a-feat-blue.svg" />
</a>
  </td>

  <td>expose legacy-migrate message format</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2616ef0d3fdf6821a60f5ae9dcb54d65be0506e1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/2616ef0-feat-blue.svg" />
</a>
  </td>

  <td>integrate JIT mode linker</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20281">
  [Closes #20281]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/075c988dd14711755516261e3e6150c316d866cb"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/075c988-fix-green.svg" />
</a>
  </td>

  <td>display correct filename for bundles that are ES2016+</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9714aa92bfb7babb1a6720515b543614acd47cac"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9714aa9-fix-green.svg" />
</a>
  </td>

  <td>don't load an input sourcemap from file when using Babel</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d5645675fd555e7f1afd523d4f2d42095034fc46"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d564567-fix-green.svg" />
</a>
  </td>

  <td>support writing large Webpack stat outputs</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/63a2dbb8b42c6c62e37b27c42238860f7e57b87f"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/63a2dbb-perf-orange.svg" />
</a>
  </td>

  <td>skip FESM2015 from `async` transformation</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3affd28f5ebdaa9fb8f3239292e3d0060f655d07"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/3affd28-perf-orange.svg" />
</a>
  </td>

  <td>remove Webpack Stats.toJson usage in analytics plugin</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/699b641b85632f9581f3638ccd8aa359dd8aa57f"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/699b641-perf-orange.svg" />
</a>
  </td>

  <td>remove Webpack Stats.toJson usage in karma plugin</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2d6e82fa106e9dfd1bb4909d56e5730195c6b2e6"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/2d6e82f-perf-orange.svg" />
</a>
  </td>

  <td>enforce Babel not to load sourcemaps from file</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/00ff390feaeb457812d67c367f65ba799d3ac66a"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/00ff390-perf-orange.svg" />
</a>
  </td>

  <td>disable `showCircularDependencies` by default</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/build-webpack (0.1200.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ff32ada86b486d96922c693f703e25e01848d020"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/ff32ada-feat-blue.svg" />
</a>
  </td>

  <td>provide output path in builder results</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/985dc1a4c71693ad78c35f5d6e95397f9753239e"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/985dc1a-feat-blue.svg" />
</a>
  </td>

  <td>confirm ng add action before installation</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/79856644b4d476d50013eafee949d1a508b86104"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/7985664-feat-blue.svg" />
</a>
  </td>

  <td>support TypeScript 4.2</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d254d058f9be6b6a696bd39a37c2457776b46806"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/d254d05-fix-green.svg" />
</a>
  </td>

  <td>remove `project` from required properties in ng-packagr schema</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3504c43e48d8e265ca0943005f3cea2d25290cbd"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3504c43-fix-green.svg" />
</a>
  </td>

  <td>remove Webpack 5 deprecation warning in resource loader</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/95aa2b8f925ee295b8edf659b5d8e706d122ffec"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/95aa2b8-perf-orange.svg" />
</a>
  </td>

  <td>avoid adding transitive dependencies to Webpack's dependency graph</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/dfefd6ba4fcda6baa3dc172978ca84acaa48ec54"><img
   align="top"
   title="Performance Improvement" src="https://img.shields.io/badge/dfefd6b-perf-orange.svg" />
</a>
  </td>

  <td>use precalculated dependencies in unused file check</td>

  <td>
  </td>
</tr>

<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.5)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/81129e12d0ae4cbaeb5ab537facb7990be9b8b45"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/81129e1-feat-blue.svg" />
</a>
  </td>

  <td>update several TypeScript compilation target (Syntax)</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/226a8d274d27d191651926bc7970af11cfee2597"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/226a8d2-feat-blue.svg" />
</a>
  </td>

  <td>remove tslint and codelyzer from new projects</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20105">
  [Closes #20105]<br />
</a>

<a href="https://github.com/angular/angular-cli/issues/18465">
  [Closes #18465]<br />
</a>

  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/663c4bc9c10aa3df3defa188a1ba8f90c63b2722"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/663c4bc-fix-green.svg" />
</a>
  </td>

  <td>remove references to the prod flag</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9ea34ba202b2cccfdda820b4975de54cd56acf43"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9ea34ba-fix-green.svg" />
</a>
  </td>

  <td>fix youtube icon margin</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3bf831fac6166f6943a78b34bfd5f3c167f8911d"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3bf831f-fix-green.svg" />
</a>
  </td>

  <td>only show legacy browsers deprecation warning when option is used</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ee4918db40b0b30d58e1119a0291954234d4f797"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ee4918d-fix-green.svg" />
</a>
  </td>

  <td>remove Native value from viewEncapsulation option</td>

  <td>
  </td>
</tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/870173633a54f7dbd06a420adb3dc3593d6010c4"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/8701736-fix-green.svg" />
</a>
  </td>

  <td>use title for svg on home page</td>

  <td>
  </td>
</tr>

<tr></tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @angular/cli: confirm ng add action before installation (<a href="https://github.com/angular/angular-cli/commit/985dc1a4c71693ad78c35f5d6e95397f9753239e">985dc1a</a>)
</h3>
The `ng add` command will now ask the user to confirm the package and version prior to installing and executing an uninstalled package.
This new behavior allows a user to abort the action if the version selected is not appropriate or if a typo occurred on the command line and an incorrect package would be installed.
A `--skip-confirmation` option has been added to skip the prompt and directly install and execute the package. This option is useful in CI and non-TTY scenarios such as automated scripts.

---

# Special Thanks

Alan Agius, Charles Lyding, Renovate Bot, Doug Parker, Cédric Exbrayat, Kristiyan Kostadinov, Mouad Ennaciri, Omar Hasan
<a name="v12.0.0-next.4"></a>

# v12.0.0-next.4 (2021-03-10)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/architect (0.1200.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1da359ac08d1a5503ab152db72ee6cee927391b8"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1da359a-feat-blue.svg" />
</a>
  </td>

  <td>add implementation for defaultConfiguration</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/71eab3ddb603cb70a98120012a174cb159d9b28d"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/71eab3d-feat-blue.svg" />
</a>
  </td>

  <td>show warning during build when project requires IE 11 support</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/84f39778cc37c997d0b2b5295f766e08d4c94c78"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/84f3977-fix-green.svg" />
</a>
  </td>

  <td>only remove nomodule and defer attributes empty values</td>

  <td>

<a href="https://github.com/angular/angular-cli/issues/20207">
  [Closes #20207]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.0.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/8e981d08809a7f1084b5cae7a539217d6fe7f757"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/8e981d0-feat-blue.svg" />
</a>
  </td>

  <td>add handling for `defaultConfiguration` target definition property</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a5877bf91765af71c1368fd2fb61d29079931205"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/a5877bf-feat-blue.svg" />
</a>
  </td>

  <td>deprecate `--prod` command line argument</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f7e3e2335dfd6f54f435c95baa024c60a94b791c"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f7e3e23-feat-blue.svg" />
</a>
  </td>

  <td>add `defaultConfiguration` property to architect schema</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/06335515eb05c84d8dfdbfa10f8e3201b714d5da"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/0633551-fix-green.svg" />
</a>
  </td>

  <td>avoid exceptions for expected errors in architect commands</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/5f8155dc33b1f95f81562cf40a56fdbd0f4140e4"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/5f8155d-fix-green.svg" />
</a>
  </td>

  <td>add ng-packagr builder schema in IDE schema</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/0dc73276cafd42415dcaa6507ab221f1116273b5"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/0dc7327-feat-blue.svg" />
</a>
  </td>

  <td>drop support for string based lazy loading</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.4)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3ee12af89be58ccea8996e2e86a18a23d193abbe"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/3ee12af-feat-blue.svg" />
</a>
  </td>

  <td>add migration to update lazy loading string syntax to use dynamic imports</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f4875b967ae9ca5640cb27bfb37166528cab88d8"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f4875b9-feat-blue.svg" />
</a>
  </td>

  <td>add migration to remove `lazyModules` configuration option</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3b7470d4836bcfff31ee4bf90ec4396f2905c633"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/3b7470d-feat-blue.svg" />
</a>
  </td>

  <td>deprecate `legacyBrowsers` application and ng-new option</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1de6d71edd899465a01c65790f6fb04159acc821"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1de6d71-feat-blue.svg" />
</a>
  </td>

  <td>production builds by default</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/ba6f546a026a3dba613c1c54ce0c767fe0940d0f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/ba6f546-fix-green.svg" />
</a>
  </td>

  <td>add `additionalProperties` to all schemas</td>

  <td>
  </td>
</tr>
<tr></tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @angular-devkit/build-angular: remove deprecated `lazyModules` option (<a href="https://github.com/angular/angular-cli/commit/8d669123236c49e7f6bee1a7171c002abe03df1a">8d66912</a>)
</h3>
Server and Browser builder `lazyModules` option has been removed without replacement.

<h3>
    @ngtools/webpack: drop support for string based lazy loading (<a href="https://github.com/angular/angular-cli/commit/0dc73276cafd42415dcaa6507ab221f1116273b5">0dc7327</a>)
</h3>
With this change we drop support for string based lazy loading `./lazy.module#LazyModule`  use dynamic imports instead.

The following options which were used to support the above syntax were removed without replacement.

- discoverLazyRoutes
- additionalLazyModules
- additionalLazyModuleResources
- contextElementDependencyConstructor

---

# Special Thanks

Alan Agius, Charles Lyding, Renovate Bot, Joey Perrott
<a name="v12.0.0-next.3"></a>

# v12.0.0-next.3 (2021-03-03)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/aa3ea885ed69cfde0914abae547e15d6d499a908"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/aa3ea88-feat-blue.svg" />
</a>
  </td>

  <td>enable inlineCritical by default</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/6a7d1e0be4c59b27e78d1b03c083bdb2982c3845"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/6a7d1e0-fix-green.svg" />
</a>
  </td>

  <td>remove left-over `experimentalRollupPass` option</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/11b1d9c2d1fb75df968fa31b5fcdeeb072f87b52"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/11b1d9c-fix-green.svg" />
</a>
  </td>

  <td>inline critical font-face rules when using crittical css inlining</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.3)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f127136033f604b443568e7ade1ff26f50ec1dbe"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/f127136-fix-green.svg" />
</a>
  </td>

  <td>update ng new links</td>

  <td>
  </td>
</tr>
<tr></tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @angular-devkit/build-angular: enable inlineCritical by default (<a href="https://github.com/angular/angular-cli/commit/aa3ea885ed69cfde0914abae547e15d6d499a908">aa3ea88</a>)
</h3>
Critical CSS inlining is now enabled by default. If you wish to turn this off set `inlineCritical` to `false`.

See: https://angular.io/guide/workspace-config#optimization-configuration

---

# Special Thanks

Renovate Bot, Charles Lyding, Alan Agius, Keen Yee Liau, Douglas Parker, twerske
<a name="v12.0.0-next.2"></a>

# v12.0.0-next.2 (2021-02-24)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7ef73c8524b864244da027284d8bb3402f7ed8d3"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/7ef73c8-fix-green.svg" />
</a>
  </td>

  <td>only show index and service worker status once</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/2ef39498b03da036b3214c20a9b160b3efef4d5e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/2ef3949-fix-green.svg" />
</a>
  </td>

  <td>disable declaration and declarationMap</td>

  <td>

<a href="https://github.com/angular/angular-cli/issues/20103">
  [Closes #20103]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/065ac4546fbb4928245609d52c1f6d81fdd48cb9"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/065ac45-fix-green.svg" />
</a>
  </td>

  <td>remove npm 7 incompatibility notification</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.2)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/d19d2ccae55f96d4d8260da6572f34a47616a89b"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/d19d2cc-feat-blue.svg" />
</a>
  </td>

  <td>update new project dependencies version</td>

  <td>
<a href="https://github.com/angular/angular-cli/issues/20106">
  [Closes #20106]<br />
</a>

  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1199205bc2844e2c83d8f8e5092e89f8bd24eec1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1199205-feat-blue.svg" />
</a>
  </td>

  <td>augment `universal` schematics to import `platform-server` shims</td>

  <td>
<a href="https://github.com/angular/angular/issues/40559">
  [Closes #40559]<br />
</a>

  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/96a4467ce90fb6b88f5be39f73c8fd64ce057a4a"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/96a4467-feat-blue.svg" />
</a>
  </td>

  <td>add migration to remove emitDecoratorMetadata</td>

  <td>
  </td>
</tr>
<tr></tr>

</tbody>
</table>

---

---

# Special Thanks

Renovate Bot, Charles Lyding, Alan Agius, Doug Parker, Joey Perrott, Jefiozie, George Kalpakas, Keen Yee Liau
<a name="v12.0.0-next.1"></a>

# v12.0.0-next.1 (2021-02-17)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/44e75be5b127545bf87e2d6d61370944f4d380a1"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/44e75be-feat-blue.svg" />
</a>
  </td>

  <td>drop support for ng-packagr version 11</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fa5cf53b644c96a50d09dce5f9e9ee401bf66053"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/fa5cf53-feat-blue.svg" />
</a>
  </td>

  <td>drop support for karma version 5.2</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/build-optimizer (0.1200.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1f83f305db88aeb5164f6d13869f7cc10e44527e"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/1f83f30-feat-blue.svg" />
</a>
  </td>

  <td>support Webpack 5</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3d99468b455825fd97146e6496e7d712100e235a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3d99468-fix-green.svg" />
</a>
  </td>

  <td>support update migration packages with no entry points</td>

  <td>

<a href="https://github.com/angular/angular-cli/issues/20032">
  [Closes #20032]<br />
</a>

  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b179a704829fef72191045a443b4b7eb7d20141c"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/b179a70-fix-green.svg" />
</a>
  </td>

  <td>ensure odd number Node.js version message is a warning</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9a44bf4aaf6c800043e44c8b238453fd4d295fb5"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9a44bf4-fix-green.svg" />
</a>
  </td>

  <td>improve error logging when resolving update migrations</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/789e05d800c1093881d24a066fb7881c26332349"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/789e05d-feat-blue.svg" />
</a>
  </td>

  <td>support Webpack 5</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/c6e65e434614b8076e66c636c1c9c6c241ce750f"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/c6e65e4-fix-green.svg" />
</a>
  </td>

  <td>normalize paths when pruning AOT rebuild requests</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.1)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/7d57dd2f3e7d36cc4ed2c356f79139486790cbfa"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/7d57dd2-feat-blue.svg" />
</a>
  </td>

  <td>add migration to use new zone.js entry-points</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/bb38f85202f749040b241c8277280fab21c3379c"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/bb38f85-feat-blue.svg" />
</a>
  </td>

  <td>use new zone.js entry-points</td>

  <td>
  </td>
</tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    @angular-devkit/build-angular: drop support for zone.js 0.10 (<a href="https://github.com/angular/angular-cli/commit/f309516bcdcee711fc5693b5f14d6fef1cfa5dba">f309516</a>)
</h3>
Minimum supported `zone.js` version is `0.11.4`

<h3>
    @angular-devkit/build-angular: drop support for ng-packagr version 11 (<a href="https://github.com/angular/angular-cli/commit/44e75be5b127545bf87e2d6d61370944f4d380a1">44e75be</a>)
</h3>
Minimum supported `ng-packagr` version is `12.0.0-next`

<h3>
    @angular-devkit/build-angular: drop support for karma version 5.2 (<a href="https://github.com/angular/angular-cli/commit/fa5cf53b644c96a50d09dce5f9e9ee401bf66053">fa5cf53</a>)
</h3>
Minimum supported `karma` version is `6.0.0`

---

# Special Thanks

Renovate Bot, Alan Agius, Charles Lyding, Keen Yee Liau, Aravind V Nair
<a name="v12.0.0-next.0"></a>

# v12.0.0-next.0 (2021-02-11)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/93376177235108ed15a2fbba8ea079bc565802ce"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/9337617-feat-blue.svg" />
</a>
  </td>

  <td>add `postcss-preset-env` with stage 3 features</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/fe90b766df2eee2c1289c0f43fb7504377152a51"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/fe90b76-fix-green.svg" />
</a>
  </td>

  <td>ensure i18n extraction sourcemaps are fully configured</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/1b5971a0bc0560067f5fdb993d52485dd1226b6c"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/1b5971a-fix-green.svg" />
</a>
  </td>

  <td>the root Tailwind configuration file is always picked</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/a7ffce10ee18d069aab3ef6cc010cfb08e77813e"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/a7ffce1-fix-green.svg" />
</a>
  </td>

  <td>fixed ignoring of karma plugins config</td>

  <td>

<a href="https://github.com/angular/angular-cli/issues/19993">
  [Closes #19993]<br />
</a>

  </td>
</tr>

<tr><td colspan=3><h3>@angular-devkit/core (12.0.0-next.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/3bb3c6cd51d24fe5636cdcf63670ea164f57aa63"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/3bb3c6c-fix-green.svg" />
</a>
  </td>

  <td>ensure job input values are processed in order</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@angular/cli (12.0.0-next.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/52aaa8c167dee989b782b5561cb16c5a75e4c2af"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/52aaa8c-fix-green.svg" />
</a>
  </td>

  <td>update NPM 7 guidance</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@ngtools/webpack (12.0.0-next.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/9eb7fb53bb1e85e551b7b05f4442c0a9e3e9ef8a"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/9eb7fb5-fix-green.svg" />
</a>
  </td>

  <td>reduce overhead of Angular compiler rebuild requests</td>

  <td>
  </td>
</tr>
<tr></tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-next.0)</h3></td></tr>
  <tr>
    <td><b>Commit</b>
    <td><b>Description</b>
    <td><b>Notes</b>
  </tr>

<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/b105ed63c7610dd1397a3d24d4a7439564a019aa"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/b105ed6-feat-blue.svg" />
</a>
  </td>

  <td>strict mode by default</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/f424529d9ccaeb16643a8383ad3647af82062b16"><img
   align="top"
   title="Feature" src="https://img.shields.io/badge/f424529-feat-blue.svg" />
</a>
  </td>

  <td>add migration to remove deprecated options from 'angular.json'</td>

  <td>
  </td>
</tr>
<tr>

  <td>
<a href="https://github.com/angular/angular-cli/commit/575b1a75b17f0b03748c137c07976e00be4c8b51"><img
   align="top"
   title="Bug Fix" src="https://img.shields.io/badge/575b1a7-fix-green.svg" />
</a>
  </td>

  <td>only update removed v12 options in migration</td>

  <td>
  </td>
</tr>
<tr></tr>

</tbody>
</table>

---

# Breaking Changes

<h3>
    set minimum Node.js version to 12.13 (<a href="https://github.com/angular/angular-cli/commit/d1f616930de4a8312e3441410098d9f248855d9d">d1f6169</a>)
</h3>
Node.js version 10 will become EOL on 2021-04-30.
Angular CLI 12 will require Node.js 12.13+ or 14.15+. Node.js 12.13 and 14.15 are the first LTS releases for their respective majors.

<h3>
    @angular-devkit/build-angular: remove file-loader dependency (<a href="https://github.com/angular/angular-cli/commit/6732294ff34ca35698cec5a9ca91b664dd684289">6732294</a>)
</h3>
The unsupported/undocumented, Webpack specific functionality to `import`/`require()` a non-module file has been removed.

Before

```js
import img from './images/asset.png';
```

After

```html
<img src="images/asset.png" />
```

---

# Special Thanks

Renovate Bot, Charles Lyding, Alan Agius, Doug Parker, Bruno Baia, Amadou Sall, S. Iftekhar Hossain

---

**Note: For release notes prior to this CHANGELOG see [release notes](https://github.com/angular/angular-cli/releases).**
