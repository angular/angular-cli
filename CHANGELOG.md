<a name="19.2.0-next.2"></a>

# 19.2.0-next.2 (2025-02-12)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| [aa0ae457b](https://github.com/angular/angular-cli/commit/aa0ae457b0f2fe9ad76b52aaca08044cfaf5eff9) | fix  | include default export for Express app                     |
| [4a5b76a8e](https://github.com/angular/angular-cli/commit/4a5b76a8eee0bbbc4f08b568fee55ca22dff9927) | fix  | remove additional newline after standalone property        |
| [c716ce152](https://github.com/angular/angular-cli/commit/c716ce15236ef9fe3f25b31a53a30b33c0a47c52) | fix  | skip ssr migration when `@angular/ssr` is not a dependency |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description             |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------- |
| [ef7ea536f](https://github.com/angular/angular-cli/commit/ef7ea536feae128b9fabaa124cde2bdad3802cba) | feat | add aot option to jest  |
| [523d539c6](https://github.com/angular/angular-cli/commit/523d539c6633ab223723162f425e0ef2b7b4ff71) | feat | add aot option to karma |

### @angular/build

| Commit                                                                                              | Type | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| [beefed839](https://github.com/angular/angular-cli/commit/beefed839f782216c9e4ee28673a95b6be8fb26c) | fix  | always provide Vite client helpers with development server             |
| [5c1360179](https://github.com/angular/angular-cli/commit/5c1360179cec2f0fad6b2adb4a8e4d6930738976) | fix  | avoid pre-transform errors with Vite pre-bundling                      |
| [be15b886c](https://github.com/angular/angular-cli/commit/be15b886c75d0ed9834aef38690d3169fcf16ef5) | fix  | configure Vite CORS option                                             |
| [b24089ef8](https://github.com/angular/angular-cli/commit/b24089ef8630e028883b097d57c9246b6ef085ed) | fix  | ensure full rebuild after initial error build in watch mode            |
| [880a50c50](https://github.com/angular/angular-cli/commit/880a50c50cafb3ab2e5713aed0c4a20be6648ced) | fix  | exclude unmodified files from logs with `--localize`                   |
| [b55306989](https://github.com/angular/angular-cli/commit/b5530698962a0421e882f60e2975026cf348e795) | fix  | handle unlocalizable files correctly in localized prerender            |
| [9a46be8d6](https://github.com/angular/angular-cli/commit/9a46be8d68fbc5acf88f43916985f781db79bcf1) | fix  | prevent fallback to serving main.js for unknown requests               |
| [9b0d73087](https://github.com/angular/angular-cli/commit/9b0d730871a3a17a2c5ba04f5941a3d0e4fa5845) | fix  | prevent server manifest generation when no server features are enabled |
| [964fb778b](https://github.com/angular/angular-cli/commit/964fb778b7d9e4811a6987eddc4f0a010bb713f6) | fix  | support per component updates of multi-component files                 |
| [b50b6ee92](https://github.com/angular/angular-cli/commit/b50b6ee920165d8a2fbfdeb57376ca21aed4a91a) | perf | cache translated i18n bundles for faster builds                        |

### @angular/ssr

| Commit                                                                                              | Type | Description                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| [9726cd084](https://github.com/angular/angular-cli/commit/9726cd084b76fe605405d562a18d8af91d6657d8) | feat | Add support for route matchers with fine-grained render mode control |
| [414736bc0](https://github.com/angular/angular-cli/commit/414736bc0f56ea3b5c1a32ed54da7da4c5c3320e) | fix  | accurately calculate content length for static pages with `\r\n`     |
| [6448f80bf](https://github.com/angular/angular-cli/commit/6448f80bfb4a8900ca78857917314bd15fa4144d) | fix  | prioritize the first matching route over subsequent ones             |
| [833dc986d](https://github.com/angular/angular-cli/commit/833dc986dbfd8902c0cf6ce9c8eeea9d759a25ce) | fix  | properly handle baseHref with protocol                               |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.1.7"></a>

# 19.1.7 (2025-02-12)

### @schematics/angular

| Commit                                                                                              | Type | Description                            |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------- |
| [de73b1c0c](https://github.com/angular/angular-cli/commit/de73b1c0c2d5748818d2e94f93f2640d4c6b949c) | fix  | include default export for Express app |

### @angular/build

| Commit                                                                                              | Type | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [8890a5f76](https://github.com/angular/angular-cli/commit/8890a5f76c252fe383a632880df476e5f63ef931) | fix  | always provide Vite client helpers with development server  |
| [df1d38846](https://github.com/angular/angular-cli/commit/df1d388465b6f0d3aab5fb4f011cbbe74d3058f4) | fix  | configure Vite CORS option                                  |
| [a13a49d95](https://github.com/angular/angular-cli/commit/a13a49d95be61d2a2458962d57318f301dede502) | fix  | exclude unmodified files from logs with `--localize`        |
| [0826315fa](https://github.com/angular/angular-cli/commit/0826315fac1c3fd2d22aa0ea544bd59ef9ed8781) | fix  | handle unlocalizable files correctly in localized prerender |
| [d2e1c8e9f](https://github.com/angular/angular-cli/commit/d2e1c8e9f5c03a410d8204a5f9b11b4ad9cc9eaa) | perf | cache translated i18n bundles for faster builds             |

### @angular/ssr

| Commit                                                                                              | Type | Description                                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------- |
| [f5d974576](https://github.com/angular/angular-cli/commit/f5d97457622897b41e73a859dd1f218fa962be15) | fix  | accurately calculate content length for static pages with `\r\n` |
| [c26ea1619](https://github.com/angular/angular-cli/commit/c26ea1619095102b21176435af826cf53f0054b1) | fix  | properly handle baseHref with protocol                           |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.3.12"></a>

# 17.3.12 (2025-02-12)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------- |
| [d83237028](https://github.com/angular/angular-cli/commit/d832370285adccbf955963a5115cf9b9bf54a08d) | fix  | update vite to version 5.4.14 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.1.6"></a>

# 19.1.6 (2025-02-05)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| [3f7042672](https://github.com/angular/angular-cli/commit/3f704267223d1881ea40e9de4e6381b9d0e43fe6) | fix  | remove additional newline after standalone property        |
| [e9778dba0](https://github.com/angular/angular-cli/commit/e9778dba0d75e7f528b600d51504a583485bd033) | fix  | skip ssr migration when `@angular/ssr` is not a dependency |

### @angular/build

| Commit                                                                                              | Type | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| [27f833186](https://github.com/angular/angular-cli/commit/27f8331865de35044ddeda7a8c05bb2700b0be6a) | fix  | avoid pre-transform errors with Vite pre-bundling                      |
| [8f6ee7ed9](https://github.com/angular/angular-cli/commit/8f6ee7ed933ea7394e14fe46d141427839008040) | fix  | ensure full rebuild after initial error build in watch mode            |
| [2b9c00f68](https://github.com/angular/angular-cli/commit/2b9c00f686145a8613dc2ce7f494193622e02625) | fix  | prevent fallback to serving main.js for unknown requests               |
| [45abd15b7](https://github.com/angular/angular-cli/commit/45abd15b781bb5bb067a7a52e7a809bb9d141c75) | fix  | prevent server manifest generation when no server features are enabled |

### @angular/ssr

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [5bf5e5fd2](https://github.com/angular/angular-cli/commit/5bf5e5fd20e3c33a274a936dd1ce00e07b860226) | fix  | prioritize the first matching route over subsequent ones |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.2.0-next.1"></a>

# 19.2.0-next.1 (2025-01-29)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                                |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------- |
| [cae068be3](https://github.com/angular/angular-cli/commit/cae068be373edbad04e06052e87ec7437575e178) | fix  | update library schematic to use `@angular-devkit/build-angular:ng-packagr` |

### @angular/build

| Commit                                                                                              | Type | Description                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| [694ef8e6e](https://github.com/angular/angular-cli/commit/694ef8e6e486ad66d19b831243193e0123a4b0b1) | fix  | allow tailwindcss 4.x as a peer dependency                           |
| [1a3ef3b60](https://github.com/angular/angular-cli/commit/1a3ef3b60bb1d383a514dee8a6f95b7e15b5bb2c) | fix  | disable TypeScript `removeComments` option                           |
| [d4ee36065](https://github.com/angular/angular-cli/commit/d4ee36065d9fe39431414a40ce39e163acfd8278) | fix  | keep background referenced HMR update chunks                         |
| [531dcdca4](https://github.com/angular/angular-cli/commit/531dcdca46a321d253b1d5a2e40d2b3a90e3ee46) | fix  | support template updates that also trigger global stylesheet changes |
| [f836be9e6](https://github.com/angular/angular-cli/commit/f836be9e676575fccd4d74eddbc5bf647f7ff1bd) | fix  | support Vite `allowedHosts` option for development server            |
| [0ddf6aafa](https://github.com/angular/angular-cli/commit/0ddf6aafaa65b3323dc4ee6251d75794ae862ec7) | fix  | utilize bazel stamp instead of resolving peer dependency versions    |

### @angular/ssr

| Commit                                                                                              | Type | Description                                                        |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| [4df97d192](https://github.com/angular/angular-cli/commit/4df97d192354a884557229489b4d8607003cc613) | fix  | enhance dynamic route matching for better performance and accuracy |
| [46581db16](https://github.com/angular/angular-cli/commit/46581db16bc8ed4eda5f0198734146c4e82f9957) | fix  | redirect to locale pathname instead of full URL                    |
| [ec05c814e](https://github.com/angular/angular-cli/commit/ec05c814ee0ee444479e22ae767109cace18cb0b) | fix  | rename `provideServerRoutesConfig` to `provideServerRouting`       |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.1.5"></a>

# 19.1.5 (2025-01-29)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                                |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------- |
| [14e3a71e4](https://github.com/angular/angular-cli/commit/14e3a71e46e12a556323fff48998794eecab9896) | fix  | update library schematic to use `@angular-devkit/build-angular:ng-packagr` |

### @angular/build

| Commit                                                                                              | Type | Description                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| [d53d25fc1](https://github.com/angular/angular-cli/commit/d53d25fc1b80388158643dbdd37aa49b0aa790e0) | fix  | allow tailwindcss 4.x as a peer dependency                           |
| [bd9d379f0](https://github.com/angular/angular-cli/commit/bd9d379f0401a19d527dc896a96b2671b4c4ed76) | fix  | disable TypeScript `removeComments` option                           |
| [e73e9102e](https://github.com/angular/angular-cli/commit/e73e9102e3098882dd76a8dbf800d4ba414e0e27) | fix  | handle empty module case to avoid TypeError                          |
| [bb413456e](https://github.com/angular/angular-cli/commit/bb413456e95a9be49feba95415915ce2ef39b1b5) | fix  | keep background referenced HMR update chunks                         |
| [2011d3428](https://github.com/angular/angular-cli/commit/2011d34286784156b8c09bb8c6d376d8f902bc00) | fix  | support template updates that also trigger global stylesheet changes |
| [688019946](https://github.com/angular/angular-cli/commit/688019946358b176eacc872ece72987387a603f1) | fix  | update vite to version 6.0.11                                        |

### @angular/ssr

| Commit                                                                                              | Type | Description                                                        |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| [94643d54d](https://github.com/angular/angular-cli/commit/94643d54da1ddadcec1c169aa844a716bec612f6) | fix  | enhance dynamic route matching for better performance and accuracy |
| [747557aa0](https://github.com/angular/angular-cli/commit/747557aa0aad00f1df2ce7912ab49775e19c60dc) | fix  | redirect to locale pathname instead of full URL                    |
| [bbbc1eb7a](https://github.com/angular/angular-cli/commit/bbbc1eb7a0c295e0bc4aea95b7292ba484f8a360) | fix  | rename `provideServerRoutesConfig` to `provideServerRouting`       |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.14"></a>

# 18.2.14 (2025-01-29)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------- |
| [9d34d28ec](https://github.com/angular/angular-cli/commit/9d34d28ec2965e1b9753556b2721d25ab05c655b) | fix  | remove unused `vite` dependency |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.13"></a>

# 18.2.13 (2025-01-29)

### @angular/cli

| Commit                                                                                              | Type | Description                                                           |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| [deeaf1883](https://github.com/angular/angular-cli/commit/deeaf18836efddfa1ee56a25e44944ba444d35ac) | fix  | correctly select package versions in descending order during `ng add` |

### @angular/build

| Commit                                                                                              | Type | Description                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------- |
| [fdddf2c08](https://github.com/angular/angular-cli/commit/fdddf2c0844081667a09f2ffe0b16f77384959b2) | fix  | update vite to version 5.4.14 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.2.0-next.0"></a>

# 19.2.0-next.0 (2025-01-23)

### @angular/build

| Commit                                                                                              | Type | Description                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------- |
| [8e884a038](https://github.com/angular/angular-cli/commit/8e884a038dbba9bf5d2a973f368fc58633712484) | fix  | handle empty module case to avoid TypeError |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.1.4"></a>

# 19.1.4 (2025-01-22)

### @angular-devkit/schematics

| Commit                                                                                              | Type | Description                                                           |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| [aa6f0d051](https://github.com/angular/angular-cli/commit/aa6f0d051179d31aad2c3be7b79f9fda8de60f34) | fix  | ensure collections can be resolved via test runner in pnpm workspaces |

### @angular/build

| Commit                                                                                              | Type | Description                                                                        |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| [ff8192a35](https://github.com/angular/angular-cli/commit/ff8192a355ca38edb34fb0cfe08ef133629f3f63) | fix  | correct path for `/@ng/components` on Windows                                      |
| [14d2f7ca0](https://github.com/angular/angular-cli/commit/14d2f7ca0e930fceeea53d307db79f0e963c1d53) | fix  | include extracted routes in the manifest during prerendering                       |
| [c87a38f5b](https://github.com/angular/angular-cli/commit/c87a38f5b25b3cddd1b2a1ee4b443b10cf03b767) | fix  | only issue invalid i18n config error for duplicate `subPaths` with inlined locales |
| [d50788cf9](https://github.com/angular/angular-cli/commit/d50788cf9f799ffbe9ba0edde425e6833623686d) | fix  | replace deprecation of `i18n.baseHref` with a warning                              |

### @angular/ssr

| Commit                                                                                              | Type | Description                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| [bcc5fab75](https://github.com/angular/angular-cli/commit/bcc5fab750c0029e16ad91d277f88113a60b7fa1) | fix  | prevent route matcher error when SSR routing is not used             |
| [9bacf3981](https://github.com/angular/angular-cli/commit/9bacf3981995626cf935cf1620c391338de1c9df) | fix  | properly manage catch-all routes with base href                      |
| [59c757781](https://github.com/angular/angular-cli/commit/59c75778112383816da2f729d5ae80705b5828fa) | fix  | unblock route extraction with `withEnabledBlockingInitialNavigation` |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.1.3"></a>

# 19.1.3 (2025-01-20)

### @angular/build

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [7d8c34172](https://github.com/angular/angular-cli/commit/7d8c34172bf29fbf61c0c0114c419903804b6b38) | fix  | allow asset changes to reload page on incremental updates |
| [9fa29af37](https://github.com/angular/angular-cli/commit/9fa29af374060a05a19b32d1f0dee954ec70f451) | fix  | handle relative `@ng/components`                          |
| [c4de34703](https://github.com/angular/angular-cli/commit/c4de34703f8b17ac96e66f889fa0e3ffff524831) | fix  | perform full reload for templates with `$localize` usage  |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.1.2"></a>

# 19.1.2 (2025-01-17)

### @angular/build

| Commit                                                                                              | Type | Description                                                        |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| [939d1612a](https://github.com/angular/angular-cli/commit/939d1612add13bab9aed6cc77bce0e17555bfe3b) | fix  | perform incremental background file updates with component updates |
| [304027207](https://github.com/angular/angular-cli/commit/30402720707b7a8b9042a6046692d62a768cdc64) | fix  | prevent full page reload on HMR updates with SSR enabled           |
| [148acbd58](https://github.com/angular/angular-cli/commit/148acbd58a13b1ba8c4a3349bd6042c24a9f93b5) | fix  | reset component updates on dev-server index request                |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.1.1"></a>

# 19.1.1 (2025-01-16)

### @angular/build

| Commit                                                                                              | Type | Description                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------- |
| [298506751](https://github.com/angular/angular-cli/commit/298506751f2b3788fa2def7f7b4012e9e5465047) | fix  | resolve HMR-prefixed files in SSR with Vite |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.1.0"></a>

# 19.1.0 (2025-01-15)

## Deprecations

### @angular/build

- The `baseHref` option under `i18n.locales` and `i18n.sourceLocale` in `angular.json` is deprecated in favor of `subPath`.

  The `subPath` defines the URL segment for the locale, serving as both the HTML base HREF and the directory name for output. By default, if not specified, `subPath` will use the locale code.

### @schematics/angular

| Commit                                                                                              | Type | Description                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| [02825eec5](https://github.com/angular/angular-cli/commit/02825eec53456384ba5b9c19f25dde3cfc95d796) | feat | use `@angular/build` package in library generation schematic    |
| [88431b756](https://github.com/angular/angular-cli/commit/88431b7564d6757898744597a67fcdc178413128) | fix  | application migration should migrate ng-packagr builder package |

### @angular-devkit/architect

| Commit                                                                                              | Type | Description                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| [2b8a02bac](https://github.com/angular/angular-cli/commit/2b8a02bac098d4ac4f31b0e74bedfc739171e30b) | feat | require build schemas from modules                   |
| [fe1ae6933](https://github.com/angular/angular-cli/commit/fe1ae6933998104c144b2c8854f362289c8d91c6) | fix  | avoid Node.js resolution for relative builder schema |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------- |
| [ce7c4e203](https://github.com/angular/angular-cli/commit/ce7c4e203d0312d21d4a3d1955f9c97bdf3e06d2) | fix  | handle Windows drive letter case insensitivity in path functions |

### @angular-devkit/schematics

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [2f55209dd](https://github.com/angular/angular-cli/commit/2f55209dd24602bdf8c27ef083f96b5f55166971) | fix  | update `Rule` type to support returning a `Promise` of `Tree` |

### @angular/build

| Commit                                                                                              | Type | Description                                                        |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| [2c9d7368f](https://github.com/angular/angular-cli/commit/2c9d7368fc30f3488152e35ac468db5f2a9432f2) | feat | add ng-packagr builder to the package                              |
| [0a570c0c2](https://github.com/angular/angular-cli/commit/0a570c0c2e64c61ce9969975a21c0d9aac8d9f3b) | feat | add support for customizing URL segments with i18n                 |
| [298b554a7](https://github.com/angular/angular-cli/commit/298b554a7a40465444b4c508e2250ecbf459ea47) | feat | enable component template hot replacement by default               |
| [d350f357b](https://github.com/angular/angular-cli/commit/d350f357b2a74df828ec022e03754d59cc680848) | fix  | correctly validate locales `subPath`                               |
| [8aa1ce608](https://github.com/angular/angular-cli/commit/8aa1ce60808c073634237d03045626d379a51183) | fix  | handle loaders correctly in SSR bundles for external packages      |
| [3b7e6a8c6](https://github.com/angular/angular-cli/commit/3b7e6a8c6e2e018a85b437256040fd9c8161d537) | fix  | invalidate component template updates with dev-server SSR          |
| [8fa682e57](https://github.com/angular/angular-cli/commit/8fa682e571dbba4bf249ceb3ca490c4ddd4d7fe5) | fix  | remove deleted assets from output during watch mode                |
| [48cae815c](https://github.com/angular/angular-cli/commit/48cae815cfd0124217c1b5bc8c92dfdb0b150101) | fix  | skip vite SSR warmup file configuration when SSR is disabled       |
| [ba16ad6b5](https://github.com/angular/angular-cli/commit/ba16ad6b56e9a1ae0f380141bc1e1253a75fcf6b) | fix  | support incremental build file results in watch mode               |
| [955acef3d](https://github.com/angular/angular-cli/commit/955acef3d504ac924bd813f401fa9b49edbd337b) | fix  | trigger browser reload on asset changes with Vite dev server       |
| [e74300a2c](https://github.com/angular/angular-cli/commit/e74300a2cbc666482992fa8d6dbfeef37f3a9db5) | fix  | use component updates for component style HMR                      |
| [6a19c217e](https://github.com/angular/angular-cli/commit/6a19c217eaebf9c0bffba8482545efc375fd2a8a) | fix  | warn when using both `isolatedModules` and `emitDecoratorMetadata` |

### @angular/ssr

| Commit                                                                                              | Type | Description                                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------- |
| [8d7a51dfc](https://github.com/angular/angular-cli/commit/8d7a51dfc9658aa2f0f0c527435c05c2b10f34e5) | feat | add `modulepreload` for lazy-loaded routes                                        |
| [41ece633b](https://github.com/angular/angular-cli/commit/41ece633b3d42ef110bf6085fe0783ab2a56efcd) | feat | redirect to preferred locale when accessing root route without a specified locale |
| [3feecddbb](https://github.com/angular/angular-cli/commit/3feecddbba0d0559da10a45ad4040faf8e9d5198) | fix  | disable component boostrapping when running route extraction                      |
| [6edb90883](https://github.com/angular/angular-cli/commit/6edb90883733040d77647cf24dea7f53b1b6ceaa) | fix  | throw error when using route matchers                                             |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.0.7"></a>

# 19.0.7 (2025-01-08)

### @angular-devkit/architect

| Commit                                                                                              | Type | Description                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------ |
| [95c22aeff](https://github.com/angular/angular-cli/commit/95c22aeff4560a199416a20c3622301c5c690119) | fix  | provide better error when builder is not defined |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                       |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------- |
| [028652992](https://github.com/angular/angular-cli/commit/028652992f0f9cc6fec5de35be7ecf74ec3947c5) | fix  | preserve css type for jasmine.css |

### @angular/build

| Commit                                                                                              | Type | Description                                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------- |
| [f7522342a](https://github.com/angular/angular-cli/commit/f7522342a8dd99543422629db6dcf1228c5d7279) | fix  | add asset tracking to application builder watch files                   |
| [e973643bf](https://github.com/angular/angular-cli/commit/e973643bfbe47447ca522ca59b07a94fe6c03e0b) | fix  | do not mark Babel \_defineProperty helper function as pure              |
| [881095eec](https://github.com/angular/angular-cli/commit/881095eec5cdc80fe79de8fdbe05ba985bf8210a) | fix  | enable serving files with bundle-like names                             |
| [db10af0b3](https://github.com/angular/angular-cli/commit/db10af0b3a775619ac71acdd0258cc58e96e948c) | fix  | fix incorrect budget calculation                                        |
| [c822f8f15](https://github.com/angular/angular-cli/commit/c822f8f154b75a8b8e48e32953bee7ec2763fd13) | fix  | handle relative URLs when constructing new URLs during server fetch     |
| [b43c648b0](https://github.com/angular/angular-cli/commit/b43c648b02c181c1d98cd3293d89ad8b131a3f51) | fix  | mitigate JS transformer worker execArgv errors                          |
| [1f2481a4f](https://github.com/angular/angular-cli/commit/1f2481a4f5155368aa571fc6679e3ef8af0ce56f) | fix  | pass `define` option defined in application builder to Vite prebundling |
| [c94f568a4](https://github.com/angular/angular-cli/commit/c94f568a412384bb8e4b66928f41b60220c8b7f4) | fix  | warn when `@angular/localize/init` is imported directly                 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.0.6"></a>

# 19.0.6 (2024-12-18)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                    |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------ |
| [db7421231](https://github.com/angular/angular-cli/commit/db7421231c3da7bbbfde72dc35642aaf005fbeca) | fix  | jasmine.clock with app builder |

### @angular/build

| Commit                                                                                              | Type | Description                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------- |
| [5fbc105ed](https://github.com/angular/angular-cli/commit/5fbc105ed0cb76106916660d99fc53d7480dcbc8) | fix  | force HTTP/1.1 in dev-server SSR with SSL |

### @angular/ssr

| Commit                                                                                              | Type | Description                                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------- |
| [2f4df6b2b](https://github.com/angular/angular-cli/commit/2f4df6b2be458b3651df49f3bced923e8df4d547) | fix  | correctly resolve pre-transform resources in Vite SSR without AppEngine |
| [0789a9e13](https://github.com/angular/angular-cli/commit/0789a9e133fed4edc29b108630b2cf91e157127e) | fix  | ensure correct `Location` header for redirects behind a proxy           |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.0.5"></a>

# 19.0.5 (2024-12-12)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                            |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------- |
| [6c319e44c](https://github.com/angular/angular-cli/commit/6c319e44c707b93e430da93fe815ba839ab18ea1) | fix  | fix webpack config transform for karma |

### @angular/build

| Commit                                                                                              | Type | Description                                                                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| [251bd9f22](https://github.com/angular/angular-cli/commit/251bd9f226f73529e824b131fa8d08b77aa00d09) | fix  | Fixing auto-csp edge cases where                                                                              |
| [1047b8635](https://github.com/angular/angular-cli/commit/1047b8635699d55886fff28cbf02d36df224958d) | fix  | handle external `@angular/` packages during SSR ([#29094](https://github.com/angular/angular-cli/pull/29094)) |
| [376ee9966](https://github.com/angular/angular-cli/commit/376ee996699a9610984f3d3e36b3331557dbeaca) | fix  | provide component HMR update modules to dev-server SSR                                                        |
| [5ea9ce376](https://github.com/angular/angular-cli/commit/5ea9ce3760a191d13db08f5ae7448ce089e8eacd) | fix  | use consistent path separators for template HMR identifiers                                                   |

### @angular/ssr

| Commit                                                                                              | Type | Description                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------- |
| [b3c6c7eb2](https://github.com/angular/angular-cli/commit/b3c6c7eb2cc796796d99758368706b0b8682ae69) | fix  | include `Content-Language` header when locale is set    |
| [4203efb90](https://github.com/angular/angular-cli/commit/4203efb90a38fe2f0d45fabab80dc736e8ca2b7b) | fix  | disable component bootstrapping during route extraction |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.0.4"></a>

# 19.0.4 (2024-12-05)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                    |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------ |
| [23667ed4a](https://github.com/angular/angular-cli/commit/23667ed4aa0bedbb591dc0284116402dc42ed95c) | fix  | handle windows spec collisions |

### @angular/build

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [fc41f50b5](https://github.com/angular/angular-cli/commit/fc41f50b53bbffead017b420105eed5bd8573ac1) | fix  | show error when Node.js built-ins are used during `ng serve` |
| [14451e275](https://github.com/angular/angular-cli/commit/14451e2754caff2c9800cca17e11ffa452575f09) | perf | reuse TS package.json cache when rebuilding                  |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.0.3"></a>

# 19.0.3 (2024-12-04)

### @angular/cli

| Commit                                                                                              | Type | Description                                                           |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| [4e82ca180](https://github.com/angular/angular-cli/commit/4e82ca180b330199b3dffadd9d590c8245dc7785) | fix  | correctly select package versions in descending order during `ng add` |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| [28a51cc5e](https://github.com/angular/angular-cli/commit/28a51cc5e4a08f9e9627a1ec160ce462d18b88d2) | fix  | add required type to `CanDeactivate` guard ([#29004](https://github.com/angular/angular-cli/pull/29004)) |

### @angular/build

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [f26e1b462](https://github.com/angular/angular-cli/commit/f26e1b462ab012b0863f0889bcd60f5e07ca6fd2) | fix  | add timeout to route extraction                       |
| [ab4e77c75](https://github.com/angular/angular-cli/commit/ab4e77c75524d42485ac124f4786ab54bc6c404a) | fix  | allow .json file replacements with application builds |
| [06690d87e](https://github.com/angular/angular-cli/commit/06690d87eb590853eed6166857c9c1559d38d260) | fix  | apply define option to JavaScript from scripts option |
| [775e6f780](https://github.com/angular/angular-cli/commit/775e6f7808e6edb89d29b72ee5bdc6d2b26cb30e) | fix  | avoid deploy URL usage on absolute preload links      |
| [21f21eda3](https://github.com/angular/angular-cli/commit/21f21eda39c62e284c6cbee0d0ebfe271f605239) | fix  | ensure correct handling of `index.output` for SSR     |

### @angular/ssr

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [75cf47e71](https://github.com/angular/angular-cli/commit/75cf47e71b0584e55750d5350932494f689a7e96) | fix  | apply HTML transformation to CSR responses          |
| [5880a0230](https://github.com/angular/angular-cli/commit/5880a02306d9f81f030fcdc91fc6aaeb1986e652) | fix  | correctly handle serving of prerendered i18n pages  |
| [277b8a378](https://github.com/angular/angular-cli/commit/277b8a3786d40cb8477287dcb3ef191ec8939447) | fix  | ensure compatibility for `Http2ServerResponse` type |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.0.2"></a>

# 19.0.2 (2024-11-25)

### @schematics/angular

| Commit                                                                                              | Type | Description                             |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------- |
| [2f53e2af5](https://github.com/angular/angular-cli/commit/2f53e2af55794795979232b0f3e95359299e1aee) | fix  | skip SSR routing prompt in webcontainer |

### @angular/build

| Commit                                                                                              | Type | Description                                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------- |
| [f9da163f8](https://github.com/angular/angular-cli/commit/f9da163f8852800763844ae89e85eaafe0c37f2b) | fix  | minimize reliance on esbuild `inject` to prevent code reordering                |
| [c497749e6](https://github.com/angular/angular-cli/commit/c497749e670e916e17a4e7fb0acb1abe26d9bd9a) | fix  | prevent errors with parameterized routes when `getPrerenderParams` is undefined |

### @angular/ssr

| Commit                                                                                              | Type | Description                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| [c8cd90e0f](https://github.com/angular/angular-cli/commit/c8cd90e0f601a6baa05b84e45bbd37b4bf6049f5) | fix  | handle nested redirects not explicitly defined in router config |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.0.1"></a>

# 19.0.1 (2024-11-21)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [b63123f20](https://github.com/angular/angular-cli/commit/b63123f20702bd53ea99888b83b4253810ae0a09) | fix  | use stylePreprocessorOptions |

### @angular/build

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [74461da64](https://github.com/angular/angular-cli/commit/74461da6439b70b5348c99682842ae20043d9b61) | fix  | ensure accurate content length for server assets         |
| [1b4dcedd5](https://github.com/angular/angular-cli/commit/1b4dcedd594b5d9a1701cd8d1e9874742c05e47f) | fix  | use `sha256` instead of `sha-256` as hash algorithm name |

### @angular/ssr

| Commit                                                                                              | Type | Description                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------ |
| [8bd2b260e](https://github.com/angular/angular-cli/commit/8bd2b260e2008f1ffc71af0e55b27884c3660c54) | fix  | handle baseHref that start with `./` |

<!-- CHANGELOG SPLIT MARKER -->

<a name="19.0.0"></a>

# 19.0.0 (2024-11-19)

## Breaking Changes

### @schematics/angular

- The app-shell schematic is no longer compatible with Webpack-based builders.

### @angular-devkit/build-angular

- The `browserTarget` option has been removed from the DevServer and ExtractI18n builders. `buildTarget` is to be used instead.
- Protractor is no longer supported.

  Protractor was marked end-of-life in August 2023 (see https://protractortest.org/). Projects still relying on Protractor should consider migrating to another E2E testing framework, several support solid migration paths from Protractor.

  - https://angular.dev/tools/cli/end-to-end
  - https://blog.angular.dev/the-state-of-end-to-end-testing-with-angular-d175f751cb9c

### @angular-devkit/core

- The deprecated `fileBuffer` function is no longer available. Update your code to use `stringToFileBuffer` instead to maintain compatibility.

  **Note:** that this change does not affect application developers.

### @angular/build

- The `@angular/localize/init` polyfill will no longer be added automatically to projects. To prevent runtime issues, ensure that this polyfill is manually included in the "polyfills" section of your "angular.json" file if your application relies on Angular localization features.

### @angular/ssr

- The `CommonEngine` API now needs to be imported from `@angular/ssr/node`.

  **Before**

  ```ts
  import { CommonEngine } from '@angular/ssr';
  ```

  **After**

  ```ts
  import { CommonEngine } from '@angular/ssr/node';
  ```

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type | Description                                   |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------- |
| [37693c40e](https://github.com/angular/angular-cli/commit/37693c40e3afc4c6dd7c949ea658bdf94146c9d8) | feat | add package manager option to blank schematic |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                                |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------- |
| [a381a3db1](https://github.com/angular/angular-cli/commit/a381a3db187f7b20e5ec8d1e1a1f1bd860426fcd) | feat | add option to export component as default                                  |
| [755f3a07f](https://github.com/angular/angular-cli/commit/755f3a07f5fe485c1ed8c0c6060d6d5c799c085c) | feat | add option to setup new workspace or application as zoneless mode          |
| [cfca5442e](https://github.com/angular/angular-cli/commit/cfca5442ec01cc4eff4fe75822eb7ef780ccfef1) | feat | integrate `withEventReplay()` in `provideClientHydration` for new SSR apps |
| [292a4b7c2](https://github.com/angular/angular-cli/commit/292a4b7c2f62828606c42258db524341f4a6391e) | feat | update app-shell and ssr schematics to adopt new Server Rendering API      |
| [b1504c3bc](https://github.com/angular/angular-cli/commit/b1504c3bcca4d4c313e5d795ace8b074fb1f8890) | fix  | component spec with export default                                         |
| [4b4e000dd](https://github.com/angular/angular-cli/commit/4b4e000dd60bb43df5c8694eb8a0bc0b45d1cf8d) | fix  | don't show server routing prompt when using `browser` builder              |
| [4e2a5fe15](https://github.com/angular/angular-cli/commit/4e2a5fe155006e7154326319ed39e77e5693d9b3) | fix  | enable opt-in for new `@angular/ssr` feature                               |
| [fcf7443d6](https://github.com/angular/angular-cli/commit/fcf7443d626d1f3e828ebfad464598f7b9ddef12) | fix  | explicitly set standalone:false                                            |
| [7992218a9](https://github.com/angular/angular-cli/commit/7992218a9c22ea9469bd3386c7dc1d5efc6e51f9) | fix  | remove `declaration` and `sourceMap` from default tsconfig                 |
| [9e6ab1bf2](https://github.com/angular/angular-cli/commit/9e6ab1bf231b35aceb989337fac55a6136594c5d) | fix  | use default import for `express`                                           |

### @angular/cli

| Commit                                                                                              | Type | Description                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| [201b60e1d](https://github.com/angular/angular-cli/commit/201b60e1dd25b4abb7670e21d103b67d4eda0e14) | feat | handle string key/value pairs, e.g. --define                      |
| [b847d4460](https://github.com/angular/angular-cli/commit/b847d4460c352604e1935d494efd761915caaa3f) | fix  | recommend optional application update migration during v19 update |
| [f249e7e85](https://github.com/angular/angular-cli/commit/f249e7e856bf16e8c5f154fdb8aff36421649a1b) | perf | enable Node.js compile code cache when available                  |
| [ecc107d83](https://github.com/angular/angular-cli/commit/ecc107d83bfdfd9d5dd1087e264892d60361625c) | perf | enable Node.js compile code cache when available                  |

### @angular-devkit/architect

| Commit                                                                                              | Type | Description                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------- |
| [78f76485f](https://github.com/angular/angular-cli/commit/78f76485fe315ffd0262c1a3732092731235828b) | feat | merge object options from CLI |

### @angular-devkit/build-angular

| Commit                                                                                              | Type     | Description                                               |
| --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------- |
| [0a4ef3026](https://github.com/angular/angular-cli/commit/0a4ef302635e4665ae9881746867dd80ca0d2dc7) | feat     | karma-coverage w/ app builder                             |
| [dcbdca85c](https://github.com/angular/angular-cli/commit/dcbdca85c7fe1a7371b8f6662e0f68e24d56102e) | feat     | karma+esbuild+watch                                       |
| [54594b5ab](https://github.com/angular/angular-cli/commit/54594b5abfa4c9301cc369e5dea5f76b71e51ab0) | feat     | support karma with esbuild                                |
| [ea5ae68da](https://github.com/angular/angular-cli/commit/ea5ae68da9e7f2b598bae2ca9ac8be9c20ce7888) | fix      | bring back style tags in browser builder                  |
| [476f94f51](https://github.com/angular/angular-cli/commit/476f94f51a3403d03ceb9f58ffb4a3564cc52e5a) | fix      | fix --watch regression in karma                           |
| [25d928b4f](https://github.com/angular/angular-cli/commit/25d928b4fde00ae8396f6b9cfcd92b5254fc49aa) | fix      | fix hanging terminal when `browser-sync` is not installed |
| [2ec877dd0](https://github.com/angular/angular-cli/commit/2ec877dd0dede8f3ee849fe83b4a4427bab96447) | fix      | handle basename collisions                                |
| [ab6e19e1f](https://github.com/angular/angular-cli/commit/ab6e19e1f9a8781334821048522abe86b149c9c3) | fix      | handle main field                                         |
| [43e7aae22](https://github.com/angular/angular-cli/commit/43e7aae2284ff15e0282c9d9597c4f31cf1f60a4) | fix      | remove double-watch in karma                              |
| [1e37b5939](https://github.com/angular/angular-cli/commit/1e37b59396a2f815d1671ccecc03ff8441730391) | fix      | serve assets                                              |
| [9d7613db9](https://github.com/angular/angular-cli/commit/9d7613db9bf8b397d5896fcdf6c7b0efeaffa5d5) | fix      | zone.js/testing + karma + esbuild                         |
| [e40384e63](https://github.com/angular/angular-cli/commit/e40384e637bc6f92c28f4e572f986ca902938ba2) | refactor | remove deprecated `browserTarget`                         |
| [62877bdf2](https://github.com/angular/angular-cli/commit/62877bdf2b0449d8c12a167c59d0c24c77467f37) | refactor | remove Protractor builder and schematics                  |

### @angular-devkit/core

| Commit                                                                                              | Type     | Description                                                              |
| --------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| [0d8a1006d](https://github.com/angular/angular-cli/commit/0d8a1006d4629d8af1144065ea237ab30916e66e) | refactor | remove deprecated `fileBuffer` function in favor of `stringToFileBuffer` |

### @angular/build

| Commit                                                                                              | Type     | Description                                                                         |
| --------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| [b6951f448](https://github.com/angular/angular-cli/commit/b6951f4482418f65e4bd1c15d5f7f051c91d59db) | feat     | add `sass` to `stylePreprocessorOptions` in application builder                     |
| [efb434136](https://github.com/angular/angular-cli/commit/efb434136d8c8df207747ab8fd87b7e2116b7106) | feat     | Auto-CSP support as a part of angular.json schema                                   |
| [816e3cb86](https://github.com/angular/angular-cli/commit/816e3cb868961c57a68783601b919370076c41dc) | feat     | enable component stylesheet hot replacement by default                              |
| [3b00fc908](https://github.com/angular/angular-cli/commit/3b00fc908d4f07282e89677928e00665c8578ab5) | feat     | introduce `outputMode` option to the application builder                            |
| [7d883a152](https://github.com/angular/angular-cli/commit/7d883a152e978112245a98f2f737764caa76ec0f) | feat     | introduce `ssr.experimentalPlatform` option                                         |
| [c48d6947e](https://github.com/angular/angular-cli/commit/c48d6947ed17eab19822a97492e3686bcf059494) | feat     | set development/production condition                                                |
| [f63072668](https://github.com/angular/angular-cli/commit/f63072668e44254da78170445ac2417c7bc1aa18) | feat     | utilize `ssr.entry` during prerendering to enable access to local API routes        |
| [bbc290133](https://github.com/angular/angular-cli/commit/bbc290133fc93186980ca3c43f221847ba8e858a) | feat     | utilize `ssr.entry` in Vite dev-server when available                               |
| [5a7a2925b](https://github.com/angular/angular-cli/commit/5a7a2925b1f649eabbeb0a75452978cddb3f243d) | fix      | add missing redirect in SSR manifest                                                |
| [06e5176c2](https://github.com/angular/angular-cli/commit/06e5176c2d3b27aaeb117374a8ae402c6a4c6319) | fix      | add warning when `--prerendering` or `--app-shell` are no-ops                       |
| [ecaf870b5](https://github.com/angular/angular-cli/commit/ecaf870b5cddd5d43d297f1193eb11b8f73757c0) | fix      | always clear dev-server error overlay on non-error result                           |
| [f8677f6a9](https://github.com/angular/angular-cli/commit/f8677f6a9ba155b04c692814a1bc13f5cc47d94d) | fix      | always record component style usage for HMR updates                                 |
| [099e477a8](https://github.com/angular/angular-cli/commit/099e477a8f1bbcf9d0f415dc6fd4743107c967f7) | fix      | avoid hashing development external component stylesheets                            |
| [3602bbb77](https://github.com/angular/angular-cli/commit/3602bbb77b8924e89978427d9115f0b1fd7d46b7) | fix      | avoid overwriting inline style bundling additional results                          |
| [71534aadc](https://github.com/angular/angular-cli/commit/71534aadc403404e2dc9bc12054f32c3ed157db9) | fix      | check referenced files against native file paths                                    |
| [fed31e064](https://github.com/angular/angular-cli/commit/fed31e064611894934c86ed36e8b0808029d4143) | fix      | correctly use dev-server hmr option to control stylesheet hot replacement           |
| [b86bb080e](https://github.com/angular/angular-cli/commit/b86bb080e3a58a3320b2f68fb79edcdc98bfa7e9) | fix      | disable dev-server websocket when live reload is disabled                           |
| [7c50ba9e2](https://github.com/angular/angular-cli/commit/7c50ba9e2faca445c196c69e972ac313547dda54) | fix      | ensure `index.csr.html` is always generated when prerendering or SSR are enabled    |
| [efb2232df](https://github.com/angular/angular-cli/commit/efb2232df5475699a44d0f76a70e2d7de4a71f5a) | fix      | ensure accurate content size in server asset metadata                               |
| [18a8584ea](https://github.com/angular/angular-cli/commit/18a8584ead439d044760fe2abb4a7f657a0b10e3) | fix      | ensure SVG template URLs are considered templates with external stylesheets         |
| [7502fee28](https://github.com/angular/angular-cli/commit/7502fee28a057b53e60b97f55b5aff5281019f1b) | fix      | Exclude known `--import` from execArgv when spawning workers                        |
| [2551df533](https://github.com/angular/angular-cli/commit/2551df533d61400c0fda89db77a93378480f5047) | fix      | fully disable component style HMR in JIT mode                                       |
| [c41529cc1](https://github.com/angular/angular-cli/commit/c41529cc1d762cf508eccf46c44256df21afe24f) | fix      | handle `APP_BASE_HREF` correctly in prerendered routes                              |
| [87a90afd4](https://github.com/angular/angular-cli/commit/87a90afd4600049b184b32f8f92a0634e25890c0) | fix      | incomplete string escaping or encoding                                              |
| [1bb68ba68](https://github.com/angular/angular-cli/commit/1bb68ba6812236a135c1599031bf7e1b7e0d1d79) | fix      | move lmdb to optionalDependencies                                                   |
| [a995c8ea6](https://github.com/angular/angular-cli/commit/a995c8ea6d17778af031c2f9797e52739ea4dc81) | fix      | prevent prerendering of catch-all routes                                            |
| [1654acf0f](https://github.com/angular/angular-cli/commit/1654acf0ff3010b619a22d11f17eec9975d8e2a2) | fix      | relax constraints on external stylesheet component id                               |
| [0d4558ea5](https://github.com/angular/angular-cli/commit/0d4558ea516a4b8716f2442290e05354c502a49e) | fix      | set `ngServerMode` during vite prebundling                                          |
| [55d7f01b6](https://github.com/angular/angular-cli/commit/55d7f01b66f4867aad4598574582e8505f201c82) | fix      | simplify disabling server features with `--no-server` via command line              |
| [cf0228b82](https://github.com/angular/angular-cli/commit/cf0228b828fc43b1b33d48dc0977ff59abb597c2) | fix      | skip wildcard routes from being listed as prerendered routes                        |
| [af52fb49b](https://github.com/angular/angular-cli/commit/af52fb49bdd913af8af9bfbe36be279fce70de39) | fix      | synchronize import/export conditions between bundler and TypeScript                 |
| [6c618d495](https://github.com/angular/angular-cli/commit/6c618d495c54394eb2b87aee36ba5436c06557bd) | fix      | update logic to support both internal and external SSR middlewares                  |
| [bfa8fec9b](https://github.com/angular/angular-cli/commit/bfa8fec9b17d421925a684e2b642dee70165a879) | fix      | use named export `reqHandler` for server.ts request handling                        |
| [c8e1521a2](https://github.com/angular/angular-cli/commit/c8e1521a2bd5b47c811e5d7f9aea7f57e92a4552) | fix      | workaround Vite CSS ShadowDOM hot replacement                                       |
| [d6a34034d](https://github.com/angular/angular-cli/commit/d6a34034d7489c09753090642ade4c606cd98ece) | refactor | remove automatic addition of `@angular/localize/init` polyfill and related warnings |

### @angular/ssr

| Commit                                                                                              | Type | Description                                                                                                |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------- |
| [92209dd2e](https://github.com/angular/angular-cli/commit/92209dd2e93af450e3fc657609efe95c6a6b3963) | feat | add `createRequestHandler` and `createNodeRequestHandler `utilities                                        |
| [41fb2ed86](https://github.com/angular/angular-cli/commit/41fb2ed86056306406832317178ca5d94aa110e2) | feat | Add `getHeaders` Method to `AngularAppEngine` and `AngularNodeAppEngine` for handling pages static headers |
| [f346ee8a8](https://github.com/angular/angular-cli/commit/f346ee8a8819bb2eaf0ffb3d5523b00093be09e5) | feat | add `isMainModule` function                                                                                |
| [d66aaa3ca](https://github.com/angular/angular-cli/commit/d66aaa3ca458e05b535bec7c1dcb98b0e9c5202e) | feat | add server routing configuration API                                                                       |
| [bca568389](https://github.com/angular/angular-cli/commit/bca56838937f942c5ef902f5c98d018582188e84) | feat | dynamic route resolution using Angular router                                                              |
| [30c25bf68](https://github.com/angular/angular-cli/commit/30c25bf6885fefea6094ec1815e066e4c6ada097) | feat | export `AngularAppEngine` as public API                                                                    |
| [455b5700c](https://github.com/angular/angular-cli/commit/455b5700c29845829235e17efec320e634553108) | feat | expose `writeResponseToNodeResponse` and `createWebRequestFromNodeRequest` in public API                   |
| [9692a9054](https://github.com/angular/angular-cli/commit/9692a9054c3cdbf151df01279c2d268332b1a032) | feat | improve handling of aborted requests in `AngularServerApp`                                                 |
| [576ff604c](https://github.com/angular/angular-cli/commit/576ff604cd739a9f41d588fa093ca2568e46826c) | feat | introduce `AngularNodeAppEngine` API for Node.js integration                                               |
| [3c9697a8c](https://github.com/angular/angular-cli/commit/3c9697a8c34a5e0f3470bde73f11f9f32107f42e) | feat | introduce new hybrid rendering API                                                                         |
| [4b09887a9](https://github.com/angular/angular-cli/commit/4b09887a9c82838ccb7a6c95d66225c7875e562b) | feat | move `CommonEngine` API to `/node` entry-point                                                             |
| [d43180af5](https://github.com/angular/angular-cli/commit/d43180af5f3e7b29387fd06625bd8e37f3ebad95) | fix  | add missing peer dependency on `@angular/platform-server`                                                  |
| [74b3e2d51](https://github.com/angular/angular-cli/commit/74b3e2d51c6cf605abd05da81dc7b4c3ccd9b3ea) | fix  | add validation to prevent use of `provideServerRoutesConfig` in browser context                            |
| [2640bf7a6](https://github.com/angular/angular-cli/commit/2640bf7a680300acf18cf6502c57a00e0a5bfda9) | fix  | correct route extraction and error handling                                                                |
| [44077f54e](https://github.com/angular/angular-cli/commit/44077f54e9a95afa5c1f85cf198aaa3412ee08d8) | fix  | designate package as side-effect free                                                                      |
| [df4e1d360](https://github.com/angular/angular-cli/commit/df4e1d3607c2d5bf71d1234fa730e63cd6ab594b) | fix  | enable serving of prerendered pages in the App Engine                                                      |
| [0793c78cf](https://github.com/angular/angular-cli/commit/0793c78cfcbfc5d55fe6ce2cb53cada684bcb8dc) | fix  | ensure wildcard RenderMode is applied when no Angular routes are defined                                   |
| [65b6e75a5](https://github.com/angular/angular-cli/commit/65b6e75a5dca581a57a9ac3d61869fdd20f7dc2e) | fix  | export `RESPONSE_INIT`, `REQUEST`, and `REQUEST_CONTEXT` tokens                                            |
| [4ecf63a77](https://github.com/angular/angular-cli/commit/4ecf63a777871bf214bf42fe1738c206bde3201c) | fix  | export PrerenderFallback                                                                                   |
| [50df63196](https://github.com/angular/angular-cli/commit/50df631960550049e7d1779fd2c8fbbcf549b8ef) | fix  | improve handling of route mismatches between Angular server routes and Angular router                      |
| [3cf7a5223](https://github.com/angular/angular-cli/commit/3cf7a522318e34daa09f29133e8c3444f154ca0b) | fix  | initialize the DI tokens with `null` to avoid requiring them to be set to optional                         |
| [85df4011b](https://github.com/angular/angular-cli/commit/85df4011ba27254ddb7f22dae550272c9c4406dd) | fix  | resolve `bootstrap is not a function` error                                                                |
| [e9c9e4995](https://github.com/angular/angular-cli/commit/e9c9e4995e39d9d62d10fe0497e0b98127bc8afa) | fix  | resolve circular dependency issue from main.server.js reference in manifest                                |
| [64c52521d](https://github.com/angular/angular-cli/commit/64c52521d052f850aa7ea1aaadfd8a9fcee9c387) | fix  | show error when multiple routes are set with `RenderMode.AppShell`                                         |
| [280ebbda4](https://github.com/angular/angular-cli/commit/280ebbda4c65e19b83448a1bb0de056a2ee5d1c6) | fix  | support for HTTP/2 request/response handling                                                               |
| [fb05e7f0a](https://github.com/angular/angular-cli/commit/fb05e7f0abd9d68ac03f243c7774260619b8a623) | fix  | use wildcard server route configuration on the '/' route when the app router is empty                      |
| [12ff37adb](https://github.com/angular/angular-cli/commit/12ff37adbed552fc0db97251c30c889ef00e50f3) | perf | cache generated inline CSS for HTML                                                                        |
| [1d70e3b46](https://github.com/angular/angular-cli/commit/1d70e3b4682806a55d6f7ddacbafcbf615b2a10c) | perf | cache resolved entry-points                                                                                |
| [f460b91d4](https://github.com/angular/angular-cli/commit/f460b91d46ea5b0413596c4852c80d71d5308910) | perf | integrate ETags for prerendered pages                                                                      |
| [e52ae7f6f](https://github.com/angular/angular-cli/commit/e52ae7f6f5296a9628cc4a517e82339ac54925bb) | perf | prevent potential stampede in entry-points cache                                                           |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.12"></a>

# 18.2.12 (2024-11-14)

### @angular/cli

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [c3925ed7f](https://github.com/angular/angular-cli/commit/c3925ed7f8e34fd9816cf5a4e8d63c2c45d31d53) | fix  | support default options for multiselect list x-prompt |

### @angular/build

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [c8bee8415](https://github.com/angular/angular-cli/commit/c8bee8415099dfa03d5309183ebbbaab73b2a0eb) | fix  | allow .js file replacements in all configuration cases        |
| [93f552112](https://github.com/angular/angular-cli/commit/93f552112c2bbd10bc0cee4afcae5b012242636c) | fix  | improve URL rebasing for hyphenated Sass namespaced variables |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.11"></a>

# 18.2.11 (2024-10-30)

### @angular/build

| Commit                                                                                              | Type | Description                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------ |
| [87ec15ba2](https://github.com/angular/angular-cli/commit/87ec15ba266436b7b99b0629beaea3e487434115) | fix  | show error message when error stack is undefined |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.10"></a>

# 18.2.10 (2024-10-23)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------- |
| [7b775f4e0](https://github.com/angular/angular-cli/commit/7b775f4e008652777bbe7b788dabed02bcc70cc7) | fix  | update `http-proxy-middleware` to `3.0.3` |

### @angular/build

| Commit                                                                                              | Type | Description                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| [b1e5f51f9](https://github.com/angular/angular-cli/commit/b1e5f51f9111d7da56ebe64cad51936ad659782d) | fix  | Address build issue in Node.js LTS versions with prerendering or SSR |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.3.11"></a>

# 17.3.11 (2024-10-23)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------- |
| [8bad9cee0](https://github.com/angular/angular-cli/commit/8bad9cee08982fffa5ce8244148b491e66191ed8) | fix  | update `http-proxy-middleware` to `2.0.7` |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.9"></a>

# 18.2.9 (2024-10-16)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------- |
| [237f7c5d0](https://github.com/angular/angular-cli/commit/237f7c5d0355e0a90b23156d3aa97f4328c869e7) | fix  | update browserslist config to include last 2 Android major versions |

### @angular/build

| Commit                                                                                              | Type | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [d749ba6a3](https://github.com/angular/angular-cli/commit/d749ba6a3c3dd7a90317bd9b46e858a842f27696) | fix  | allow direct bundling of TSX files with application builder |
| [b91c82d89](https://github.com/angular/angular-cli/commit/b91c82d8997c0009ed4bbf5e9cd9c82cb1f7f755) | fix  | avoid race condition in sass importer                       |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.8"></a>

# 18.2.8 (2024-10-09)

### @schematics/angular

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [b522002ff](https://github.com/angular/angular-cli/commit/b522002fff763cda2ae1c746efcb2638d0099184) | fix  | add validation for component and directive class name |
| [dfd2d5c05](https://github.com/angular/angular-cli/commit/dfd2d5c0500777fa5aea91519f6657aed7f3b7d7) | fix  | include `index.csr.html` in resources asset group     |

### @angular/build

| Commit                                                                                              | Type | Description                                    |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| [9445916f9](https://github.com/angular/angular-cli/commit/9445916f9b5b9da69623bf86735264d8a5f26fb3) | fix  | `Ctrl + C` not terminating dev-server with SSR |
| [9b5cfaa8c](https://github.com/angular/angular-cli/commit/9b5cfaa8ce9d12bf450e7527d479ce7a879ea1b8) | fix  | always generate a new hash for optimized chunk |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.7"></a>

# 18.2.7 (2024-10-02)

### @schematics/angular

| Commit                                                                                              | Type | Description                                    |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| [3f98193d6](https://github.com/angular/angular-cli/commit/3f98193d6963464bd04b510c2d045938f1418ff3) | fix  | support single quote setting in JetBrains IDEs |

### @angular/build

| Commit                                                                                              | Type | Description                                                                                                |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------- |
| [8274184e1](https://github.com/angular/angular-cli/commit/8274184e1c6fa43cc5101018b6fa86fd636a90ba) | fix  | add `animate` to valid self-closing elements                                                               |
| [2648e811e](https://github.com/angular/angular-cli/commit/2648e811e7c71e8a68d1eb418d7dcdae42ebf9ff) | fix  | add few more SVG elements animateMotion, animateTransform, and feBlend etc. to valid self-closing elements |
| [736e126e4](https://github.com/angular/angular-cli/commit/736e126e4836e1c3df32c0ab9ee40e58c16503c0) | fix  | separate Vite cache by project                                                                             |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.6"></a>

# 18.2.6 (2024-09-25)

### @angular/build

| Commit                                                                                              | Type | Description                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| [9d0b67124](https://github.com/angular/angular-cli/commit/9d0b67124e4855c5c4a2101b64f8ed86f8624561) | fix  | allow missing HTML file request to fallback to index |
| [5fea635b2](https://github.com/angular/angular-cli/commit/5fea635b20b29429e355072c5adc5bf2a597a267) | fix  | update rollup to 4.22.4                              |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.3.10"></a>

# 17.3.10 (2024-09-25)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description          |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------- |
| [30489d8fd](https://github.com/angular/angular-cli/commit/30489d8fd1cf738162d95333fe462eea58ba460f) | fix  | update vite to 4.1.8 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.5"></a>

# 18.2.5 (2024-09-18)

### @angular/build

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [707431625](https://github.com/angular/angular-cli/commit/7074316257bd736e0d3393368fc93dec9604b49e) | fix  | support HTTP HEAD requests for virtual output files |
| [1032b3da1](https://github.com/angular/angular-cli/commit/1032b3da1a0f3aaf63d2fd3cd8c6fd3b0d0b578c) | fix  | update vite to `5.4.6`                              |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.16"></a>

# 16.2.16 (2024-09-18)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description          |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------- |
| [12aca0060](https://github.com/angular/angular-cli/commit/12aca0060492c73cec1bbc231119dde6a4b52607) | fix  | update vite to 4.5.5 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.4"></a>

# 18.2.4 (2024-09-11)

### @angular/build

| Commit                                                                                              | Type | Description                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| [765309a2e](https://github.com/angular/angular-cli/commit/765309a2e1bcd3bb07ff87062fc2dc04e4bce16f) | fix  | prevent transformation of Node.js internal dependencies by Vite |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.3"></a>

# 18.2.3 (2024-09-04)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| [482076612](https://github.com/angular/angular-cli/commit/482076612cac4b6565fc1b5e89ff9ca207653f87) | fix  | update `webpack-dev-middleware` to `7.4.2` |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.2"></a>

# 18.2.2 (2024-08-29)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [504b00b93](https://github.com/angular/angular-cli/commit/504b00b93b80eec4185838b426c0f6acaa3a148e) | fix  | clear context in Karma by default for single run executions |
| [82b76086e](https://github.com/angular/angular-cli/commit/82b76086eb519c224981038dfa55b2ec3cfec0b4) | fix  | update webpack to `5.94.0`                                  |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.3.9"></a>

# 17.3.9 (2024-08-29)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [e2c5c034d](https://github.com/angular/angular-cli/commit/e2c5c034d96962fe6f358285e376630c71ac9673) | fix  | clear context in Karma by default for single run executions |
| [88501f3d5](https://github.com/angular/angular-cli/commit/88501f3d5586f72ee0900b8d351af3d72bdc0dee) | fix  | upgrade webpack to `5.94.0`                                 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.15"></a>

# 16.2.15 (2024-08-29)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [f596a3d5d](https://github.com/angular/angular-cli/commit/f596a3d5def009b5130440113e3c9b450eb98040) | fix  | clear context in Karma by default for single run executions |
| [56fa051bd](https://github.com/angular/angular-cli/commit/56fa051bd92ad47ea089499a488f3566a93375e6) | fix  | upgrade webpack to `5.94.0`                                 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.1"></a>

# 18.2.1 (2024-08-21)

### @angular/cli

| Commit                                                                                              | Type | Description                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| [05a274a01](https://github.com/angular/angular-cli/commit/05a274a01365c21f69c0412f3455acd14cc6ddc5) | fix  | prevent bypassing select/checkbox prompts on validation failure |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type | Description                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| [94e27c88b](https://github.com/angular/angular-cli/commit/94e27c88bb968589bc8b9b5d6536ce6c0ba0b24f) | fix  | prevent bypassing select/checkbox prompts on validation failure |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                    |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| [ddeb2b2b9](https://github.com/angular/angular-cli/commit/ddeb2b2b93eaa9d8b659d17357aa2b7a9dc509ce) | fix  | remove outdated browser-esbuild option warning |

### @angular/build

| Commit                                                                                              | Type | Description                                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------- |
| [83b2699ab](https://github.com/angular/angular-cli/commit/83b2699abbf58a7c90d2339fa4a01d67aa2d2d33) | fix  | improve error message when an unhandled exception occurs during prerendering |
| [0be4038a5](https://github.com/angular/angular-cli/commit/0be4038a503626e2e9f44d68fe5599cc6028dd8e) | fix  | support reading on-disk files during i18n extraction                         |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.2.0"></a>

# 18.2.0 (2024-08-14)

### @schematics/angular

| Commit                                                                                              | Type | Description                              |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------- |
| [4da922e4f](https://github.com/angular/angular-cli/commit/4da922e4f4e905a1274e70adca1d875c025b8b46) | feat | use isolatedModules in generated project |

### @angular/build

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [24aaf1e37](https://github.com/angular/angular-cli/commit/24aaf1e37f49735ce97fe72fced3d53b51d6b631) | feat | support import attribute based loader configuration |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.1.4"></a>

# 18.1.4 (2024-08-07)

### @angular/build

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [f8b092711](https://github.com/angular/angular-cli/commit/f8b092711481a5754ea93bce65d706d261873810) | fix  | allow explicitly disabling TypeScript incremental mode |
| [f3a5970fc](https://github.com/angular/angular-cli/commit/f3a5970fca0a196b1ac905306257d65bab3b1325) | fix  | lazy load Node.js inspector for dev server             |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.1.3"></a>

# 18.1.3 (2024-07-31)

### @angular/build

| Commit                                                                                              | Type | Description                                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| [a28615d7d](https://github.com/angular/angular-cli/commit/a28615d7dd3f6503f257756058fe182ce6f6b052) | fix  | add CSP `nonce` attribute to script tags when inline critical CSS is disabled |
| [747a1447c](https://github.com/angular/angular-cli/commit/747a1447c1855a1bb918e5f55e4ba4182235f88a) | fix  | prevent build failures with remote CSS imports when Tailwind is configured    |
| [c0933f2c0](https://github.com/angular/angular-cli/commit/c0933f2c0354a13ba3f752f29b24054177697faa) | fix  | resolve error with `extract-i18n` builder for libraries                       |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.1.2"></a>

# 18.1.2 (2024-07-24)

### @angular/build

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [5b9378a3b](https://github.com/angular/angular-cli/commit/5b9378a3be3a1c4f465ba471a120a2edd3a4d2f8) | fix  | account for HTML base HREF for dev-server externals |
| [3e4ea77d7](https://github.com/angular/angular-cli/commit/3e4ea77d755edce2c88d55b76860e6e91fb03f3c) | fix  | correctly detect comma in Sass URL lexer            |
| [d868270f1](https://github.com/angular/angular-cli/commit/d868270f1baf0fd5f2c5677691cc9c4e88b47d8f) | fix  | prevent redirection loop                            |
| [3573ac655](https://github.com/angular/angular-cli/commit/3573ac6555ead2afc34979e284426a0204fff42c) | fix  | serve HTML files directly                           |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.1.1"></a>

# 18.1.1 (2024-07-17)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------- |
| [4f6cee272](https://github.com/angular/angular-cli/commit/4f6cee2721b52427624370f3f81f3edc140774e7) | fix  | skip undefined files when generating budget stats |

### @angular/build

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [96dc7e6ed](https://github.com/angular/angular-cli/commit/96dc7e6ed3317e354fae82d1b42b31250e96d89d) | fix  | remove Vite "/@id/" prefix for explicit external dependencies |
| [bdef39801](https://github.com/angular/angular-cli/commit/bdef3980160db8c27ae103444a41275351434b78) | fix  | resolve only ".wasm" files                                    |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.1.0"></a>

# 18.1.0 (2024-07-10)

### @angular/cli

| Commit                                                                                              | Type | Description                                    |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| [6d266c146](https://github.com/angular/angular-cli/commit/6d266c146c9e141396236b93f2bfafcb261fd7aa) | fix  | add fallbacks for migration package resolution |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------- |
| [22e05dcb4](https://github.com/angular/angular-cli/commit/22e05dcb4a9ae963997c58fad86125ca51b19a36) | fix  | generate new projects with ECMAScript standard class field behavior |

### @angular/build

| Commit                                                                                              | Type | Description                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| [687a6c7ec](https://github.com/angular/angular-cli/commit/687a6c7eca740a98129196908689a44c181b33a5) | feat | add `--inspect` option to the dev-server                        |
| [628d87a94](https://github.com/angular/angular-cli/commit/628d87a9474ad2792b69bfbc501a2c5960b27db9) | feat | support WASM/ES Module integration proposal                     |
| [3e359da8d](https://github.com/angular/angular-cli/commit/3e359da8dfdbfdb99be13f5c52a7e429c106d4ad) | fix  | address rxjs undefined issues during SSR prebundling            |
| [4ff914a16](https://github.com/angular/angular-cli/commit/4ff914a16525350050c5e8359fb59f9d6f243d27) | fix  | allow additional module preloads up to limit                    |
| [fb8e3c39a](https://github.com/angular/angular-cli/commit/fb8e3c39a8b265003e98c8c6b5a9ec898223249f) | fix  | allow top-level await in zoneless applications                  |
| [83b75af9f](https://github.com/angular/angular-cli/commit/83b75af9f74af0742a6a78cf7531866b7ba434b6) | fix  | check inlineSourceMap option with isolated modules optimization |
| [cd97134a6](https://github.com/angular/angular-cli/commit/cd97134a6e1468c6806c2bd753c934ec91bc3927) | fix  | normalize paths during module resolution in Vite                |
| [13d2100dd](https://github.com/angular/angular-cli/commit/13d2100ddcc670d69f2d7754890b80eae2e7649a) | fix  | read WASM file from script location on Node.js                  |
| [3091956f5](https://github.com/angular/angular-cli/commit/3091956f503754f313dbf98a8de6d21d3d01ebe3) | fix  | support import attributes in JavaScript transformer             |
| [dd94a831b](https://github.com/angular/angular-cli/commit/dd94a831b4ce1ca55289fca1818aa26195e81dbc) | perf | enable dependency prebundling for server dependencies           |
| [3acb77683](https://github.com/angular/angular-cli/commit/3acb7768317bb05a9cd73fa64e081b5ca0326189) | perf | use direct transpilation with isolated modules                  |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.0.7"></a>

# 18.0.7 (2024-07-03)

### @angular/cli

| Commit                                                                                              | Type | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [67bf90131](https://github.com/angular/angular-cli/commit/67bf9013151c4e6a13c91ecf4afd78c863d9e33f) | fix  | make `ng update` to keep newline at the end of package.json |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [9b43ecbd0](https://github.com/angular/angular-cli/commit/9b43ecbd0395027548781a19345fbcd82261d4f4) | fix  | reduce the number of max workers to available CPUs minus one |
| [03dad6806](https://github.com/angular/angular-cli/commit/03dad680676c4b2272b65a51dd62d74360e20b78) | fix  | rollback terser to `5.29.2`                                  |

### @angular/build

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [fc928f638](https://github.com/angular/angular-cli/commit/fc928f6386061f34f7cd3ef6bb6d25aa4a33a800) | fix  | correctly name entry points to match budgets                 |
| [2d51e8607](https://github.com/angular/angular-cli/commit/2d51e86077c4687224e931f49c82a907f5229ae5) | fix  | redirect to path with trailing slash for asset directories   |
| [16f1c1e01](https://github.com/angular/angular-cli/commit/16f1c1e010090596b7d7c3911f01728e3feecc4d) | fix  | reduce the number of max workers to available CPUs minus one |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.0.6"></a>

# 18.0.6 (2024-06-26)

### @angular/build

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [98a8a8a78](https://github.com/angular/angular-cli/commit/98a8a8a781fd7901f2e1c1d2eb22975ac65f0329) | fix  | show JavaScript cache store initialization warning |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.0.5"></a>

# 18.0.5 (2024-06-20)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| [5c705e800](https://github.com/angular/angular-cli/commit/5c705e800c17237d82bc9065f22e30b720ddcec0) | fix  | update schematics to use RouterModule when --routing flag is present |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [86e031dc7](https://github.com/angular/angular-cli/commit/86e031dc7ef6c736e431caf973aca1233d912060) | fix  | use istanbul-lib-instrument directly for karma code coverage |

### @angular/build

| Commit                                                                                              | Type | Description                                                |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| [bdd168f37](https://github.com/angular/angular-cli/commit/bdd168f37f7757e0c02971e21e90479555a6e703) | fix  | add CSP nonce to script with src tags                      |
| [405c14809](https://github.com/angular/angular-cli/commit/405c1480917d50c677be178c817b845f30cc8cce) | fix  | automatically resolve `.mjs` files when using Vite         |
| [7360a346e](https://github.com/angular/angular-cli/commit/7360a346ed1b329c0620301ce0e0464d5569a42f) | fix  | use Node.js available parallelism for default worker count |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.0.4"></a>

# 18.0.4 (2024-06-13)

### @angular/build

| Commit                                                                                              | Type | Description                                                                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------- |
| [791ef809d](https://github.com/angular/angular-cli/commit/791ef809d8dfec8fde844e916973a05b2eb5c9d9) | fix  | do not reference sourcemaps in web workers and global stylesheet bundles when hidden setting is enabled |
| [20fc6ca05](https://github.com/angular/angular-cli/commit/20fc6ca057e5190155474e7377bf9f22aab597dd) | fix  | generate module preloads next to script elements in index HTML                                          |
| [3a1bf5c8a](https://github.com/angular/angular-cli/commit/3a1bf5c8a52d6ec1eb337f0937bf073de2ea0b62) | fix  | Initiate PostCSS only once                                                                              |
| [78c611754](https://github.com/angular/angular-cli/commit/78c6117544afa1aa69ef5485f1c3b77b1207f6f1) | fix  | issue warning when auto adding `@angular/localize/init`                                                 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.0.3"></a>

# 18.0.3 (2024-06-05)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                                                |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------- |
| [b709d2a24](https://github.com/angular/angular-cli/commit/b709d2a243926f1ab01e8c8a78d68fc57ab4cab3) | fix  | add `schema.json` options to parsed command, also when a version is passed to `ng add <package>@<version>` |

### @angular/build

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [43a2a7d13](https://github.com/angular/angular-cli/commit/43a2a7d137328c1f6f865b76585a92f4e5058b13) | fix  | avoid escaping rebased Sass URL values                    |
| [9acb5c7ca](https://github.com/angular/angular-cli/commit/9acb5c7ca8e6d14379e39f56d2498c0276214210) | fix  | disable JS transformer persistent cache on web containers |
| [346df4909](https://github.com/angular/angular-cli/commit/346df490976e39d791db5ecfa14eab6a5ad8d99d) | fix  | improve Sass rebaser ident token detection                |
| [6526a5f59](https://github.com/angular/angular-cli/commit/6526a5f590fbc7f26b9e613af3b5c497e30603b5) | fix  | watch all related files during a Sass error               |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.0.2"></a>

# 18.0.2 (2024-05-29)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [9967c04b8](https://github.com/angular/angular-cli/commit/9967c04b86c6928509c80af7144b342616e9681b) | fix  | check both application builder packages in SSR schematic    |
| [92b48ab14](https://github.com/angular/angular-cli/commit/92b48ab144fbe5b8f89d371b0a8fa94d0d17b72c) | fix  | set builders `assets` option correctly for new applications |

### @angular/build

| Commit                                                                                              | Type | Description                                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------- |
| [3bb06c37d](https://github.com/angular/angular-cli/commit/3bb06c37dc20d7af358f007b9928de71f39545d2) | fix  | disable Worker wait loop for Sass compilations in web containers |
| [c4cf35923](https://github.com/angular/angular-cli/commit/c4cf359233e1044864539383912b9ba0432e149d) | fix  | print Sass `@warn` location                                      |
| [352879804](https://github.com/angular/angular-cli/commit/3528798042a232779478bf82b4d4f6521fab4c30) | fix  | support valid self-closing MathML tags in HTML index file        |
| [476f3084a](https://github.com/angular/angular-cli/commit/476f3084aff333a45c4937950abdba65cd420eba) | fix  | support valid self-closing SVG tags in HTML index file           |

### @angular/pwa

| Commit                                                                                              | Type | Description                                                    |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| [acbffd236](https://github.com/angular/angular-cli/commit/acbffd2368d3c979b26a4541d3f44387fdba0651) | fix  | set manifest `icons` location to match `assets` builder option |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.0.1"></a>

# 18.0.1 (2024-05-23)

### @schematics/angular

| Commit                                                                                              | Type | Description               |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------- |
| [01842f515](https://github.com/angular/angular-cli/commit/01842f5154fe0ec41226d1dd28e099bf57f3d2c9) | fix  | use angular.dev in readme |

### @angular/build

| Commit                                                                                              | Type | Description                                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------- |
| [7d253e9cd](https://github.com/angular/angular-cli/commit/7d253e9cd0bb6df829fd4229465f4334d5c134bb) | fix  | avoid rebasing URLs with function calls                                 |
| [6b6a76a99](https://github.com/angular/angular-cli/commit/6b6a76a998980392d78e1cabc5e5fe4af0ced01c) | fix  | disable persistent disk caching inside webcontainers by default         |
| [ba70a50b6](https://github.com/angular/angular-cli/commit/ba70a50b6bc45a6b07ff24feed3b36915294063b) | fix  | handle esbuild-browser `polyfills` option as `string` during `ng serve` |
| [706423aca](https://github.com/angular/angular-cli/commit/706423acad2c431c4125166d078dbad804719d95) | fix  | only import persistent cache store with active caching                  |

<!-- CHANGELOG SPLIT MARKER -->

<a name="18.0.0"></a>

# 18.0.0 (2024-05-22)

## Breaking Changes

### @angular/cli

- The `ng doc` command has been removed without a replacement. To perform searches, please visit www.angular.dev
- Node.js support for versions <18.19.1 and <20.11.1 has been removed.

### @angular-devkit/build-angular

- By default, the index.html file is no longer emitted in the browser directory when using the application builder with SSR. Instead, an index.csr.html file is emitted. This change is implemented because in many cases server and cloud providers incorrectly treat the index.html file as a statically generated page. If you still require the old behavior, you can use the `index` option to specify the `output` file name.

  ```json
  "architect": {
    "build": {
      "builder": "@angular-devkit/build-angular:application",
      "options": {
        "outputPath": "dist/my-app",
        "index": {
          "input": "src/index.html",
          "output": "index.html"
        }
      }
    }
  }
  ```

- The support for the legacy Sass build pipeline, previously accessible via `NG_BUILD_LEGACY_SASS` when utilizing webpack-based builders, has been removed.

## Deprecations

### @angular-devkit/schematics

- `NodePackageLinkTask` in `@angular-devkit/schematics`. A custom task should be created instead.

### @angular/cli

| Commit                                                                                              | Type     | Description                                               |
| --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------- |
| [ac3019570](https://github.com/angular/angular-cli/commit/ac301957093d0689c98f7debe98fbb2546c9b442) | feat     | add `ng dev` alias to `ng serve`                          |
| [4087728c3](https://github.com/angular/angular-cli/commit/4087728c3e6350d85d653e9d053249ff77e639e6) | feat     | support for Node.js v22                                   |
| [41ab6c8c3](https://github.com/angular/angular-cli/commit/41ab6c8c3486d7cf7c41c18ae3b603376f647605) | fix      | add `--version` option                                    |
| [df4dde95d](https://github.com/angular/angular-cli/commit/df4dde95daa12d5b08b3c4e937f4b4048d645254) | fix      | add `@angular/build` package to update group list         |
| [1039f6d79](https://github.com/angular/angular-cli/commit/1039f6d7997523dd4657c5c2a06631e6075b7bc0) | fix      | change update guide link to angular.dev                   |
| [f4670fcb1](https://github.com/angular/angular-cli/commit/f4670fcb1af20a53501b557fc0e6126afce766d5) | fix      | eliminate prompts during `ng version` command             |
| [a99ec6a54](https://github.com/angular/angular-cli/commit/a99ec6a5453fb732500ef7abff67f76511a74da3) | fix      | keep cli package first in update package group metadata   |
| [dd786d495](https://github.com/angular/angular-cli/commit/dd786d495ce6e7d759b0b225b2efe25fb5727d08) | fix      | only add --version option on default command              |
| [03eee0545](https://github.com/angular/angular-cli/commit/03eee0545095ff958ac86cb5dfad44692ef018ae) | refactor | remove `ng doc` command                                   |
| [c7b208555](https://github.com/angular/angular-cli/commit/c7b208555e34cc5ebf9cf2d335d257e72297cae9) | refactor | remove support for Node.js versions <18.19.1 and <20.11.1 |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------- |
| [b2ac5fac7](https://github.com/angular/angular-cli/commit/b2ac5fac7d66ccd027f766565fa17c6a3bb18e44) | feat | allow application migration to use new build package in projects where possible |
| [6530aa11b](https://github.com/angular/angular-cli/commit/6530aa11bed5ef67d611e8aed268bd20345cf0e6) | feat | replace `assets` with `public` directory                                        |
| [725883713](https://github.com/angular/angular-cli/commit/72588371385bebeea1003dff4d1d0a2ca9854321) | feat | use eventCoalescing option by default (standalone bootstrap)                    |
| [508d97da7](https://github.com/angular/angular-cli/commit/508d97da76b5359bc8029888ff0e9cfc59a6139c) | feat | use ngZoneEventCoalescing option by default (module bootstrap)                  |
| [f452589e2](https://github.com/angular/angular-cli/commit/f452589e2c921448b76a138a5f34ba92ad05e297) | feat | use TypeScript bundler module resolution for new projects                       |
| [95a4d6ee5](https://github.com/angular/angular-cli/commit/95a4d6ee56d80dce012cf2306422bb7fd8e0e32d) | fix  | add less dependency in application migration if needed                          |
| [c46aa084f](https://github.com/angular/angular-cli/commit/c46aa084f53be7ebdb8cc450bd81907222d00275) | fix  | add postcss dependency in application migration if needed                       |
| [157329384](https://github.com/angular/angular-cli/commit/157329384809d723c428a043712a331493826748) | fix  | add spaces around eventCoalescing option                                        |
| [23cc337aa](https://github.com/angular/angular-cli/commit/23cc337aa34c919e344ab001f5efbb8fe9ce3c7c) | fix  | keep deployUrl option when migrating to application builder                     |

### @angular-devkit/architect

| Commit                                                                                              | Type | Description                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------- |
| [ddd08efef](https://github.com/angular/angular-cli/commit/ddd08efefecfe9b74db6a866a1bed0216380a28a) | fix  | resolve builder aliases from containing package |

### @angular-devkit/build-angular

| Commit                                                                                              | Type     | Description                                                                                          |
| --------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| [53c319aaa](https://github.com/angular/angular-cli/commit/53c319aaa95049b8558df80e57fa0a6318003121) | feat     | add support for the `poll` option in the library builder                                             |
| [83d1d233a](https://github.com/angular/angular-cli/commit/83d1d233a2eded71fcdd5fec4b1a90bdd4dbf132) | feat     | enhance Sass rebasing importer for resources URL defined in variables and handling of external paths |
| [d51cb598a](https://github.com/angular/angular-cli/commit/d51cb598a74aba313aee212656de506004a041e6) | feat     | inject event-dispatch in SSR HTML page                                                               |
| [0b03829bc](https://github.com/angular/angular-cli/commit/0b03829bcefea5c250c6a9ff880a737fcc351b2e) | feat     | move i18n extraction for application builder to new build system package                             |
| [4ffe07aa2](https://github.com/angular/angular-cli/commit/4ffe07aa24a0fc9ff48461e9c3664d96e92317cf) | feat     | move Vite-based dev-server for application builder to new build system package                       |
| [d1c632af9](https://github.com/angular/angular-cli/commit/d1c632af9a98d4e8975f198cf205194e2ebff209) | feat     | support native async/await when app is zoneless                                                      |
| [37fc7f0cc](https://github.com/angular/angular-cli/commit/37fc7f0ccf3b8e6f31a0c5b2eaf4aee52f439472) | fix      | disable Vite prebundling when script optimizations are enabled                                       |
| [2acf95a94](https://github.com/angular/angular-cli/commit/2acf95a94993e51876d4004d2c3bc0a04be0a419) | fix      | do not generate an `index.html` file in the browser directory when using SSR.                        |
| [8a54875cb](https://github.com/angular/angular-cli/commit/8a54875cbb654f95d5213b2d84190bd3814d6810) | fix      | handle wrapping of class expressions emitted by esbuild                                              |
| [97973059e](https://github.com/angular/angular-cli/commit/97973059ec56a573629f7a367757773a3cfabe17) | refactor | remove Sass legacy implementation                                                                    |

### @angular-devkit/schematics

| Commit                                                                                              | Type     | Description                     |
| --------------------------------------------------------------------------------------------------- | -------- | ------------------------------- |
| [797584583](https://github.com/angular/angular-cli/commit/797584583138c9223bf238ae8f352e77575bd25a) | refactor | deprecate `NodePackageLinkTask` |

### @angular/build

| Commit                                                                                              | Type | Description                                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| [810d213e1](https://github.com/angular/angular-cli/commit/810d213e1813dd01620173f5f999dca7bccf8ea1) | feat | introduce new official build system package                                          |
| [b7a0792b3](https://github.com/angular/angular-cli/commit/b7a0792b3286fc98d1343f55b5df89ddf13e36bc) | fix  | add a maximum rendering timeout for SSG                                              |
| [411115303](https://github.com/angular/angular-cli/commit/41111530349db1ac199c3ac1d4eccbde8b023123) | fix  | add console note about development server raw file size                              |
| [921fa7cf4](https://github.com/angular/angular-cli/commit/921fa7cf4adc69d3cb6ec7dd5c8d7cace33a502e) | fix  | add missing `ansi-colors` and `picomatch` dependencies                               |
| [791cf75af](https://github.com/angular/angular-cli/commit/791cf75afb0b3b5892c41296bc4049a2c10926e8) | fix  | check both potential build packages in Angular version check                         |
| [4d7cd5e3e](https://github.com/angular/angular-cli/commit/4d7cd5e3ed303c53b2cc63720b9a577e2f46f170) | fix  | correctly wrap class expressions with static properties or blocks emitted by esbuild |
| [57f448a0f](https://github.com/angular/angular-cli/commit/57f448a0f70c76c1a0ebbe941f82eec1d698e7d4) | fix  | decode URL pathname decoding during SSG fetch                                        |
| [940e382db](https://github.com/angular/angular-cli/commit/940e382db27474dba6479f57e4ffefee04cfca66) | fix  | disable Vite prebundling when script optimizations are enabled                       |
| [70dbc7a6e](https://github.com/angular/angular-cli/commit/70dbc7a6e9a7f6d55aeb4e10e8e686b186e6cdf3) | fix  | emit error for invalid self-closing element in index HTML                            |
| [44b401747](https://github.com/angular/angular-cli/commit/44b401747f78bab208ce863f9c08e7a12f01fe27) | fix  | ensure input index HTML file triggers rebuilds when changed                          |
| [dff4deaeb](https://github.com/angular/angular-cli/commit/dff4deaeb366d0ff734ae02abdbaa1fcdcd901aa) | fix  | ensure recreated files are watched                                                   |
| [17931166d](https://github.com/angular/angular-cli/commit/17931166d83a4b18d2f4eb81f8a445b2365c71aa) | fix  | format sizes using decimal byte units consistently                                   |
| [2085365e0](https://github.com/angular/angular-cli/commit/2085365e04c9b08dbf2024036b93609046f2f458) | fix  | only generate shallow preload links for initial files                                |
| [33cd47c85](https://github.com/angular/angular-cli/commit/33cd47c85ea12df57ec7b244beccfa299c927765) | fix  | properly configure headers for media resources and HTML page                         |
| [d10fece2c](https://github.com/angular/angular-cli/commit/d10fece2c17183e18d04733dec22459ced1cc1c8) | fix  | properly rebase Sass url() values with leading interpolations                        |
| [3f2963835](https://github.com/angular/angular-cli/commit/3f2963835759fa3eed1faf64a7b87d5dcf8a6fa3) | perf | add persistent caching of JavaScript transformations                                 |
| [a15eb7d1c](https://github.com/angular/angular-cli/commit/a15eb7d1c6a26f5d94da5566f8b4ac1810ea1361) | perf | improve rebuild time for file loader usage with prebundling                          |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.3.8"></a>

# 17.3.8 (2024-05-22)

### @angular/cli

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [3ada6eb52](https://github.com/angular/angular-cli/commit/3ada6eb5256631ca3a951525fc9814ad0447a41f) | fix  | clarify optional migration instructions during ng update |

### @angular-devkit/schematics

| Commit                                                                                              | Type | Description                                                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------- |
| [4b6ba8df1](https://github.com/angular/angular-cli/commit/4b6ba8df1ab8f4801fba7ddc38812417e274d960) | fix  | `SchematicTestRunner.runExternalSchematic` fails with "The encoded data was not valid for encoding utf-8" |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.3.7"></a>

# 17.3.7 (2024-05-08)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                   |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------- |
| [998c72036](https://github.com/angular/angular-cli/commit/998c720363087f3f0b1748d3f875e5b536a3119d) | fix  | decode URL pathname decoding during SSG fetch |

### @angular-devkit/schematics

| Commit                                                                                              | Type | Description                                   |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------- |
| [1ab1c6c9e](https://github.com/angular/angular-cli/commit/1ab1c6c9e10ce938402355afed4602b76ac08a0e) | fix  | use web standard error check for Deno support |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.3.6"></a>

# 17.3.6 (2024-04-25)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [dcec59799](https://github.com/angular/angular-cli/commit/dcec59799faac66bf25043984c11944479efcf4d) | fix  | properly configure headers for media resources and HTML page |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.3.5"></a>

# 17.3.5 (2024-04-17)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| [6191d06ca](https://github.com/angular/angular-cli/commit/6191d06ca735a8fd29f048f319f912076abec698) | fix  | address `Unable to deserialize cloned data` issue with Yarn PnP |
| [0335d6a5d](https://github.com/angular/angular-cli/commit/0335d6a5df1c0b0706673e6152e3bf5eb65d166a) | fix  | remove `type="text/css"` from `style` tag                       |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.3.4"></a>

# 17.3.4 (2024-04-11)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [1128bdd64](https://github.com/angular/angular-cli/commit/1128bdd642c3e60c67485970e5cd354b2fde0f98) | fix  | ensure esbuild-based builders exclusively produce ESM output |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.14"></a>

# 16.2.14 (2024-04-11)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------- |
| [1068c3c73](https://github.com/angular/angular-cli/commit/1068c3c733a7c52e7876d43454d0ff590c99b61b) | fix  | update vite to `4.5.3` |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.3.3"></a>

# 17.3.3 (2024-04-02)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| [a673baf5c](https://github.com/angular/angular-cli/commit/a673baf5ce385415ded23641a2dc5cdcae8f3f5c) | fix  | Revert "fix(@schematics/angular): rename SSR port env variable" |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.3.2"></a>

# 17.3.2 (2024-03-25)

### @schematics/angular

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [935f931ee](https://github.com/angular/angular-cli/commit/935f931eea8ddd1cb86b2275b8e384bf51e9153e) | fix  | rename SSR port env variable |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                        |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| [c9d436000](https://github.com/angular/angular-cli/commit/c9d4360000e6134b936781be3b0d5cf1871d44d7) | fix  | `Internal server error: Invalid URL` when using a non localhost IP |
| [59fba38ec](https://github.com/angular/angular-cli/commit/59fba38ec6181c8d9c7a0636fb514c4b25aaf0cd) | fix  | ensure proper resolution of linked SCSS files                      |
| [27dd8f208](https://github.com/angular/angular-cli/commit/27dd8f208911dbb2eda6d64efd6d1ce8c463ce35) | fix  | service-worker references non-existent named index output          |
| [c12907d92](https://github.com/angular/angular-cli/commit/c12907d92f8a2268541fd3bf28857dbb216ec7c9) | fix  | update `webpack-dev-middleware` to `6.1.2`                         |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.13"></a>

# 16.2.13 (2024-03-25)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| [5ad507e3d](https://github.com/angular/angular-cli/commit/5ad507e3d4cb27fb275d255018b9b6e735835711) | fix  | `update webpack-dev-middleware` to `6.1.2` |

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.2.11"></a>

# 15.2.11 (2024-03-25)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| [c6feb0bb0](https://github.com/angular/angular-cli/commit/c6feb0bb0247a1cf17e17325b8c42d0d6a7d1451) | fix  | `update webpack-dev-middleware` to `6.1.2` |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.3.1"></a>

# 17.3.1 (2024-03-20)

### @schematics/angular

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [198ca9afc](https://github.com/angular/angular-cli/commit/198ca9afcc9a043d4329c2f4032f0b9cefa11a2e) | fix  | improve Sass format clarity for application style option |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------- |
| [2809971a5](https://github.com/angular/angular-cli/commit/2809971a57966cf79965c84a933f70709334c16b) | fix  | only generate `server` directory when SSR is enabled                                                |
| [3f601a14e](https://github.com/angular/angular-cli/commit/3f601a14e70540f37ef6c6559a5cd50bb6b453d7) | fix  | typo in allowedHosts warning for unsupported vite options                                           |
| [79c44adac](https://github.com/angular/angular-cli/commit/79c44adac4184408cbd1dc07989796f155cfc70e) | perf | avoid transforming empty component stylesheets                                                      |
| [cc3167f30](https://github.com/angular/angular-cli/commit/cc3167f3012aa621a7fc9277a9c8a82601f7d914) | perf | reduce build times for apps with a large number of components when utilizing esbuild-based builders |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.3.0"></a>

# 17.3.0 (2024-03-13)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                    |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| [5ab71fc92](https://github.com/angular/angular-cli/commit/5ab71fc92ba26f6255e5a5c00e374709ff58d19d) | feat | update CSS/Sass import/use specifiers in application migration |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| [9ca3a5450](https://github.com/angular/angular-cli/commit/9ca3a54503574674eb107d4d2b507be7ecd727ee) | feat | add `deployUrl` to application builder                                    |
| [3821344da](https://github.com/angular/angular-cli/commit/3821344da663ded52b773752abc805ed04e28f3c) | fix  | ensure proper display of build logs in the presence of warnings or errors |
| [de2d05049](https://github.com/angular/angular-cli/commit/de2d050498e16efa75459f526b9973c9e1d67050) | fix  | provide better error message when server option is required but missing   |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.2.3"></a>

# 17.2.3 (2024-03-06)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| [7cc8261fd](https://github.com/angular/angular-cli/commit/7cc8261fd2eb0ef1665faebec43cba447a64fd33) | fix  | avoid implicit CSS file extensions when resolving                      |
| [259ec72d5](https://github.com/angular/angular-cli/commit/259ec72d521b3a660c54ec33aaf8bf7c838281e7) | fix  | avoid marking component styles as media with no output media directory |
| [faffdfdce](https://github.com/angular/angular-cli/commit/faffdfdcebb3f71f7ef64b02114561985c592add) | fix  | disable `deployUrl` when using vite dev-server                         |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.2.2"></a>

# 17.2.2 (2024-02-28)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| [3394d3cf1](https://github.com/angular/angular-cli/commit/3394d3cf10996a93777edfb28d83cf4eb85ae40b) | fix  | ensure all related stylesheets are rebuilt when an import changes |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.2.1"></a>

# 17.2.1 (2024-02-22)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------ |
| [9e7c47b59](https://github.com/angular/angular-cli/commit/9e7c47b5945b368a6fd5e2544674d5a3afd63d65) | fix  | allow `mts` and `cts` file replacement           |
| [f2a2e9287](https://github.com/angular/angular-cli/commit/f2a2e92877298a30bc1042772be043d5db9ac729) | fix  | provide Vite client code source map when loading |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.2.0"></a>

# 17.2.0 (2024-02-14)

### @angular/cli

| Commit                                                                                              | Type | Description                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------ |
| [b3e206741](https://github.com/angular/angular-cli/commit/b3e206741c5b59b8563b7c60a1f66c49802549e7) | feat | add support to `bun` package manager |

### @schematics/angular

| Commit                                                                                              | Type | Description                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------ |
| [03e1aa790](https://github.com/angular/angular-cli/commit/03e1aa7904acfe9d12eaf3717d1b136159893a76) | feat | add support to `bun` package manager |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| [7f57123fd](https://github.com/angular/angular-cli/commit/7f57123fd40b345d7880cb9e2eccd4757c0fb6ee) | feat | add define build option to application builder                                       |
| [f4f535653](https://github.com/angular/angular-cli/commit/f4f535653a34c2a7c37c51c98680b6b1766c6d0d) | feat | add JSON build logs when using the application builder                               |
| [b59f663e5](https://github.com/angular/angular-cli/commit/b59f663e5715e009b05bf560637c1bca3b112784) | feat | allow control of Vite-based development server prebundling                           |
| [8f47f1e96](https://github.com/angular/angular-cli/commit/8f47f1e965b25f3d976eda701ae2e7b7e8cccfa3) | feat | provide default and abbreviated build target support for dev-server and extract-i18n |
| [7a12074dc](https://github.com/angular/angular-cli/commit/7a12074dc940f1aa8f5347071324fa0d2fd1300b) | feat | provide option to allow automatically cleaning the terminal screen during rebuilds   |
| [7c522aa87](https://github.com/angular/angular-cli/commit/7c522aa8742cd936bb0dfd30773d88f3ef92d488) | feat | support using custom postcss configuration with application builder                  |
| [476a68daa](https://github.com/angular/angular-cli/commit/476a68daa9746d29d3f74f68307d982d1d66f94c) | fix  | add output location in build stats                                                   |
| [5e6f1a9f4](https://github.com/angular/angular-cli/commit/5e6f1a9f4362e9b12db64c7c2e609a346b17963d) | fix  | avoid preloading server chunks                                                       |
| [41ea985f9](https://github.com/angular/angular-cli/commit/41ea985f9317b11cfa6627a2d3f6b34ff4dbc134) | fix  | display server bundles in build stats                                                |
| [d493609d3](https://github.com/angular/angular-cli/commit/d493609d30e1f148a7efb72bd64227521a326fbb) | fix  | downgrade copy-webpack-plugin to workaround Node.js support issue                    |
| [8d5af1d5c](https://github.com/angular/angular-cli/commit/8d5af1d5c78ce9aa996f6ba138b99d0bb5005d46) | fix  | ensure correct `.html` served with Vite dev-server                                   |
| [944cbcdb1](https://github.com/angular/angular-cli/commit/944cbcdb1af62855febc931fce92debf28a3b2a5) | fix  | limit the number of lazy chunks visible in the stats table                           |
| [905e13633](https://github.com/angular/angular-cli/commit/905e13633071b1db25621ae9f2762a48fe010df1) | fix  | support string as plugin option in custom postcss plugin config                      |

### @angular-devkit/schematics

| Commit                                                                                              | Type | Description                         |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------- |
| [da1c38c48](https://github.com/angular/angular-cli/commit/da1c38c486b07d5a1b2933f23f83c6231b512e0f) | fix  | add `bun` to known package managers |

### @angular/create

| Commit                                                                                              | Type | Description                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------ |
| [600498f2c](https://github.com/angular/angular-cli/commit/600498f2cd3e3251e7e6e3dd3505c5e943b2986a) | feat | add support to `bun` package manager |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.1.4"></a>

# 17.1.4 (2024-02-14)

### @angular/cli

| Commit                                                                                              | Type | Description                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------- |
| [6d2168db9](https://github.com/angular/angular-cli/commit/6d2168db92fcba1ebf82498fed85cd2b596547d3) | fix  | prevent BOM errors in `package.json` during `ng update` |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------ |
| [bf42d6df2](https://github.com/angular/angular-cli/commit/bf42d6df2f5eda45bec80bb60315152c03f4a3dc) | fix  | bypass Vite prebundling for absolute URL imports |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.1.3"></a>

# 17.1.3 (2024-02-08)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [3de3aa170](https://github.com/angular/angular-cli/commit/3de3aa170f02352fe2adf61beea221b356a40843) | fix  | allow `./` baseHref when using vite based server   |
| [17f47a3c9](https://github.com/angular/angular-cli/commit/17f47a3c94b434a73b9fc698872ef6230f61c781) | fix  | ensure WebWorker main entry is used in output code |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.1.2"></a>

# 17.1.2 (2024-01-31)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------- |
| [6815f13e3](https://github.com/angular/angular-cli/commit/6815f13e3c87eff773aa914858293c75e4fae7d2) | fix  | add `required` modules as externals imports                      |
| [a0e306098](https://github.com/angular/angular-cli/commit/a0e306098147cf5fb7b51264c18860767fdf6316) | fix  | correctly handle glob negation in proxy config when using vite   |
| [235c8403a](https://github.com/angular/angular-cli/commit/235c8403a5bf8a2032da72a504e8cee441dd2d82) | fix  | handle regular expressions in proxy config when using Vite       |
| [5332e5b2e](https://github.com/angular/angular-cli/commit/5332e5b2ea0c9757f717e386fb162392ef2327a4) | fix  | resolve absolute `output-path` when using esbuild based builders |
| [3deb0d4a1](https://github.com/angular/angular-cli/commit/3deb0d4a102fb8d8fae7617b81f62706371e03f5) | fix  | return 404 for assets that are not found                         |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.1.1"></a>

# 17.1.1 (2024-01-24)

### @angular/cli

| Commit                                                                                              | Type | Description                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------- |
| [8ebb754c2](https://github.com/angular/angular-cli/commit/8ebb754c2e865ffd2c38f61d50a5f4be225a0fe5) | fix  | update regex to validate the project-name |

### @schematics/angular

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [35ebf1efd](https://github.com/angular/angular-cli/commit/35ebf1efdfa438ea713020b847826621bba0ebfc) | fix  | retain trailing comma when adding providers to app config |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| [88de1da92](https://github.com/angular/angular-cli/commit/88de1da92919834f620a31d8a3e6a4e2ad1e2f07) | fix  | `ENOENT: no such file or directory` on Windows during component rebuild       |
| [4e2586aeb](https://github.com/angular/angular-cli/commit/4e2586aeb8ec11cf951f30bbfca6422f13cfd5cc) | fix  | allow package file loader option with Vite prebundling                        |
| [aca1cfcda](https://github.com/angular/angular-cli/commit/aca1cfcda520d9a68bc01833453c81f38c133d37) | fix  | do not add internal CSS resources files in watch                              |
| [53258f617](https://github.com/angular/angular-cli/commit/53258f617cf6c9068e069122029ff91c62d2109e) | fix  | handle load event for multiple stylesheets and CSP nonces                     |
| [412fe6ec6](https://github.com/angular/angular-cli/commit/412fe6ec69bfcbb1e9fb09ccbb10a086b5166689) | fix  | pre-transform error when using vite with SSR                                  |
| [45dea6f44](https://github.com/angular/angular-cli/commit/45dea6f44cb27431e4767ce16df3e84c5b6d8f9c) | fix  | provide actionable error message when server bundle is missing default export |
| [4e2b23f03](https://github.com/angular/angular-cli/commit/4e2b23f0321f3ec6edfd3e20e9bf95d799de5e7f) | fix  | update dependency vite to v5.0.12                                             |

### @angular/ssr

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [02d9d84c5](https://github.com/angular/angular-cli/commit/02d9d84c5da3def7e6b307b115e77233cfcf8d4b) | fix  | handle load event for multiple stylesheets and CSP nonces |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.12"></a>

# 16.2.12 (2024-01-24)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                      |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------- |
| [5fad40162](https://github.com/angular/angular-cli/commit/5fad401628f7ddbc412d7e761a4300724f078bde) | fix  | update dependency vite to v4.5.2 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.1.0"></a>

# 17.1.0 (2024-01-17)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------- |
| [b513d89b7](https://github.com/angular/angular-cli/commit/b513d89b77dd50891a5f02ec59d1a2bffa0d36db) | feat | add optional migration to use application builder                                     |
| [a708dccff](https://github.com/angular/angular-cli/commit/a708dccff34f62b625332555005bbd8f41380ec2) | feat | update SSR and application builder migration schematics to work with new `outputPath` |
| [4469e481f](https://github.com/angular/angular-cli/commit/4469e481fc4f74574fdd028513b57ba2300c3b34) | fix  | do not trigger NPM install when using `---skip-install` and `--ssr`                   |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------- |
| [e0b274b8f](https://github.com/angular/angular-cli/commit/e0b274b8ff4d164061ca7b60248bb85ceee8f65d) | feat | add option to retain CSS special comments in global styles                      |
| [204794c4f](https://github.com/angular/angular-cli/commit/204794c4f8e87882af974144fff642762930b4d3) | feat | add support for `--no-browsers` in karma builder                                |
| [4784155bd](https://github.com/angular/angular-cli/commit/4784155bd62cfac9b29327167093e70c9c6bee41) | feat | add wildcard option for `allowedCommonJsDependencies`                           |
| [3b93df42d](https://github.com/angular/angular-cli/commit/3b93df42daf9eda9215ea65d8ed0efd1ef203a09) | feat | allow configuring loaders for custom file extensions in application builder     |
| [cc246d50e](https://github.com/angular/angular-cli/commit/cc246d50ea8d92289c8be8dc58b376358a899ad6) | feat | allow customization of output locations                                         |
| [15a669c1e](https://github.com/angular/angular-cli/commit/15a669c1efdc8ac18507232d6cb29794c82b94cc) | feat | allowing control of index HTML initial preload generation                       |
| [47a064b14](https://github.com/angular/angular-cli/commit/47a064b146d06ee7498e3aacb2f17a6283be4504) | feat | emit external sourcemaps for component styles                                   |
| [68dae539a](https://github.com/angular/angular-cli/commit/68dae539adfa12d6088f96ac5c9f224d9bb52e17) | feat | initial experimental implementation of `@web/test-runner` builder               |
| [f6e67df1c](https://github.com/angular/angular-cli/commit/f6e67df1c4f286fb1fe195b75cdaab4339ad7604) | feat | inline Google and Adobe fonts located in stylesheets                            |
| [364a16b7a](https://github.com/angular/angular-cli/commit/364a16b7a6d903cb176f7db627fec126b8aa05f9) | feat | move `browser-sync` as optional dependency                                      |
| [ccba849e4](https://github.com/angular/angular-cli/commit/ccba849e48287805bd8253a03f88d5f44b2b23ae) | feat | support keyboard command shortcuts in application dev server                    |
| [329d80075](https://github.com/angular/angular-cli/commit/329d80075bc788de0c8e757fbd8cd69120fbec99) | fix  | alllow `OPTIONS` requests to be proxied when using `vite`                       |
| [49ed9a26c](https://github.com/angular/angular-cli/commit/49ed9a26cb87ae629d7d4167277f7e5c4ee066f7) | fix  | emit error when using prerender and app-shell builders with application builder |
| [6473b0160](https://github.com/angular/angular-cli/commit/6473b01603b55d265489840cbf32697ad663aeeb) | fix  | ensure all configured assets can be served by dev server                        |
| [874e576b5](https://github.com/angular/angular-cli/commit/874e576b523ba675f85011388e4ce3fcc38992fa) | fix  | filter explicit external dependencies for Vite prebundling                      |
| [2a02b1320](https://github.com/angular/angular-cli/commit/2a02b1320449e0562041bbba86e42048665402e5) | fix  | fix normalization of the application builder extensions                         |
| [9906ab7b4](https://github.com/angular/angular-cli/commit/9906ab7b4714e1fca040f875dd91f0279f688abe) | fix  | normalize asset source locations in Vite-based development server               |
| [ceffafe1a](https://github.com/angular/angular-cli/commit/ceffafe1a3c8cad469b718e466e771e1d396ab14) | fix  | provide better error messages for failed file reads                             |
| [6d7fdb952](https://github.com/angular/angular-cli/commit/6d7fdb952d49dda1301af229af138d834161c2f9) | fix  | show diagnostic messages after build stats                                      |
| [4e1f0e44d](https://github.com/angular/angular-cli/commit/4e1f0e44dca106fa299b5dd0e4145c2c3a99ab4f) | fix  | the request url "..." is outside of Vite serving allow list for all assets      |
| [bd26a18e7](https://github.com/angular/angular-cli/commit/bd26a18e7a9512bdad15784a19f42aaca8aec303) | fix  | typo in preloadInitial option description                                       |
| [125fb779f](https://github.com/angular/angular-cli/commit/125fb779ff394f388c2d027c1dda4a33bd8caa62) | perf | reduce TypeScript JSDoc parsing in application builder                          |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.0.10"></a>

# 17.0.10 (2024-01-10)

### @angular/cli

| Commit                                                                                              | Type | Description                                  |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------- |
| [ed1e130da](https://github.com/angular/angular-cli/commit/ed1e130dad7f9b6629f7bd31f8f0590814d0eb57) | fix  | retain existing EOL when updating JSON files |

### @schematics/angular

| Commit                                                                                              | Type | Description                                  |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------- |
| [09c32c678](https://github.com/angular/angular-cli/commit/09c32c678221746458db50f1c2f7eb92264abb16) | fix  | retain existing EOL when adding imports      |
| [a5c339eaa](https://github.com/angular/angular-cli/commit/a5c339eaa73eb73e2b13558a363e058500a2cfba) | fix  | retain existing EOL when updating JSON files |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [3dc4db7d7](https://github.com/angular/angular-cli/commit/3dc4db7d78649eef99a2e60b1faec8844815f8e4) | fix  | retain existing EOL when updating workspace config |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.0.9"></a>

# 17.0.9 (2024-01-03)

### @angular/cli

| Commit                                                                                              | Type | Description                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| [446dfb76a](https://github.com/angular/angular-cli/commit/446dfb76a5e2a53542fae93b4400133bf7d9552e) | fix  | add prerender and ssr-dev-server schemas in angular.json schema |

### @angular-devkit/schematics

| Commit                                                                                              | Type | Description                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| [88d6ca4a5](https://github.com/angular/angular-cli/commit/88d6ca4a545c2d3e35822923f2aae03f43b2e3e3) | fix  | replace template line endings with platform specific |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.0.8"></a>

# 17.0.8 (2023-12-21)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------- |
| [6dba26a0b](https://github.com/angular/angular-cli/commit/6dba26a0b33ee867923c4505decd86f183e0e098) | fix  | `ng e2e` and `ng lint` prompt requires to hit Enter twice to proceed on Windows |
| [0b48acc4e](https://github.com/angular/angular-cli/commit/0b48acc4eaa15460175368fdc86e3dd8484ed18b) | fix  | re-add `-d` alias for `--dry-run`                                               |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                           |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| [99b026ede](https://github.com/angular/angular-cli/commit/99b026edece990e7f420718fd4967e21db838453) | fix  | add missing property "buildTarget" to interface "ServeBuilderOptions" |
| [313004311](https://github.com/angular/angular-cli/commit/3130043114d3321b1304f99a4209d9da14055673) | fix  | do not generate standalone component when using `ng generate module`  |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [cf11cdf6c](https://github.com/angular/angular-cli/commit/cf11cdf6ce7569e2da5fa3bc76e20d19c719ce4c) | fix  | add missing tailwind `@screen` directive in matcher          |
| [aa6c757d7](https://github.com/angular/angular-cli/commit/aa6c757d701b7f95896c8f1643968ee030b179af) | fix  | construct SSR request URL using server resolvedUrls          |
| [0662048d4](https://github.com/angular/angular-cli/commit/0662048d4abbcdc36ff74d647bb7d3056dff42a8) | fix  | ensure empty optimized Sass stylesheets stay empty           |
| [d1923a66d](https://github.com/angular/angular-cli/commit/d1923a66d9d2ab39831ac4cd012fa0d2df66124b) | fix  | ensure external dependencies are used by Web Worker bundling |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.11"></a>

# 16.2.11 (2023-12-21)

### @angular-devkit/build-angular

| Commit                                                                                              | Type  | Description                      |
| --------------------------------------------------------------------------------------------------- | ----- | -------------------------------- |
| [e0e011fc4](https://github.com/angular/angular-cli/commit/e0e011fc47f2383f9be0b432066c1438ddab7103) | build | update dependency vite to v4.5.1 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.0.7"></a>

# 17.0.7 (2023-12-13)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------ |
| [3df3e583c](https://github.com/angular/angular-cli/commit/3df3e583c8788511598bbe406012196a2882ee49) | fix  | `baseHref` with trailing slash causes server not to be accessible without trailing slash         |
| [ef1178188](https://github.com/angular/angular-cli/commit/ef1178188a145a1277197a33a304910e1024c365) | fix  | allow vite to serve JavaScript and TypeScript assets                                             |
| [385eb77d2](https://github.com/angular/angular-cli/commit/385eb77d2645a1407dbc7528e90a506f9bb2952f) | fix  | cache loading of component resources in JIT mode                                                 |
| [4b3af73ac](https://github.com/angular/angular-cli/commit/4b3af73ac934a24dd2b022604bc01f00389d87a1) | fix  | ensure browser-esbuild is used in dev server with browser builder and forceEsbuild               |
| [d1b27e53e](https://github.com/angular/angular-cli/commit/d1b27e53ed9e23a0c08c13c22fc0b4c00f3998b2) | fix  | ensure port 0 uses random port with Vite development server                                      |
| [f2f7d7c70](https://github.com/angular/angular-cli/commit/f2f7d7c7073e5564ddd8a196b6fcaab7db55b110) | fix  | file is missing from the TypeScript compilation with JIT                                         |
| [7b8d6cddd](https://github.com/angular/angular-cli/commit/7b8d6cddd0daa637a5fecdea627f4154fafe23fa) | fix  | handle updates of an `npm link` library from another workspace when `preserveSymlinks` is `true` |
| [c08c78cb8](https://github.com/angular/angular-cli/commit/c08c78cb8965a52887f697e12633391908a3b434) | fix  | inlining of fonts results in jagged fonts for Windows users                                      |
| [930024811](https://github.com/angular/angular-cli/commit/9300248114282a2a425b722482fdf9676b000b94) | fix  | retain symlinks to output platform directories on builds                                         |
| [3623fe911](https://github.com/angular/angular-cli/commit/3623fe9118be14eedd1a04351df5e15b3d7a289a) | fix  | update ESM loader to work with Node.js 18.19.0                                                   |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.0.6"></a>

# 17.0.6 (2023-12-06)

### @schematics/angular

| Commit                                                                                              | Type | Description                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------- |
| [da5d39471](https://github.com/angular/angular-cli/commit/da5d39471751cd92f6c21936aefc1f7157b4973b) | fix  | enable TypeScript `skipLibCheck` in new workspace |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| [048512874](https://github.com/angular/angular-cli/commit/048512874bf9cc022cc9a8ab70f35fc60d9982f5) | fix  | app-shell generation incorrect content when using the application builder |
| [f9e982c44](https://github.com/angular/angular-cli/commit/f9e982c4458fc022d34039b9c082471c7ce29c07) | fix  | check namespaced Sass variables when rebasing URLs                        |
| [a1e8ffa9d](https://github.com/angular/angular-cli/commit/a1e8ffa9df3a8eb6af2a8851385ed8927e3c0c64) | fix  | correctly align error/warning messages when spinner is active             |
| [46d88a034](https://github.com/angular/angular-cli/commit/46d88a034343dc93dd0c467afc08c824da427fef) | fix  | handle watch updates on Mac OSX when using native FSEvents API            |
| [4594407ae](https://github.com/angular/angular-cli/commit/4594407ae214ce49985a5df315cae3ac8107147d) | fix  | improve file watching on Windows when using certain IDEs                  |
| [aa9e7c615](https://github.com/angular/angular-cli/commit/aa9e7c615529cb9dd6dccd862674cadac0372f08) | fix  | normalize locale tags with Intl API when resolving in application builder |
| [a8dbf1da2](https://github.com/angular/angular-cli/commit/a8dbf1da27faf772a4df382b1301e95c32d1ba89) | fix  | watch symlink when using `preserveSymlinks` option                        |
| [e3820cb6c](https://github.com/angular/angular-cli/commit/e3820cb6c7cf131d890882f9e94b8f23c4cbb6a3) | perf | only enable advanced optimizations with script optimizations              |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.0.5"></a>

# 17.0.5 (2023-11-29)

Rolling back [bbbe13d67](https://github.com/angular/angular-cli/commit/bbbe13d6782ba9d1b80473a98ea95bc301c48597) which appears to break file watching on Mac devices.

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.0.4"></a>

# 17.0.4 (2023-11-29)

### @schematics/angular

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [7a2823080](https://github.com/angular/angular-cli/commit/7a2823080c61df3515d85f7aa35ee83f57e80e2d) | fix  | remove CommonModule import from standalone components |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------- |
| [0634a4e40](https://github.com/angular/angular-cli/commit/0634a4e40f1b2e4c0a076814f3e1b242ccf1a588) | fix  | avoid native realpath in application builder                            |
| [22880d9cb](https://github.com/angular/angular-cli/commit/22880d9cbf70fffb6cc685b3a9ad82ca741a56fe) | fix  | correct set locale when using esbuild based builders                    |
| [a0680672f](https://github.com/angular/angular-cli/commit/a0680672fd369dc6fba2433441d086e53bebb0a2) | fix  | correctly watch files when app is in a directory that starts with a dot |
| [bbbe13d67](https://github.com/angular/angular-cli/commit/bbbe13d6782ba9d1b80473a98ea95bc301c48597) | fix  | improve file watching on Windows when using certain IDEs                |
| [27e7c2e1b](https://github.com/angular/angular-cli/commit/27e7c2e1b4f514843c2c505b7fe1b3cef126a101) | fix  | propagate localize errors to full build result                          |
| [7455fdca0](https://github.com/angular/angular-cli/commit/7455fdca01bd4af00248bb1769945dc088c59063) | fix  | serve assets from the provided `serve-path`                             |
| [657a07bd6](https://github.com/angular/angular-cli/commit/657a07bd6ba138a209c2a1540ea4d200c60e0f66) | fix  | treeshake unused class that use custom decorators                       |
| [77474951b](https://github.com/angular/angular-cli/commit/77474951b59605a2c36a8bd890376f9e28131ee4) | fix  | use workspace real path when not preserving symlinks                    |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.0.3"></a>

# 17.0.3 (2023-11-21)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| [450dd29a1](https://github.com/angular/angular-cli/commit/450dd29a13da9930fede96732b29c9c04e1c0cf5) | fix  | default to watching project root on Windows with application builder |
| [8072b8574](https://github.com/angular/angular-cli/commit/8072b8574a84a97277e8c83ebbbdde076b79a910) | fix  | ensure service worker hashes index HTML file for application builder |
| [d99870740](https://github.com/angular/angular-cli/commit/d998707406c7a191a191f71d07a9491481c8ad56) | perf | only create one instance of postcss when needed                      |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.0.2"></a>

# 17.0.2 (2023-11-20)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------- |
| [023645185](https://github.com/angular/angular-cli/commit/02364518571a2b73be945a0036bbfa39e336330c) | fix  | always normalize AOT file reference tracker paths                                   |
| [3b99980bd](https://github.com/angular/angular-cli/commit/3b99980bd02c875a37d1603ae7468558fe7ef4c3) | fix  | emit root files when `localize` is enabled when using the esbuild based builders    |
| [ef3e3abb8](https://github.com/angular/angular-cli/commit/ef3e3abb8e29a9274e9d1f5fc5c18f01de6fd76f) | fix  | ensure watch file paths from TypeScript are normalized                              |
| [d11b36fe2](https://github.com/angular/angular-cli/commit/d11b36fe207d8a38cb4a1001667c63ecd17aba0c) | fix  | normalize paths in ssr sourcemaps to posix when using vite                          |
| [62d51383a](https://github.com/angular/angular-cli/commit/62d51383acfd8cdeedf07b34c2d78f505ff2e3a8) | fix  | only include vendor sourcemaps when using the dev-server when the option is enabled |
| [d28ba8a73](https://github.com/angular/angular-cli/commit/d28ba8a7311ea3345b112a47d6f1e617fb691643) | fix  | remove browser-esbuild usage warning                                                |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.0.1"></a>

# 17.0.1 (2023-11-15)

### @angular/cli

| Commit                                                                                              | Type | Description                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------- |
| [5267e6055](https://github.com/angular/angular-cli/commit/5267e605567aba798ee00322f14e3a48eae68b48) | fix  | handle packages with no version |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------- |
| [d9f7d439e](https://github.com/angular/angular-cli/commit/d9f7d439eba879f8fffaacd258d832c407dfd90f) | fix  | add helper script to spawn SSR server from `dist`                   |
| [a80926cdb](https://github.com/angular/angular-cli/commit/a80926cdb6b4d99a65549fcfba2ab094a5835480) | fix  | html indentation                                                    |
| [f7f62c9d6](https://github.com/angular/angular-cli/commit/f7f62c9d6988e6801981592f56137cd02bfe2316) | fix  | remove `downlevelIteration` from `tsconfig.json` for new workspaces |
| [7cb57317d](https://github.com/angular/angular-cli/commit/7cb57317d2b78e9a1f947c9f11175a7d381275fc) | fix  | use href property binding for links                                 |
| [731917cd0](https://github.com/angular/angular-cli/commit/731917cd00b366bbec4f184ee9064b307eba59ce) | fix  | use styleUrl                                                        |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| [15dd71aba](https://github.com/angular/angular-cli/commit/15dd71abac77ec5e1c092bebb86edffa3999937a) | fix  | `deleteOutputPath` when using `esbuild-builder`                           |
| [fa4d8ff31](https://github.com/angular/angular-cli/commit/fa4d8ff31ef64738e45078c0e7be471591361442) | fix  | add actionable error when file replacement is missing                     |
| [160a91160](https://github.com/angular/angular-cli/commit/160a91160ff3677d9e2d3d413ae360c4e1957c53) | fix  | add support for vendor sourcemaps when using the dev-server               |
| [5623c193e](https://github.com/angular/angular-cli/commit/5623c193e4cccbf6783f7e3faaf0a6c2fb086b34) | fix  | cache stylesheet load errors with application builder                     |
| [1a5538e0c](https://github.com/angular/angular-cli/commit/1a5538e0c9cc121fa1608eb99e941bc3a5f59ad6) | fix  | disable Worker wait loop for TS/NG parallel compilation in web containers |
| [883771946](https://github.com/angular/angular-cli/commit/883771946a36a42ebfe23d32b393513309b16c82) | fix  | do not process ssr entry-point when running `ng serve`                    |
| [d3b549167](https://github.com/angular/angular-cli/commit/d3b54916705e57f017597917d9aea1f71f2ba95a) | fix  | empty output directory instead of removing                                |
| [596f7639a](https://github.com/angular/angular-cli/commit/596f7639a6c7fe00c9088e32739578cc374a31e2) | fix  | ensure compilation errors propagate to all bundle actions                 |
| [d900a5217](https://github.com/angular/angular-cli/commit/d900a5217a75accf434a95ad90300ec5005a23a8) | fix  | maintain current watch files after build errors                           |
| [21549bdeb](https://github.com/angular/angular-cli/commit/21549bdeb97b23f7f37110d579513f3102dc60e8) | fix  | prerender default view when no routes are defined                         |
| [4c251647b](https://github.com/angular/angular-cli/commit/4c251647b8fdb3b128ca3252c83aaa71ecc48e88) | fix  | rewire sourcemap back to original source root                             |

<!-- CHANGELOG SPLIT MARKER -->

<a name="17.0.0"></a>

# 17.0.0 (2023-11-08)

## Breaking Changes

### @schematics/angular

- Routing is enabled by default for new applications when using `ng generate application` and `ng new`. The `--no-routing` command line option can be used to disable this behaviour.
- `ng g interceptor` now generate a functional interceptor by default. or guard by default. To generate a class-based interceptor the `--no-functional` command flag should be used.
- `rootModuleClassName`, `rootModuleFileName` and `main` options have been removed from the public `pwa` and `app-shell` schematics.
- App-shell and Universal schematics deprecated unused `appId` option has been removed.

### @angular-devkit/build-angular

- Node.js v16 support has been removed

  Node.js v16 is planned to be End-of-Life on 2023-09-11. Angular will stop supporting Node.js v16 in Angular v17.
  For Node.js release schedule details, please see: https://github.com/nodejs/release#release-schedule

### @angular-devkit/schematics

- deprecated `runExternalSchematicAsync` and `runSchematicAsync` methods have been removed in favor of `runExternalSchematic` and `runSchematic`.

## Deprecations

### @angular-devkit/build-angular

- The `browserTarget` in the dev-server and extract-i18n builders have been deprecated in favor of `buildTarget`.

### @angular/cli

| Commit                                                                                              | Type | Description                                                |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| [f4e7fa873](https://github.com/angular/angular-cli/commit/f4e7fa87350ea1162287114796e0e04e2af101c4) | fix  | add `@angular/ssr` as part of the ng update `packageGroup` |
| [1f7156b11](https://github.com/angular/angular-cli/commit/1f7156b112606410ab9ea1cd3f178a762566b96b) | fix  | add Node.js 20 as supported version                        |
| [4b9a87c90](https://github.com/angular/angular-cli/commit/4b9a87c90469481dc3dd0da4d1506521b4203255) | fix  | ignore peer mismatch when updating @nguniversal/builders   |
| [f66f9cf61](https://github.com/angular/angular-cli/commit/f66f9cf612bed49b961f1f8a8e4deef05fd5ef40) | fix  | remove Node.js 16 from supported checks                    |

### @schematics/angular

| Commit                                                                                              | Type     | Description                                                          |
| --------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| [741cca73c](https://github.com/angular/angular-cli/commit/741cca73c129ff05e7229081d50762a054c09a8d) | feat     | add `ng new --ssr`                                                   |
| [3938863b9](https://github.com/angular/angular-cli/commit/3938863b9900fcfe574b3112d73a8f34672f38bd) | feat     | add migration to migrate from `@nguniversal` to `@angular/ssr`       |
| [dc6b6eaf6](https://github.com/angular/angular-cli/commit/dc6b6eaf6f8af0d2b3f31cea77dc9a63ff845e3c) | feat     | add migration to replace usages of `@nguniversal/builders`           |
| [6979eba3c](https://github.com/angular/angular-cli/commit/6979eba3c9d46fd5fc2622d28636c48dbcbbe1c6) | feat     | enable hydration when adding SSR, SSG or AppShell                    |
| [1a6a139aa](https://github.com/angular/angular-cli/commit/1a6a139aaf8d5a6947b399bbbd48bbfd9e52372c) | feat     | enable routing by default for new applications                       |
| [ac0db6697](https://github.com/angular/angular-cli/commit/ac0db6697593196692e5b87e1e724be6de0ef0a0) | feat     | enable standalone by default in new applications                     |
| [a189962a5](https://github.com/angular/angular-cli/commit/a189962a515051fd77e20bf8dd1815086a0d12ef) | feat     | generate functional interceptors by default                          |
| [ae45c4ab8](https://github.com/angular/angular-cli/commit/ae45c4ab8103ba8ebc2686e71dbf7d0394b1ee92) | feat     | update `ng new` generated application                                |
| [3f8aa9d8c](https://github.com/angular/angular-cli/commit/3f8aa9d8c7dc7eff06516c04ba08764bb044cb6b) | feat     | update` ng new` to use the esbuild application builder based builder |
| [03a1eaf01](https://github.com/angular/angular-cli/commit/03a1eaf01c009d814cb476d2db53b2d0a4d58bcd) | fix      | account for new block syntax in starter template                     |
| [eb0fc7434](https://github.com/angular/angular-cli/commit/eb0fc7434539d3f5a7ea3f3c4e540ac920b10c19) | fix      | add missing express `REQUEST` and `RESPONSE` tokens                  |
| [ecdcff2db](https://github.com/angular/angular-cli/commit/ecdcff2db2b205443a585dd5dd118dbd50613883) | fix      | add missing icons in ng-new template                                 |
| [175944672](https://github.com/angular/angular-cli/commit/17594467218b788ebb27d8d16ffb0b555fcf71ee) | fix      | do not add unnecessary dependency on `@angular/ssr` during migration |
| [23c4c5e42](https://github.com/angular/angular-cli/commit/23c4c5e4293ef770d555b8b2bd449ad32d1537d4) | fix      | enable TypeScript `esModuleInterop` by default for ESM compliance    |
| [d60a6e86a](https://github.com/angular/angular-cli/commit/d60a6e86a48f15b3ddf89943dad31ee267f67648) | fix      | noop workspace config migration when already executed                |
| [e516a4bdb](https://github.com/angular/angular-cli/commit/e516a4bdb7f6bb87f556e58557e57db6f7e65845) | fix      | pass `ssr` option to application schematics                          |
| [419b5c191](https://github.com/angular/angular-cli/commit/419b5c1917c45dc115b107479d5066b9193497fa) | fix      | remove `baseUrl` from `tsconfig.json`                                |
| [0368b23f2](https://github.com/angular/angular-cli/commit/0368b23f2e5d8ca9c6191a2db956dc6850daebfc) | fix      | use @types/node v18                                                  |
| [b15e82758](https://github.com/angular/angular-cli/commit/b15e827580d6d3159c49521eb9b5d2b6d8ca2502) | refactor | remove deprecated appId option                                       |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------- |
| [c48982dc1](https://github.com/angular/angular-cli/commit/c48982dc1d01d11be54ffb0b1469e3b0557f3920) | feat | add `buildTarget` option to dev-server and `extract-i18n` builders                                              |
| [1fb0350eb](https://github.com/angular/angular-cli/commit/1fb0350eb7370ef6f72acc4e20c4d0bee8bf0b29) | feat | add initial support for bundle budgets to esbuild builders                                                      |
| [8168ae2a8](https://github.com/angular/angular-cli/commit/8168ae2a892dd012707bd294ffd26d0a070c0b5d) | feat | apply global CSS updates without a live-reload when using `vite`                                                |
| [91019bde2](https://github.com/angular/angular-cli/commit/91019bde2af5fb9dff6426ba24098271d8ac4889) | feat | enable localize support for SSR with application builder                                                        |
| [3c0719bde](https://github.com/angular/angular-cli/commit/3c0719bde244c45d71881d35899e5ee6206c09ee) | feat | initial i18n extraction support for application builder                                                         |
| [8bce80b91](https://github.com/angular/angular-cli/commit/8bce80b91b953c391ef8e45fec7f887f8d8521aa) | feat | initial support for application Web Worker discovery with esbuild                                               |
| [49f07a84d](https://github.com/angular/angular-cli/commit/49f07a84d6f6120388d9fc48a2514d3398986e49) | feat | standardize application builder output structure                                                                |
| [c3a87a60e](https://github.com/angular/angular-cli/commit/c3a87a60e0d3cdcae9f4361c2cf21c7ea29bd7de) | feat | support basic web worker bundling with esbuild builders                                                         |
| [9e425308a](https://github.com/angular/angular-cli/commit/9e425308a0c146b685e452a106cbdf3e02bddd00) | feat | support component style budgets in esbuild builders                                                             |
| [771e036d5](https://github.com/angular/angular-cli/commit/771e036d5ce3d436736d3c8b261050d633b3ef29) | feat | support deploy URL option for `browser-esbuild` builder                                                         |
| [c5f3ec71f](https://github.com/angular/angular-cli/commit/c5f3ec71f536e7ebb1c8cd0d7523b42e58f9611a) | feat | support i18n inlining with esbuild-based builder                                                                |
| [fd62a9315](https://github.com/angular/angular-cli/commit/fd62a9315defb89b4bea996d256887a6ec7b4327) | feat | support i18n with service worker and app-shell with esbuild builders                                            |
| [5898f72a9](https://github.com/angular/angular-cli/commit/5898f72a97c29d38b9e8b8ca23255f9fbce501e5) | feat | support namedChunks option in application builder                                                               |
| [8f9a0d70c](https://github.com/angular/angular-cli/commit/8f9a0d70cdf692b19574410cebb4d029056263fc) | feat | support standalone apps route discovery during prerendering                                                     |
| [6b08efa6f](https://github.com/angular/angular-cli/commit/6b08efa6ffd988e08e3db471ffe3214a029de116) | fix  | account for arrow function IIFE                                                                                 |
| [2f299fc7b](https://github.com/angular/angular-cli/commit/2f299fc7b5f00056054a06574e65ae311cd3ce0c) | fix  | account for styles specified as string literals and styleUrl                                                    |
| [9994b2dde](https://github.com/angular/angular-cli/commit/9994b2dde801b2f74fb70152eb73225283da32a3) | fix  | add a maximum rendering timeout for SSR and SSG during development                                              |
| [da4e19145](https://github.com/angular/angular-cli/commit/da4e19145b341dccdd5174cc7bc821e5025514b1) | fix  | address a path concatenation on Windows                                                                         |
| [9d4d11cc4](https://github.com/angular/angular-cli/commit/9d4d11cc43f2ae149ee8bfcf28285a1f62594ef7) | fix  | allow SSR compilation to work with TS allowJs option                                                            |
| [e3c5b91e8](https://github.com/angular/angular-cli/commit/e3c5b91e8a09c8a7dd940655087b69a8949cb2cc) | fix  | automatically include known packages in vite prebundling                                                        |
| [ca38ee34c](https://github.com/angular/angular-cli/commit/ca38ee34c6267e32b8ee74db815f929896f1baba) | fix  | avoid binary content in architect results with browser-esbuild                                                  |
| [657f78292](https://github.com/angular/angular-cli/commit/657f78292b4c78db5a43a172087a078820812323) | fix  | avoid dev server update analysis when build fails with vite                                                     |
| [2c33f09db](https://github.com/angular/angular-cli/commit/2c33f09db0561f344a26dd4f4304a9098e0ee13f) | fix  | avoid dev-server proxy rewrite normalization when invalid value                                                 |
| [b182be8aa](https://github.com/angular/angular-cli/commit/b182be8aa7ff5fd3cddc0bcac5f4e45e9ed9cf2e) | fix  | avoid in-memory prerendering ESM loader errors                                                                  |
| [0c982b993](https://github.com/angular/angular-cli/commit/0c982b993b69f4a4b52002cc65ad7ba3b0b9d591) | fix  | avoid repeat error clear in vite development server                                                             |
| [e41e2015b](https://github.com/angular/angular-cli/commit/e41e2015bfc37672fb67014ae38f31b63f0bb256) | fix  | avoid spawning workers when there are no routes to prerender                                                    |
| [2d2e79921](https://github.com/angular/angular-cli/commit/2d2e79921a72c4fafad673abe501ba10400403d2) | fix  | clean up internal Angular state during rendering SSR                                                            |
| [83020fc32](https://github.com/angular/angular-cli/commit/83020fc3291715802c28c5f7dcf7a261bc7f32cd) | fix  | clear diagnostic cache when external templates change with esbuild builders                                     |
| [c12f98f94](https://github.com/angular/angular-cli/commit/c12f98f948b1c10594f9d00f4ebf87630fe3cc47) | fix  | conditionally enable deprecated Less stylesheet JavaScript support                                              |
| [e10f49efa](https://github.com/angular/angular-cli/commit/e10f49efa8ac96e72bbc441423a730fd172c9f1d) | fix  | convert AOT compiler exceptions into diagnostics                                                                |
| [667f43af6](https://github.com/angular/angular-cli/commit/667f43af6d91025424147f6e9ac94800f463da1d) | fix  | correctly resolve polyfills when `baseUrl` URL is not set to root                                               |
| [d46fb128a](https://github.com/angular/angular-cli/commit/d46fb128a51f172da72ab403ec97213099f43de8) | fix  | disable dependency optimization for SSR                                                                         |
| [1b384308c](https://github.com/angular/angular-cli/commit/1b384308c65ff67b8eac7f3b6407e19ce3db46fa) | fix  | disable parallel TS/NG compilation inside WebContainers                                                         |
| [070da72c4](https://github.com/angular/angular-cli/commit/070da72c481b881538d6f5ff39955a3da7eb5126) | fix  | do not perform advanced optimizations on `@angular/common/locales/global`                                       |
| [508c7606e](https://github.com/angular/angular-cli/commit/508c7606ea2fa8e84d5243992abb59db1b75af49) | fix  | do not print `Angular is running in development mode.` in the server console when running prerender in dev mode |
| [e817656f6](https://github.com/angular/angular-cli/commit/e817656f601eaaf910271d5bb2c2230ddb8ed864) | fix  | do not print `Angular is running in development mode.` in the server console when running prerender in dev mode |
| [f806e3498](https://github.com/angular/angular-cli/commit/f806e3498b5a4fced7a515258fad30821f3e866c) | fix  | elide setClassDebugInfo calls                                                                                   |
| [188a00f3e](https://github.com/angular/angular-cli/commit/188a00f3e466c6c31c7671c63ffc91ccda4590c9) | fix  | elide setClassMetadataAsync calls                                                                               |
| [05ce9d697](https://github.com/angular/angular-cli/commit/05ce9d697a723dcac7a5d24a14f4d11f8686851a) | fix  | ensure all SSR chunks are resolved correctly with dev server                                                    |
| [d392d653c](https://github.com/angular/angular-cli/commit/d392d653cba67db28eddd003dfec6dcb9b192a95) | fix  | ensure correct web worker URL resolution in vite dev server                                                     |
| [1a6aa4378](https://github.com/angular/angular-cli/commit/1a6aa437887d2fc5d08c833efc0ca792f6157350) | fix  | ensure css url() prefix warnings support Sass rebasing                                                          |
| [52f595655](https://github.com/angular/angular-cli/commit/52f595655c69bb6a1398b030cf937b0d92d49864) | fix  | ensure i18n locale data is included in SSR application builds                                                   |
| [3ad028bb4](https://github.com/angular/angular-cli/commit/3ad028bb442a8978a4f45511cab9bb515764b930) | fix  | ensure localize polyfill and locale specifier are injected when not inlining                                    |
| [3e5a99c2c](https://github.com/angular/angular-cli/commit/3e5a99c2c438152a0b930864dcad660a6ea1590a) | fix  | ensure recalculation of component diagnostics when template changes                                             |
| [fa234a418](https://github.com/angular/angular-cli/commit/fa234a4186c9d408bfb52b3a649d307f93d0b9b3) | fix  | ensure secondary Angular compilations are unblocked on start errors                                             |
| [c0c7dad77](https://github.com/angular/angular-cli/commit/c0c7dad77dd59a387dbcc643a52ee1ed634727ab) | fix  | ensure that externalMetadata is defined                                                                         |
| [ac7caa426](https://github.com/angular/angular-cli/commit/ac7caa4264c7a68467903528deca4a6f579ee15c) | fix  | ensure unique internal identifiers for inline stylesheet bundling                                               |
| [1f73bcc49](https://github.com/angular/angular-cli/commit/1f73bcc49abd9f136a18dc6329e2f50a7565eb76) | fix  | ensure Web Worker code file is replaced in esbuild builders                                                     |
| [23a722b79](https://github.com/angular/angular-cli/commit/23a722b791a64bae32dc925160f2c3d1942955fc) | fix  | exclude node.js built-ins from vite dependency optimization                                                     |
| [fd2c4c324](https://github.com/angular/angular-cli/commit/fd2c4c324dcfedc81af41351b52ed4c8e41f48fc) | fix  | expose ssr-dev-server builder in the public api                                                                 |
| [9eb58cf7a](https://github.com/angular/angular-cli/commit/9eb58cf7a51c0b7950f80b474890fb2ebd685977) | fix  | fail build on non bundling error when using the esbuild based builders                                          |
| [a3e9efe80](https://github.com/angular/angular-cli/commit/a3e9efe80f6e77c8bf80f6a2d37f4488f780503b) | fix  | fully track Web Worker file changes in watch mode                                                               |
| [b9505ed09](https://github.com/angular/angular-cli/commit/b9505ed097d60eadae665d4664199e3d4989c864) | fix  | generate a file containing a list of prerendered routes                                                         |
| [192a2ae6b](https://github.com/angular/angular-cli/commit/192a2ae6bd8bdeab785f1ed8e60c5e4213801dd3) | fix  | handle HTTP requests to assets during prerendering                                                              |
| [19191e32b](https://github.com/angular/angular-cli/commit/19191e32bab9a2927b4feb5074e14165597fbf6d) | fix  | handle HTTP requests to assets during SSG in dev-server                                                         |
| [8981d8c35](https://github.com/angular/angular-cli/commit/8981d8c355ec9154fcdcdad3a66e1b789d1079b0) | fix  | improve sharing of TypeScript compilation state between various esbuild instances during rebuilds               |
| [5a3ae0159](https://github.com/angular/angular-cli/commit/5a3ae0159faa81558537012a0ceba07b5ad1b88b) | fix  | in vite skip SSR middleware for path with extensions                                                            |
| [f87f22d3f](https://github.com/angular/angular-cli/commit/f87f22d3f1436678ca1e07cc10874a012ae55e60) | fix  | keep dependencies pre-bundling validate between builds                                                          |
| [0da87bf1c](https://github.com/angular/angular-cli/commit/0da87bf1c94c6caf711204fcdd9a3973d766bd6e) | fix  | limit concurrent output file writes with application builder                                                    |
| [391ff78cb](https://github.com/angular/angular-cli/commit/391ff78cb0f29212c476ca36940b77839b84075e) | fix  | log number of prerendered routes in console                                                                     |
| [c46f312ad](https://github.com/angular/angular-cli/commit/c46f312adb06ae4a8293a07aa441514030052e93) | fix  | media files download files in vite                                                                              |
| [87425a791](https://github.com/angular/angular-cli/commit/87425a791fbdb44b3504e7e6d4b000b1df92c494) | fix  | normalize paths when invalidating stylesheet bundler                                                            |
| [d4f37da50](https://github.com/angular/angular-cli/commit/d4f37da50ce2890a2b86281e5a373beab349b630) | fix  | only show changed output files in watch mode with esbuild                                                       |
| [0d54f2d20](https://github.com/angular/angular-cli/commit/0d54f2d20bfd6d55615c0ab3537b5af0aeb008ee) | fix  | only watch used files with application builder                                                                  |
| [1f299ff2d](https://github.com/angular/angular-cli/commit/1f299ff2de3c80bf9cb3dc4b6a5ff02e81c1a94f) | fix  | prebundle dependencies for SSR when using Vite                                                                  |
| [58bd3971f](https://github.com/angular/angular-cli/commit/58bd3971fd2a95a5da1a87deddfe2416f3d636d6) | fix  | process nested tailwind usage in application builder                                                            |
| [60ca3c82d](https://github.com/angular/angular-cli/commit/60ca3c82d28d0168b2f608a44a701ad8ad658369) | fix  | provide server baseUrl result property in Vite-based dev server                                                 |
| [0c20cc4dc](https://github.com/angular/angular-cli/commit/0c20cc4dc5fe64221533d0a4cbe9d907881c85ae) | fix  | re-add TestBed compileComponents in schematics to support defer block testing                                   |
| [9453a2380](https://github.com/angular/angular-cli/commit/9453a23800f40a33b16fd887e3aa0817448134b1) | fix  | remove CJS usage warnings for inactionable packages                                                             |
| [5bf7022c4](https://github.com/angular/angular-cli/commit/5bf7022c4749f1298de61ef75e36769bbb8aba12) | fix  | remove support for Node.js v16                                                                                  |
| [c27ad719f](https://github.com/angular/angular-cli/commit/c27ad719f2cb1b13f76f8fce033087a9124e646d) | fix  | remove unactionable error overlay suggestion from Vite-based dev server                                         |
| [263271fae](https://github.com/angular/angular-cli/commit/263271fae3f664da9d396192152d22a9b6e3ef09) | fix  | resolve and load sourcemaps during prerendering to provide better stacktraces                                   |
| [651e3195f](https://github.com/angular/angular-cli/commit/651e3195ffe06394212c8d8d275289ac05ea5ef5) | fix  | resolve and load sourcemaps when using vite dev server with prerendering and ssr                                |
| [b78508fc8](https://github.com/angular/angular-cli/commit/b78508fc80bb9b2a3aec9830ad3ae9903d25927b) | fix  | several fixes to assets and files writes in browser-esbuild builder                                             |
| [c4c299bce](https://github.com/angular/angular-cli/commit/c4c299bce900b27556eaf2e06838a52f16990bb6) | fix  | silence xhr2 not ESM module warning                                                                             |
| [f7f6e97d0](https://github.com/angular/angular-cli/commit/f7f6e97d0f3540badb68813c39ce0237e4dcc9e3) | fix  | skip checking CommonJS module descendants                                                                       |
| [c11a0f0d3](https://github.com/angular/angular-cli/commit/c11a0f0d36f6cbffdf0464135510bda454efb08b) | fix  | support custom index option paths in Vite-based dev server                                                      |
| [6c3d7d1c1](https://github.com/angular/angular-cli/commit/6c3d7d1c10907d8d57b5f84f298b324d6f972226) | fix  | update `ssr` option definition                                                                                  |
| [4e89c3cae](https://github.com/angular/angular-cli/commit/4e89c3cae43870a10ef58de5ebdc094f5a06023e) | fix  | use a dash in bundle names                                                                                      |
| [83b4b2567](https://github.com/angular/angular-cli/commit/83b4b25678ba6b8082d580a2d75b0f02a9addc2a) | fix  | use browserslist when processing global scripts in application builder                                          |
| [ca4d1634f](https://github.com/angular/angular-cli/commit/ca4d1634f7fa2070f53f5978387ea68cc875c986) | fix  | use component style load result caching information for file watching                                           |
| [34947fc64](https://github.com/angular/angular-cli/commit/34947fc64953f845d33ffb1c52f236869a040c9d) | fix  | use incremental component style bundling only in watch mode                                                     |
| [ec160fe4e](https://github.com/angular/angular-cli/commit/ec160fe4e89cb89b93278cfac63877093dd19392) | fix  | warn if using partial mode with application builder                                                             |
| [559e89159](https://github.com/angular/angular-cli/commit/559e89159150a10728272081b7bbda80fe708093) | fix  | Windows Node.js 20 prerendering failure ([#26186](https://github.com/angular/angular-cli/pull/26186))           |
| [2cbec36c7](https://github.com/angular/angular-cli/commit/2cbec36c7286cdbbbd547433061421d7fe7762cc) | perf | cache polyfills virtual module result                                                                           |
| [e06e95f73](https://github.com/angular/angular-cli/commit/e06e95f73a35e2cc7cb00a44ce3633b4c99c8505) | perf | conditionally add Angular compiler plugin to polyfills bundling                                                 |
| [61f409cbe](https://github.com/angular/angular-cli/commit/61f409cbe4a7bf59711ef0cfa3b7365a8df3016d) | perf | disable ahead of time prerendering in vite dev-server                                                           |
| [01ab16c5d](https://github.com/angular/angular-cli/commit/01ab16c5d5678a135a5af5640ad2ba7c33a00452) | perf | fully avoid rebuild of component stylesheets when unchanged                                                     |
| [99d9037ee](https://github.com/angular/angular-cli/commit/99d9037eee2eabd7b5ec2d8f01146578ef6b5860) | perf | only perform a server build when either prerendering, app-shell or ssr is enabled                               |
| [c013a95e2](https://github.com/angular/angular-cli/commit/c013a95e2f38a5c2435b22c3338bf57b03c84ebf) | perf | only rebundle browser polyfills on explicit changes                                                             |
| [e68a662bc](https://github.com/angular/angular-cli/commit/e68a662bc0e636082e43b4f3c894585174366f4d) | perf | only rebundle global scripts/styles on explicit changes                                                         |
| [28d9ab88f](https://github.com/angular/angular-cli/commit/28d9ab88fe81898ec7591608816c77455c9a61bf) | perf | only rebundle server polyfills on explicit changes                                                              |
| [6d3942723](https://github.com/angular/angular-cli/commit/6d3942723d824382e52a8f06e03dcbc3d6d8eff6) | perf | optimize server or browser only dependencies once                                                               |
| [2e8e9d802](https://github.com/angular/angular-cli/commit/2e8e9d8020aa01107a3ee6b31942d9d53d6f73cd) | perf | patch `fetch` to load assets from memory                                                                        |
| [49fe74e24](https://github.com/angular/angular-cli/commit/49fe74e241d75456c65a7cd439b9eb8842e9d6d7) | perf | reduce CLI loading times by removing critters from critical path                                                |
| [07e2120da](https://github.com/angular/angular-cli/commit/07e2120dab741fda11debc0fe777a5ef888dcaad) | perf | remove JavaScript transformer from server polyfills bundling                                                    |
| [c28475d30](https://github.com/angular/angular-cli/commit/c28475d30b08138ddddb9903acaa067cf8ab2ef6) | perf | reuse esbuild generated output file hashes                                                                      |
| [59c22aa4c](https://github.com/angular/angular-cli/commit/59c22aa4cadd7bc6da20acfd3632c834824044e2) | perf | start SSR dependencies optimization before the first request                                                    |
| [223a82f5f](https://github.com/angular/angular-cli/commit/223a82f5f02c8caaf34ce49ee3ddde22a75e65c1) | perf | use incremental bundling for component styles in esbuild builders                                               |
| [4b67d2afd](https://github.com/angular/angular-cli/commit/4b67d2afd3a2d4be188a7313b3fe4ea5c07907b6) | perf | use single JS transformer instance during dev-server prebundling                                                |

### @angular-devkit/schematics

| Commit                                                                                              | Type     | Description                                                           |
| --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| [f600bbc97](https://github.com/angular/angular-cli/commit/f600bbc97d30a003b9d41fa5f67590d3955e6375) | refactor | remove deprecated `runExternalSchematicAsync` and `runSchematicAsync` |

### @angular/pwa

| Commit                                                                                              | Type | Description           |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------- |
| [81e4917ce](https://github.com/angular/angular-cli/commit/81e4917ceca89759770a76d63b932f380d83685c) | fix  | replace Angular logos |

### @angular/ssr

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [dcf3fddff](https://github.com/angular/angular-cli/commit/dcf3fddff2fa4cf3433c5d726be9f514ba41e827) | feat | add performance profiler to `CommonEngine`               |
| [6224b0599](https://github.com/angular/angular-cli/commit/6224b0599fd60f61c537aa602fb89079197a6e2d) | fix  | correctly set config URL                                 |
| [8d033841d](https://github.com/angular/angular-cli/commit/8d033841d1785944f60ccd425e413865c9caf581) | fix  | enable `prerender` and `ssr` for all build configuration |
| [ee0991bed](https://github.com/angular/angular-cli/commit/ee0991beddc96160f9ba7e27b29def54868f3490) | fix  | enable performance profiler option name                  |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| [f43754570](https://github.com/angular/angular-cli/commit/f437545705d41c781498b8e7724293455cf3edf9) | feat | add automated preconnects for image domains                       |
| [4fe03266a](https://github.com/angular/angular-cli/commit/4fe03266a9232346ec49defa98d9eb3a8d88b1ff) | fix  | account for arrow function IIFE                                   |
| [828030da0](https://github.com/angular/angular-cli/commit/828030da0fa9e82fa784c4f55e3c089c7c601e98) | fix  | account for styles specified as string literals and styleUrl      |
| [16428fc97](https://github.com/angular/angular-cli/commit/16428fc97ae64627f790346e6b54b94a67c7202c) | fix  | adjust static scan to find image domains in standlone components  |
| [486becdbb](https://github.com/angular/angular-cli/commit/486becdbbaec7cacfa42bd66882efe720473b0f6) | fix  | remove setClassDebugInfo calls                                    |
| [89f21ac8c](https://github.com/angular/angular-cli/commit/89f21ac8c4309614a59cda5a8ebc3b3fbc663932) | fix  | remove setClassMetadataAsync calls                                |
| [8899fb9e3](https://github.com/angular/angular-cli/commit/8899fb9e36556debe3b262f27c1b6e94c4963144) | fix  | skip transforming empty inline styles in Webpack JIT compilations |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.10"></a>

# 16.2.10 (2023-11-08)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------- |
| [bab3672cd](https://github.com/angular/angular-cli/commit/bab3672cdaf4875cf83f94e34abdef29cffe2686) | fix  | normalize exclude path |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.8"></a>

# 16.2.8 (2023-10-25)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| [44275601b](https://github.com/angular/angular-cli/commit/44275601ba0e4c7b8c24f8184a33d09350a0fbef) | fix  | remove the need to specify `--migrate-only` when `--name` is used during `ng update` |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.7"></a>

# 16.2.7 (2023-10-19)

### @schematics/angular

| Commit                                                                                              | Type | Description              |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------ |
| [f1a0c3361](https://github.com/angular/angular-cli/commit/f1a0c3361a6caa27bdf5cc07315d8bf2b6424b11) | fix  | change Twitter logo to X |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.6"></a>

# 16.2.6 (2023-10-11)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------- |
| [c6ea25626](https://github.com/angular/angular-cli/commit/c6ea2562683cc6e640136a02760db9363ded4352) | fix  | fully downlevel async/await when using vite dev-server with caching enabled |

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.2.10"></a>

# 15.2.10 (2023-10-05)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------ |
| [05213c95b](https://github.com/angular/angular-cli/commit/05213c95b032dd64fdc73ed33af695e9f19b5d09) | fix  | update dependency postcss to v8.4.31 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.13"></a>

# 14.2.13 (2023-10-05)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------ |
| [1ca44dcd9](https://github.com/angular/angular-cli/commit/1ca44dcd9d79916db70180da37b962c2672a76a8) | fix  | update dependency postcss to v8.4.31 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.5"></a>

# 16.2.5 (2023-10-04)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------- |
| [933358186](https://github.com/angular/angular-cli/commit/93335818689a67557942ab27ec8cc5b96f2a5abe) | fix  | do not print `Angular is running in development mode.` in the server console when using dev-server |
| [493bd3906](https://github.com/angular/angular-cli/commit/493bd390679889359a05b2f23b74787647aee341) | fix  | update dependency postcss to v8.4.31                                                               |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.4"></a>

# 16.2.4 (2023-09-27)

### @schematics/angular

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [5dc7fb1a1](https://github.com/angular/angular-cli/commit/5dc7fb1a1849a427ceedb06404346de370c91083) | fix  | update `@angular/cli` version specifier to use `^` |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.3"></a>

# 16.2.3 (2023-09-20)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [39643bee1](https://github.com/angular/angular-cli/commit/39643bee1522e0313be612b564f2b96ec45007ec) | fix  | correctly re-point RXJS to ESM on Windows                 |
| [d8d116b31](https://github.com/angular/angular-cli/commit/d8d116b318377d51f258a1a23025be2d41136ee3) | fix  | several windows fixes to application builder prerendering |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                      |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------- |
| [f1195d035](https://github.com/angular/angular-cli/commit/f1195d0351540bdcc7d3f3e7cf0761389eb3d569) | fix  | fix recursion in webpack resolve |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.2"></a>

# 16.2.2 (2023-09-13)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| [e3a40a49a](https://github.com/angular/angular-cli/commit/e3a40a49aa768c6b0ddce24ad47c3ba50028963c) | fix  | support dev server proxy pathRewrite field in Vite-based server |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.1"></a>

# 16.2.1 (2023-08-30)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                           |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| [221ab2483](https://github.com/angular/angular-cli/commit/221ab2483a5504b0ad864a18dc5a4dbeb8c0748e) | fix  | display warning when using `resourcesOutputPath` with esbuild builder |
| [fe752ad87](https://github.com/angular/angular-cli/commit/fe752ad87b8588e2a1ee1611953b36d5c004e673) | fix  | encode Sass package resolve directories in importer URLs              |
| [82b0f94fd](https://github.com/angular/angular-cli/commit/82b0f94fdacc5f4665d00eeb1c93fcfc104b0cc8) | fix  | handle HMR updates of global CSS when using Vite                      |
| [6a48a11b8](https://github.com/angular/angular-cli/commit/6a48a11b8c218796e4b778bd00d453fc0ac0c48e) | fix  | update vite to be able to serve app-shell and SSG pages               |
| [fdb16f7cd](https://github.com/angular/angular-cli/commit/fdb16f7cd4327980436ddb1ce190c67c86588d2d) | fix  | use correct type for `extraEntryPoints`                               |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.2.0"></a>

# 16.2.0 (2023-08-09)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------- |
| [e6b377436](https://github.com/angular/angular-cli/commit/e6b377436a471073657dc35e7c7a28db6688760a) | feat | add `ssr` option in application builder                                         |
| [c05c83be7](https://github.com/angular/angular-cli/commit/c05c83be7c6c8bcdad4be8686a6e0701a55304cc) | feat | add initial application builder implementation                                  |
| [095f5aba6](https://github.com/angular/angular-cli/commit/095f5aba60a4c1267a87b8b3ae38dbfbf70731f1) | feat | add initial support for server bundle generation using esbuild                  |
| [cb165a75d](https://github.com/angular/angular-cli/commit/cb165a75dc8c21ead537684a092ed50d3736e04a) | feat | add pre-rendering (SSG) and App-shell support generation to application builder |
| [2a3fc6846](https://github.com/angular/angular-cli/commit/2a3fc68460152a48758b9353bff48193641861c5) | feat | add preload hints based on transitive initial files                             |
| [099cec758](https://github.com/angular/angular-cli/commit/099cec758ad671c7fd0ca2058a271e4fe181a44d) | feat | add support for serving SSR with dev-server when using the application builder  |
| [449e21b3a](https://github.com/angular/angular-cli/commit/449e21b3a6da990a5865bb5bdfb8145794f40cf9) | fix  | correctly load dev server assets with vite 4.4.0+                               |
| [f42f10135](https://github.com/angular/angular-cli/commit/f42f10135c1e2184a9080b726dc5e41669937b13) | fix  | ensure preload hints for external stylesheets are marked as styles              |
| [7defb3635](https://github.com/angular/angular-cli/commit/7defb3635c89737d151c9537bd7becd463098434) | fix  | ensure that server dependencies are loaded also in ssr entrypoint               |
| [05f31bd28](https://github.com/angular/angular-cli/commit/05f31bd28f002a232598e0468dc418f99e434ae0) | fix  | prevent race condition in setting up sass worker pool                           |
| [5048f6e82](https://github.com/angular/angular-cli/commit/5048f6e82e299b0733f34cbdcb1e7b1ef9a63210) | fix  | Set chunk names explicitly                                                      |
| [974748cdf](https://github.com/angular/angular-cli/commit/974748cdf894c5ad0451e3fdf1c186bdad80878b) | perf | filter postcss usage based on content in esbuild builder                        |
| [61a652d91](https://github.com/angular/angular-cli/commit/61a652d91274f4adce20182e630fe9963b4ceddd) | perf | inject Sass import/use directive importer information when resolving            |
| [a0a2c7aef](https://github.com/angular/angular-cli/commit/a0a2c7aef675f8aae294d2119f721c4345d633b0) | perf | only load browserslist in babel preset if needed                                |
| [6bfd1800e](https://github.com/angular/angular-cli/commit/6bfd1800efa2bf41126696b66938bdf291ad5455) | perf | use in-memory Sass module resolution cache                                      |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.1.8"></a>

# 16.1.8 (2023-08-04)

| Commit                                                                                              | Type | Description            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------- |
| [7a420d338](https://github.com/angular/angular-cli/commit/7a420d3382b21d24c73b722e849f01b0aacfb860) | fix  | build: update critters |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.1.7"></a>

# 16.1.7 (2023-08-02)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                            |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------- |
| [1dab4ed87](https://github.com/angular/angular-cli/commit/1dab4ed8738b42d6b93298889caf1546b011706f) | fix  | hot update filename suffix with `.mjs` |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.1.6"></a>

# 16.1.6 (2023-07-26)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [20816b57f](https://github.com/angular/angular-cli/commit/20816b57f16b0bcbd5b81f06f6f790e4485c1daa) | fix  | error during critical CSS inlining for external stylesheets |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.1.5"></a>

# 16.1.5 (2023-07-20)

### @angular/cli

| Commit                                                                                              | Type | Description                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------- |
| [7e91d4709](https://github.com/angular/angular-cli/commit/7e91d4709966c592c271ff8d3456ce569156e2e5) | fix  | add `zone.js` to `ng version` output              |
| [475506822](https://github.com/angular/angular-cli/commit/475506822b148c8e2597c60653238a40140bacb0) | fix  | throw an error when executed in a google3-context |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [07d3d8c6a](https://github.com/angular/angular-cli/commit/07d3d8c6ae01212de866fac769ff2da888d5adea) | fix  | correctly wrap CommonJS exported enums when optimizing |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.1.4"></a>

# 16.1.4 (2023-07-06)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                  |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------- |
| [7016cee57](https://github.com/angular/angular-cli/commit/7016cee5783b2762d550db8f2a4f29e7b56f317f) | fix  | normalize paths in loader cache with esbuild |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.1.3"></a>

# 16.1.3 (2023-06-29)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [b56ab0798](https://github.com/angular/angular-cli/commit/b56ab07980c5d990606ddb1e298fc1c4ecf8a2a8) | fix  | use absolute watch paths for postcss dependency messages |

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.2.9"></a>

# 15.2.9 (2023-06-28)

### @angular/cli

| Commit                                                                                              | Type | Description                                |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| [f36e38a91](https://github.com/angular/angular-cli/commit/f36e38a913b454ec340d6bf2311391c5df1cee24) | fix  | update direct semver dependencies to 7.5.3 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.1.2"></a>

# 16.1.2 (2023-06-28)

### @angular/cli

| Commit                                                                                              | Type | Description                                  |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------- |
| [3475e0281](https://github.com/angular/angular-cli/commit/3475e0281da3298f288a5f8836155c0b8c971372) | fix  | update direct `semver` dependencies to 7.5.3 |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                    |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| [8108b8c2d](https://github.com/angular/angular-cli/commit/8108b8c2da3ebfdb74f0f9d3554df01f484670bd) | fix  | allow linker JIT support with prebundling with esbuild builder |
| [502365037](https://github.com/angular/angular-cli/commit/502365037bf7dbacd0e28d29a074a246971848ea) | fix  | use all style language watch files in esbuild builder          |

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.12"></a>

# 14.2.12 (2023-06-28)

### @angular/cli

| Commit                                                                                              | Type | Description                                |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| [bd396b656](https://github.com/angular/angular-cli/commit/bd396b65623fb0b8e826be13f88709e87b54336e) | fix  | update direct semver dependencies to 7.5.3 |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.1.1"></a>

# 16.1.1 (2023-06-22)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| [f017fee2e](https://github.com/angular/angular-cli/commit/f017fee2e93a4207b7bfd69c838991546b398753) | fix  | actually disable Vite prebundling file discovery                                     |
| [2b4beaca2](https://github.com/angular/angular-cli/commit/2b4beaca2c32c11508078e082b3338d1edb414a0) | fix  | experimental esbuild pipeline, add `es2015` to main fields for RxJS v6 compatibility |
| [e3c85e00e](https://github.com/angular/angular-cli/commit/e3c85e00e6b3390f239aaeb3db6a38fe4b4d2523) | fix  | track postcss provided file dependencies in esbuild builder                          |
| [1419fff88](https://github.com/angular/angular-cli/commit/1419fff887173e331690fb0a664a081154842554) | fix  | unpin and downgrade `browserslist`                                                   |
| [950a4b60f](https://github.com/angular/angular-cli/commit/950a4b60f046117867755ccd005f0e04bcc403a7) | fix  | watch all bundler provided inputs with esbuild builder                               |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.1.0"></a>

# 16.1.0 (2023-06-13)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                    |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| [b14b95990](https://github.com/angular/angular-cli/commit/b14b959901d5a670da0df45e082b8fd4c3392d14) | feat | add bootstrap-agnostic utilities for writing ng-add schematics |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------- |
| [3ede1a2ca](https://github.com/angular/angular-cli/commit/3ede1a2cac5005f4dfbd2a62ef528a34c3793b78) | feat | allow forcing esbuild builder with dev-server                           |
| [2d141fe3b](https://github.com/angular/angular-cli/commit/2d141fe3bc1efb9e254b15ce91ebc885a43c928a) | feat | show estimated transfer size with esbuild builder                       |
| [9aa9b5264](https://github.com/angular/angular-cli/commit/9aa9b5264eee1b1dda7abd334b560d4b446c4970) | feat | support autoprefixer/tailwind CSS with Less/Sass in esbuild builder     |
| [3d1c09b23](https://github.com/angular/angular-cli/commit/3d1c09b235bf1db0d031c36fdc68ab99359b34b1) | feat | support dev-server package prebundling with esbuild builder             |
| [d8930facc](https://github.com/angular/angular-cli/commit/d8930facc075e39d82b3c6cb252c9a8b5fa6a476) | feat | support incremental TypeScript semantic diagnostics in esbuild builder  |
| [5cacd34a2](https://github.com/angular/angular-cli/commit/5cacd34a222eea16c18caa63dbe4448b81e106f3) | fix  | watch all TypeScript referenced files in esbuild builder                |
| [8336ad80d](https://github.com/angular/angular-cli/commit/8336ad80da41cde69343960f7515d9ffd5e5e2e1) | perf | enable in-memory load result caching for stylesheets in esbuild builder |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.0.6"></a>

# 16.0.6 (2023-06-13)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [eebb54cbf](https://github.com/angular/angular-cli/commit/eebb54cbf4683b6113eb56dba17fab038318c918) | fix  | correctly handle sass imports                             |
| [081b62539](https://github.com/angular/angular-cli/commit/081b62539b2562bff130343558bf4baafed7c36d) | fix  | support proxy configuration array-form in esbuild builder |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.0.5"></a>

# 16.0.5 (2023-06-07)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [9817b984b](https://github.com/angular/angular-cli/commit/9817b984b15e352caedac6e347cc662117b9e0f8) | fix  | ignore .git folder in browser-esbuild watcher                 |
| [ce95d2545](https://github.com/angular/angular-cli/commit/ce95d254510ffa93a9bd4230f6447530d511ef5f) | fix  | ignore folders starting with a dot in browser-esbuild watcher |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.0.4"></a>

# 16.0.4 (2023-06-01)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [5bff97d5b](https://github.com/angular/angular-cli/commit/5bff97d5b965373cd7e4dc0b731c24d80b512faa) | fix  | correctly set overridden compiler option            |
| [cd0247514](https://github.com/angular/angular-cli/commit/cd0247514db295661d319bec33ad7167229d99f9) | fix  | preemptively remove AOT metadata in esbuild builder |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.0.3"></a>

# 16.0.3 (2023-05-25)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [1d83bb656](https://github.com/angular/angular-cli/commit/1d83bb6565550107ab00de52b706cad8f28514b3) | fix  | percent encode asset URLs in development server for esbuild |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.0.2"></a>

# 16.0.2 (2023-05-17)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [7a3c895c8](https://github.com/angular/angular-cli/commit/7a3c895c8da534ceff26754ca7ffd49b30c24069) | fix  | attempt relative global script read first in esbuild builder |
| [f30be2518](https://github.com/angular/angular-cli/commit/f30be2518b118106f5d6634c92279adcefab0f70) | fix  | correctly generate serviceworker hashes for binary assets    |
| [117e8d001](https://github.com/angular/angular-cli/commit/117e8d00192d3b764c9c362c2554fa80706946cf) | fix  | normalize Vite dev-server Windows asset paths                |
| [e5c1d43de](https://github.com/angular/angular-cli/commit/e5c1d43de932daedfaac002ff363ed12243f97bb) | perf | minor sourcemap ignorelist improvements for esbuild builder  |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.0.1"></a>

# 16.0.1 (2023-05-10)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                        |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| [ed82c83fe](https://github.com/angular/angular-cli/commit/ed82c83fef1a67b4168be455b119860217267564) | fix  | avoid CommonJS warnings for relative imports with esbuild builders |
| [3083c4eda](https://github.com/angular/angular-cli/commit/3083c4eda87e735a4b1b9e16ff1f61abbccb1c98) | fix  | avoid hash filenames for non-injected global styles/scripts        |
| [b106bc9d0](https://github.com/angular/angular-cli/commit/b106bc9d07b1e2e38176c484d2fc04251e274aa5) | fix  | clean incoming index URL before processing in esbuild builder      |
| [2967705ed](https://github.com/angular/angular-cli/commit/2967705ed3f88c35e93866bca659222769664c62) | fix  | convert dev-server glob proxy entries for esbuild builder          |
| [a9d20015c](https://github.com/angular/angular-cli/commit/a9d20015c943e89b6f29a6e3e295bef6e2072a92) | fix  | disable runtime errors from being displayed in overlay             |
| [822b552f6](https://github.com/angular/angular-cli/commit/822b552f6f94ac1c39405f7359550e1ab5aa4c17) | fix  | fix index option const value for browser-esbuild                   |
| [131cd23b6](https://github.com/angular/angular-cli/commit/131cd23b65c12ba671088aafcaff4d522f402ba8) | fix  | prevent relative import failure with Less in esbuild builder       |
| [fedcc5d92](https://github.com/angular/angular-cli/commit/fedcc5d923b7237622b1e7adef053a2ee68f872e) | fix  | properly set base dev-server path with esbuild                     |
| [cb3161045](https://github.com/angular/angular-cli/commit/cb3161045ef39e335460672d016cf0a973de428a) | fix  | show error note for CSS url() tilde usage in esbuild builder       |
| [54e5000ca](https://github.com/angular/angular-cli/commit/54e5000ca88655bf9d01b87e317dc5810a7ac676) | fix  | workaround for esbuild static block AOT generated code             |

### @angular-devkit/schematics

| Commit                                                                                              | Type | Description                                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------- |
| [5a35970af](https://github.com/angular/angular-cli/commit/5a35970afdf39461592bb0130eb9b959272949fb) | fix  | do not generate an UpdateBuffer for created and overridden files |

### @angular/pwa

| Commit                                                                                              | Type | Description        |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------ |
| [70d224ca7](https://github.com/angular/angular-cli/commit/70d224ca7edbfe31fb6360e55cbe06c65dc5e91a) | fix  | compress PWA icons |

<!-- CHANGELOG SPLIT MARKER -->

<a name="16.0.0"></a>

# 16.0.0 (2023-05-03)

## Breaking Changes

### @angular/cli

- The deprecated `defaultCollection` workspace option has been removed. Use `schematicCollections` instead.

  Before

  ```json
  "defaultCollection": "@angular/material"
  ```

  After

  ```json
  "schematicCollections": ["@angular/material"]
  ```

- The deprecated `defaultProject` workspace option has been removed. The project to use will be determined from the current working directory.
- Node.js v14 support has been removed

  Node.js v14 is planned to be End-of-Life on 2023-04-30. Angular will stop supporting Node.js v14 in Angular v16.
  Angular v16 will continue to officially support Node.js versions v16 and v18.

### @schematics/angular

- `ng g resolver` and `ng g guard` now generate a functional resolver or guard by default. It is still possible to generate a (deprecated) class-based resolver or guard by using `ng g resolver --no-functional` or `ng g guard --no-functional`.
- The CLI no longer allows to generate `CanLoad` guards. Use `CanMatch` instead.

###

- - TypeScript 4.8 is no longer supported.

### @angular-devkit/build-angular

- Deprecated `outputPath` and `outputPaths` from the server and browser builder have been removed from the builder output. Use `outputs` instead.

  Note: this change does not effect application developers.

### @angular-devkit/core

- Several changes to the `SchemaRegistry`.
  - `compile` method now returns a `Promise`.
  - Deprecated `flatten` has been removed without replacement.
- - `ContentHasMutatedException`, `InvalidUpdateRecordException`, `UnimplementedException` and `MergeConflictException` API from `@angular-devkit/core` have been removed in favor of the API from `@angular-devkit/schematics`.
  - `UnsupportedPlatformException` - A custom error exception should be created instead.

### @angular-devkit/schematics

- The depracated `UpdateBuffer` has been removed and `UpdateBuffer2`
  is renamed to `UpdateBuffer`. With this change the related and
  deprecated symbols `ContentCannotBeRemovedException` and `Chunk`
  have also been removed.

### @ngtools/webpack

- NGCC integration has been removed and as a result Angular View Engine libraries will no longer work.

### @schematics/angular

| Commit                                                                                              | Type | Description                                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| [c2d2da41b](https://github.com/angular/angular-cli/commit/c2d2da41b15143e11f597192eef755c5e3fb4c5d) | feat | add support to add service worker to standalone application                   |
| [22fdd7da9](https://github.com/angular/angular-cli/commit/22fdd7da97c832048410ca89622712d097490c5d) | feat | generate functional resolvers and guards by default                           |
| [a832c2028](https://github.com/angular/angular-cli/commit/a832c202828a1caa425e1a0c5ff8d2ebb77c4667) | feat | Implement a standalone flag for new applications                              |
| [5ceedcb11](https://github.com/angular/angular-cli/commit/5ceedcb11e3ca5bdad4248c7c76ca2562fab43f2) | feat | remove deprecated CanLoad option for guards                                   |
| [c9e84d024](https://github.com/angular/angular-cli/commit/c9e84d0243b4e9191f6cfcd72ebf8288de2b6f2d) | feat | remove generation of `BrowserModule.withServerTransition`                     |
| [50b9e59a5](https://github.com/angular/angular-cli/commit/50b9e59a50b737e34ee12ee48ab83d17c2b8744a) | feat | update app-shell schematic to support standalone applications                 |
| [dc5cc893d](https://github.com/angular/angular-cli/commit/dc5cc893d6c3d4e5e6f6c4b19bee632b66a94fc0) | feat | Update universal schematic to support standalone applications                 |
| [f98c9de80](https://github.com/angular/angular-cli/commit/f98c9de80952593e0294538d96bdac7136629f77) | fix  | add experimental message when using standalone application schematic.         |
| [a5cb46124](https://github.com/angular/angular-cli/commit/a5cb46124234ec2c47f6288914ad3ed9564f3a72) | fix  | add standalone option to library library                                      |
| [b2ed7bd10](https://github.com/angular/angular-cli/commit/b2ed7bd100bfe77dca81c590b827870fd496075f) | fix  | provide migration that disables build optimizer on dev server builds          |
| [ba4414b2c](https://github.com/angular/angular-cli/commit/ba4414b2cfb7a040393f314d87ab823bcad75f26) | fix  | reformat app.config.ts                                                        |
| [202e9a50f](https://github.com/angular/angular-cli/commit/202e9a50f62b7927c0900469b21d323b3010762d) | fix  | remove compileComponents from component test schematic                        |
| [0d58f73c5](https://github.com/angular/angular-cli/commit/0d58f73c50ce496dd3a0166533069f450f83a461) | fix  | rename `app.server.module.ts` to `app.module.server.ts`                       |
| [de6d30102](https://github.com/angular/angular-cli/commit/de6d30102978eebda7edbdda43ca50f18c4c8aaf) | fix  | replace `provideServerSupport` with `provideServerRendering`                  |
| [bff634fe0](https://github.com/angular/angular-cli/commit/bff634fe0938ecb4a316064ba3f1b9c2c1f208fe) | fix  | update private Components utilities to work with standalone project structure |
| [85fe820b0](https://github.com/angular/angular-cli/commit/85fe820b081b73b229084882e98e65b5c57f9d0f) | fix  | use same property order in standalone AppComponent                            |

### @angular/cli

| Commit                                                                                              | Type     | Description                                                        |
| --------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| [68024234e](https://github.com/angular/angular-cli/commit/68024234edcb942d5a177d6bd7567e77d7e40245) | feat     | remove deprecated `defaultCollection` from workspace configuration |
| [d58428d3d](https://github.com/angular/angular-cli/commit/d58428d3dbdb7275e2e4f6d271fcc5fdda5c489e) | feat     | remove deprecated `defaultProject` from workspace configuration    |
| [7cb5689e0](https://github.com/angular/angular-cli/commit/7cb5689e02c30c0ef53adef92d0e9969e1a1536b) | feat     | show optional migrations during update process                     |
| [c29c8e18d](https://github.com/angular/angular-cli/commit/c29c8e18d84096e2f72af12643c31bde51010548) | refactor | remove Node.js v14 support                                         |

###

| Commit                                                                                              | Type  | Description                                                |
| --------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------- |
| [5a171ddff](https://github.com/angular/angular-cli/commit/5a171ddff66ff366089616736baf7545fe44f570) | build | update to TypeScript 5 and drop support for TypeScript 4.8 |

### @angular-devkit/architect

| Commit                                                                                              | Type | Description                                   |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------- |
| [48871381a](https://github.com/angular/angular-cli/commit/48871381a169888f1d29275ab25915b0d815d1c1) | fix  | allow registered builder teardowns to execute |

### @angular-devkit/build-angular

| Commit                                                                                              | Type     | Description                                                                                         |
| --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| [ff5ebf9b1](https://github.com/angular/angular-cli/commit/ff5ebf9b1244c5a01961cd3dba6bb345392aa57c) | feat     | add CSP support for inline styles                                                                   |
| [ee8013f66](https://github.com/angular/angular-cli/commit/ee8013f66f7587ba85ed76fb0c662168fd850c47) | feat     | display build output table with esbuild                                                             |
| [0eac98f61](https://github.com/angular/angular-cli/commit/0eac98f6176bde662d7d7e9532b5a988b8e7ece2) | feat     | implement progress option for esbuild builder                                                       |
| [f04859d16](https://github.com/angular/angular-cli/commit/f04859d16117a41b6e8ad698a449aca73456b9d7) | feat     | initial autoprefixer support for CSS in esbuild builder                                             |
| [8c550302c](https://github.com/angular/angular-cli/commit/8c550302cc046e649f1245007e0e26550a61f931) | feat     | initial development server for esbuild-based builder                                                |
| [52969db6b](https://github.com/angular/angular-cli/commit/52969db6bdaf42ec7d7f28274eba518ed1a794b7) | feat     | initial tailwindcss support for CSS in esbuild builder                                              |
| [ce46ecae0](https://github.com/angular/angular-cli/commit/ce46ecae011595c86fea265e121ea313bb3cb030) | feat     | support module resolution with less stylesheets in esbuild builder                                  |
| [584b51907](https://github.com/angular/angular-cli/commit/584b51907c3b3f60db5478994fff3f800b70c3f2) | feat     | support scripts option with esbuild builder                                                         |
| [e4883b0ee](https://github.com/angular/angular-cli/commit/e4883b0ee1d1ee7cd57e6cb374944021a100fd3b) | feat     | support SSL options with esbuild development server                                                 |
| [290802060](https://github.com/angular/angular-cli/commit/2908020601e627b7c76c6fe8d53e19e8858cd325) | feat     | support standalone app-shell generation                                                             |
| [766c14698](https://github.com/angular/angular-cli/commit/766c14698473fe333168c06e3b88c7303e868acf) | fix      | add sourcemap `x_google_ignoreList` support for esbuild builder                                     |
| [cdfa7ca88](https://github.com/angular/angular-cli/commit/cdfa7ca88c2e79564192d4b7fdafb53d97f2607d) | fix      | allow multiple polyfills with esbuild-based builder                                                 |
| [e690b7cbd](https://github.com/angular/angular-cli/commit/e690b7cbde470b69b3c23fa9af1ecfca4c8e3a7e) | fix      | always enable `looseEnums` build optimizer rule                                                     |
| [135ab4c36](https://github.com/angular/angular-cli/commit/135ab4c363d5d247342c4bc123a17eb66de17752) | fix      | avoid double sourcemap comments with esbuild dev-server                                             |
| [dcf60d2be](https://github.com/angular/angular-cli/commit/dcf60d2be26fdbc1efaec1c506188cb166ffbdf0) | fix      | correctly filter lazy global styles in esbuild builder                                              |
| [342a4ea30](https://github.com/angular/angular-cli/commit/342a4ea30e1ab9cbdbe5d6de339c21bdcff1a2c1) | fix      | correctly show initial files in stat table with esbuild builder                                     |
| [107851ae4](https://github.com/angular/angular-cli/commit/107851ae45d8399782cbc73d3fa09b3f779e1e02) | fix      | display warning when `preserveWhitespaces` is set in the tsconfig provided to the server builder    |
| [ff8a89cbf](https://github.com/angular/angular-cli/commit/ff8a89cbfd308a0312d16956d55c30e2425e2d33) | fix      | ensure all build resources are served in esbuild dev server                                         |
| [f76a8358e](https://github.com/angular/angular-cli/commit/f76a8358ea07a0d00fb0eb1c62dfaccf056531be) | fix      | ensure directories are properly ignored in esbuild builder                                          |
| [005ba4276](https://github.com/angular/angular-cli/commit/005ba427661f0e5907020aea10c432a324b528a8) | fix      | ensure empty component styles compile with esbuild                                                  |
| [f74151baa](https://github.com/angular/angular-cli/commit/f74151baab740df15a5cc80255d97d0320147b2a) | fix      | exclude `@angular/platform-server/init` from unsafe optimizations                                   |
| [f72155bc7](https://github.com/angular/angular-cli/commit/f72155bc7025f4e0b23eb58a92e422bd341720f6) | fix      | fully remove third-party sourcemaps when disabled in esbuild builder                                |
| [26dced95c](https://github.com/angular/angular-cli/commit/26dced95c5612f6386b3179fce50904f178ee569) | fix      | JIT support for standalone applications                                                             |
| [4822b3ba5](https://github.com/angular/angular-cli/commit/4822b3ba55ec824913e895e76cf83e2b36ec99f9) | fix      | keep esbuild server active until builder fully stops                                                |
| [adbf2c8a1](https://github.com/angular/angular-cli/commit/adbf2c8a1ed67f505ea27921c00f957509e9a958) | fix      | normalize long-form asset option output to relative path                                            |
| [67670b612](https://github.com/angular/angular-cli/commit/67670b612e2397e26a974cd337cdce1a9c6a0f21) | fix      | pass listening port in result for esbuild dev server                                                |
| [1a8833b21](https://github.com/angular/angular-cli/commit/1a8833b211cbf2535d3deed1029591050bc995b8) | fix      | provide option to run build-optimizer on server bundles                                             |
| [b8c9667f9](https://github.com/angular/angular-cli/commit/b8c9667f9292d3829bfcac10a98acd859301c3c7) | fix      | remove unintended files in esbuild output stats table                                               |
| [04274afc1](https://github.com/angular/angular-cli/commit/04274afc15084ead2916e11055aa8f1d2f61951d) | fix      | set public class fields as properties ([#24849](https://github.com/angular/angular-cli/pull/24849)) |
| [a778fe6c2](https://github.com/angular/angular-cli/commit/a778fe6c2e7b9ca0c0995e1350460e97085b39a1) | fix      | show lazy files in stat table correctly with esbuild                                                |
| [955b493b1](https://github.com/angular/angular-cli/commit/955b493b13e0a8956706c486d31d9e4338bf41c5) | fix      | support CSP on critical CSS link tags.                                                              |
| [c272172c8](https://github.com/angular/angular-cli/commit/c272172c84bef35f63038f1fc5fa184b1e2d99bf) | fix      | update esbuild builder complete log                                                                 |
| [0b450578a](https://github.com/angular/angular-cli/commit/0b450578a74e2b46488ae2e97c7f76389baa5271) | fix      | update list of known tailwind configuration files                                                   |
| [759ae92aa](https://github.com/angular/angular-cli/commit/759ae92aaa595fe3f6000f3aae0e6bb8d025db3a) | fix      | update peer dependencies to support version 16                                                      |
| [eca366a84](https://github.com/angular/angular-cli/commit/eca366a843be1fcc8d949bc335cac4cdcbdea41c) | fix      | use preserveSymlinks option for tsconfigs in esbuild builder                                        |
| [28c27567c](https://github.com/angular/angular-cli/commit/28c27567cf90712e6c8f4d483bcc0e0fc683ee9b) | perf     | asynchronously delete output path in esbuild builder                                                |
| [458400b7b](https://github.com/angular/angular-cli/commit/458400b7b1a435e2febe2c4e1a9fd1ca4eda58d0) | perf     | avoid unnessary iterations                                                                          |
| [a710a262a](https://github.com/angular/angular-cli/commit/a710a262aed8a6c4a6af48e0ad7f479f0a23212e) | perf     | cache Sass in memory with esbuild watch mode                                                        |
| [e1398d333](https://github.com/angular/angular-cli/commit/e1398d333e86b6caad8b5cfef7048fefd77a9e22) | perf     | do not inline sourcemap when using vite dev-server                                                  |
| [b2ece91b7](https://github.com/angular/angular-cli/commit/b2ece91b7488a01b6ddfcba1e68f97416c8b05f7) | perf     | enhance Sass package resolution in esbuild builder                                                  |
| [aae34fc02](https://github.com/angular/angular-cli/commit/aae34fc02dc774d59ecac6483288f47074ee8c2d) | perf     | fully lazy load sass in esbuild builder                                                             |
| [9ea3e8e34](https://github.com/angular/angular-cli/commit/9ea3e8e349dd1765d5935517999a1879a7a0227d) | perf     | only import esbuild watcher when in watch mode                                                      |
| [f88ac6fdf](https://github.com/angular/angular-cli/commit/f88ac6fdfee6abf406720c9bc72aa9ddadb112f9) | perf     | skip Angular linker in JIT mode with esbuild                                                        |
| [a99018cd7](https://github.com/angular/angular-cli/commit/a99018cd7bb66ee53026e06deae6a14455023910) | refactor | remove deprecated `outputPaths` and `outputPath` Builder output                                     |

### @angular-devkit/core

| Commit                                                                                              | Type     | Description                                         |
| --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| [f6624b974](https://github.com/angular/angular-cli/commit/f6624b974faf13fa718d304e1a473260c16f0c1d) | feat     | update SchemaRegistry `compile` to return `Promise` |
| [0ad81cdbc](https://github.com/angular/angular-cli/commit/0ad81cdbc72e80ca75d9d5cc2bc0c6163267a0bb) | refactor | remove deprecated exceptions                        |

### @angular-devkit/schematics

| Commit                                                                                              | Type     | Description                                                        |
| --------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| [d2ef386f4](https://github.com/angular/angular-cli/commit/d2ef386f46131af904ca800cc77388c03239cd9d) | refactor | remove `UpdateBuffer` and rename `UpdateBuffer2` to `UpdateBuffer` |

### @ngtools/webpack

| Commit                                                                                              | Type     | Description             |
| --------------------------------------------------------------------------------------------------- | -------- | ----------------------- |
| [c8ac660d8](https://github.com/angular/angular-cli/commit/c8ac660d8b13922be7ebcc92dfd5b18392602c40) | refactor | remove NGCC integration |

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.2.8"></a>

# 15.2.8 (2023-05-03)

### @angular/cli

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [069dcdf0c](https://github.com/angular/angular-cli/commit/069dcdf0c4e614fea83af61d4496bdd8a96920ca) | docs | improve wording in doc command version description |

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.2.7"></a>

# 15.2.7 (2023-04-26)

### @angular/cli

| Commit                                                                                              | Type | Description                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------ |
| [f4a6dac87](https://github.com/angular/angular-cli/commit/f4a6dac8782808e564678b4484f3ce87e59f6c8f) | fix  | process keeps running when analytics are enabled |
| [f9b2fb1c4](https://github.com/angular/angular-cli/commit/f9b2fb1c4981ff138992a502d3aba4f6a3886df4) | perf | register CLI commands lazily                     |

### @schematics/angular

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [d9aefd6da](https://github.com/angular/angular-cli/commit/d9aefd6da5bd6ea244da3a8d5ea3dcbbadd31f99) | fix  | replace vscode launch type from `pwa-chrome` to `chrome` |

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.2.6"></a>

# 15.2.6 (2023-04-12)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [f0b257ef4](https://github.com/angular/angular-cli/commit/f0b257ef4ae62f92d70bfd2a4e9912d4ceff9c78) | fix  | ignore hidden directories when running browserlist migration |

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.2.5"></a>

# 15.2.5 (2023-04-05)

### @angular/cli

| Commit                                                                                              | Type | Description              |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------ |
| [db173d7ed](https://github.com/angular/angular-cli/commit/db173d7edf685df67b782d81d1bacb84b8debf9a) | fix  | collect tech information |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.2.4"></a>

# 15.2.4 (2023-03-16)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                             |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------- |
| [f74bfea24](https://github.com/angular/angular-cli/commit/f74bfea241b189f261ec81a8561aea7a56774ae8) | fix  | update `webpack` dependency to `5.76.1` |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.11"></a>

# 14.2.11 (2023-03-16)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                           |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------- |
| [ddd33bf38](https://github.com/angular/angular-cli/commit/ddd33bf38d7d76e816ebc0459559917da514477d) | fix  | update webpack dependency to `5.76.1` |

## Special Thanks

Alan Agius and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.11"></a>

# 13.3.11 (2023-03-16)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                             |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------- |
| [50fa9300f](https://github.com/angular/angular-cli/commit/50fa9300f264f68ad35606ae46da820c3798f665) | fix  | update `webpack` dependency to `5.76.1` |

## Special Thanks

Alan Agius and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.2.3"></a>

# 15.2.3 (2023-03-15)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [a93680585](https://github.com/angular/angular-cli/commit/a9368058517509b277236d6e7db4abc6248817fa) | fix  | correct wrap ES2022 classes with static properties |

## Special Thanks

Alan Agius and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.2.2"></a>

# 15.2.2 (2023-03-08)

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type | Description                              |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------- |
| [dfd03aa7c](https://github.com/angular/angular-cli/commit/dfd03aa7c262f4425fa680e205a46792bd7b8451) | fix  | correctly transform numbers from prompts |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| [eb22f634f](https://github.com/angular/angular-cli/commit/eb22f634f2ec7a5b0bc2f5300682ed8e718b1424) | fix  | build optimizer support for non spec-compliant ES2022 class static properties |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.2.1"></a>

# 15.2.1 (2023-03-01)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                       |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------- |
| [9a5609a44](https://github.com/angular/angular-cli/commit/9a5609a440fc49b3f7ddf88efb73618b7eede1ea) | fix  | improve parsing of error messages |

## Special Thanks

Alan Agius and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.2.0"></a>

# 15.2.0 (2023-02-22)

### @angular/cli

| Commit                                                                                              | Type | Description                                   |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------- |
| [0f58a17c4](https://github.com/angular/angular-cli/commit/0f58a17c4ce92495d96721bc3f2b632a890bbab4) | feat | log number of files update during `ng update` |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type | Description                                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| [ecf43090d](https://github.com/angular/angular-cli/commit/ecf43090d110f996f45a259c279f1b83dcab3fd8) | feat | auto detect package manager ([#24305](https://github.com/angular/angular-cli/pull/24305)) |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| [01b3bcf89](https://github.com/angular/angular-cli/commit/01b3bcf898108f9b879da4a791fa2a21c6d9f7c5) | feat | add Less stylesheet support to experimental esbuild-based builder |
| [09af70743](https://github.com/angular/angular-cli/commit/09af70743800aefdefe06e0ca32bcdde18f9eb77) | feat | implement node module license extraction for esbuild builder      |
| [bbc1a4f0d](https://github.com/angular/angular-cli/commit/bbc1a4f0dc93437fe97a53a35f68d978cc50bb9e) | feat | support CommonJS dependency checking in esbuild                   |
| [8cf0d17fb](https://github.com/angular/angular-cli/commit/8cf0d17fb1b39ea7bbd1c751995a56de3df45114) | feat | support JIT compilation with esbuild                              |
| [3f6769ef9](https://github.com/angular/angular-cli/commit/3f6769ef953b1f880508a9152e669064cbb4dcc9) | fix  | allow empty scripts to be optimized                               |
| [421417a36](https://github.com/angular/angular-cli/commit/421417a36b13a44d39e0818171482871ea8b895f) | fix  | avoid CommonJS warning for zone.js in esbuild                     |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Jason Bedard, Joey Perrott, Marvin and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.1.6"></a>

# 15.1.6 (2023-02-15)

### @angular/cli

| Commit                                                                                              | Type | Description                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------- |
| [3d1f48fa2](https://github.com/angular/angular-cli/commit/3d1f48fa2991ded75da3a1b3a431480710a8ce15) | fix  | add set `SessionEngaged` in GA              |
| [df07ab113](https://github.com/angular/angular-cli/commit/df07ab11351d6f2d82922ae251ccd17b23d9d0a9) | fix  | convert `before` option in `.npmrc` to Date |
| [c787cc780](https://github.com/angular/angular-cli/commit/c787cc7803598eb67260cbd2112d411384d518cc) | fix  | replace `os.version` with `os.release`.     |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [34a4a1bbf](https://github.com/angular/angular-cli/commit/34a4a1bbf608eb54b0a33b3aa3a6be3e2a576770) | fix  | correctly copy `safety-worker.js` contents                   |
| [88a33155d](https://github.com/angular/angular-cli/commit/88a33155d4bc00077d32bef42588427fb2ed49f4) | fix  | update the ECMA output warning message to be more actionable |
| [384ad29c9](https://github.com/angular/angular-cli/commit/384ad29c9a66d78e545ed7e48bf962e4df9d0549) | fix  | use babel default export helper in build optimizer           |
| [59aa1cdbd](https://github.com/angular/angular-cli/commit/59aa1cdbdf3e2712f988790f68bacc174d070b0c) | perf | reduce rebuilt times when using the `scripts` option         |

## Special Thanks

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.1.5"></a>

# 15.1.5 (2023-02-08)

### @angular/cli

| Commit                                                                                              | Type | Description                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------ |
| [b8bbe9688](https://github.com/angular/angular-cli/commit/b8bbe9688e0e684245636e7d58d50c51719039c8) | fix  | error if Angular compiler is used in a schematic |
| [fabbb8a93](https://github.com/angular/angular-cli/commit/fabbb8a936f3b3b1cee8ea5cbdb7bb7832cb02a7) | fix  | only set `DebugView` when `NG_DEBUG` is passed   |

### @schematics/angular

| Commit                                                                                              | Type | Description                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| [499173b5d](https://github.com/angular/angular-cli/commit/499173b5d197f14377203b92b49ff3cbbf55b260) | fix  | remove bootstrapping wrapping in universal schematic |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                           |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| [e87134fe9](https://github.com/angular/angular-cli/commit/e87134fe94831df76698fe0e90fe556da0011511) | fix  | build optimizer support for spec-compliant downlevel class properties |
| [d80adde2f](https://github.com/angular/angular-cli/commit/d80adde2fec53e6513983a89dd194a35c426b8aa) | fix  | do not fail compilation when spec pattern does not match              |
| [11be502e7](https://github.com/angular/angular-cli/commit/11be502e7cc2544371d55c8b3d32b7bcbbf8066e) | fix  | fix support of Safari TP versions                                     |
| [14e317d85](https://github.com/angular/angular-cli/commit/14e317d85429c83e6285c5cec4a1c4483d8a1c8f) | fix  | load polyfills and runtime as scripts instead of modules              |

## Special Thanks

Alan Agius, Charles Lyding, Kristiyan Kostadinov and Ricardo

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.1.4"></a>

# 15.1.4 (2023-02-01)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------- |
| [6c8fdfc69](https://github.com/angular/angular-cli/commit/6c8fdfc6985c5b5017a0b6ab6fa38daf4cb9a775) | fix  | load JavaScript bundles as modules in karma |
| [317452e3b](https://github.com/angular/angular-cli/commit/317452e3b7e25080132b7f7a069696d1c5054f69) | fix  | print server builder errors and warnings    |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.1.3"></a>

# 15.1.3 (2023-01-25)

### @angular/cli

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [de15ec576](https://github.com/angular/angular-cli/commit/de15ec5763afe231439c3f1ace35cbacefad2ca7) | fix  | handle extended schematics when retrieving aliases |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [2c04f4a8f](https://github.com/angular/angular-cli/commit/2c04f4a8f493781fda65f31e81ad86cdd3e510c0) | fix  | update browserslist config to include last 2 Chrome version |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [f31bf300b](https://github.com/angular/angular-cli/commit/f31bf300b9f226d9574060b0e4401c4da88c0ee3) | fix  | avoid undefined module path for Sass imports in esbuild      |
| [c152a4a13](https://github.com/angular/angular-cli/commit/c152a4a13f482948c6aedbbc99d1423f2cf43aea) | fix  | update browserslist config to include last 2 Chrome versions |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                    |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| [9de99202e](https://github.com/angular/angular-cli/commit/9de99202e9427973c7983940fcdea9e4580a79bd) | fix  | handle number like strings in workspace writer |

## Special Thanks

Alan Agius, Charles Lyding and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.1.2"></a>

# 15.1.2 (2023-01-18)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------- |
| [387472a95](https://github.com/angular/angular-cli/commit/387472a956b71eaca89e210e64f4d75969abc9d3) | fix  | register schematic aliases when providing collection name in `ng generate`  |
| [5d9fd788a](https://github.com/angular/angular-cli/commit/5d9fd788a997066dea1b2d69dced865a7c60f5c1) | fix  | remove `--to` option from being required when using `--from` in `ng update` |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------- |
| [0f5fb7e59](https://github.com/angular/angular-cli/commit/0f5fb7e5944e3a521758c67f403d71928f93f7ac) | fix  | replace existing `BrowserModule.withServerTransition` calls when running universal schematic |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [bf4639a6e](https://github.com/angular/angular-cli/commit/bf4639a6e97670972c3d5b137230e2f08467010e) | fix  | prevent hanging initial build during exception with esbuild |

## Special Thanks

Alan Agius, Charles Lyding and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.1.1"></a>

# 15.1.1 (2023-01-12)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------- |
| [b94bf60ca](https://github.com/angular/angular-cli/commit/b94bf60ca828a22d548d65b819ea745eafb96deb) | fix  | update `esbuild` to `0.16.17` |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.1.0"></a>

# 15.1.0 (2023-01-11)

## Deprecations

### @angular-devkit/schematics

- The Observable based `SchematicTestRunner.runSchematicAsync` and `SchematicTestRunner.runExternalSchematicAsync` method have been deprecated in favor of the Promise based `SchematicTestRunner.runSchematic` and `SchematicTestRunner.runExternalSchematic`.

### @schematics/angular

| Commit                                                                                              | Type | Description                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| [5b18ce154](https://github.com/angular/angular-cli/commit/5b18ce1545d047d49851a64e81a1f8ef59624ef7) | feat | add `guardType` as an alias of `implements` in guard schematic       |
| [dd2b65943](https://github.com/angular/angular-cli/commit/dd2b65943d706833f449f76cf8c7278d0a5399ad) | feat | add configuration files generation schematic                         |
| [8d000d156](https://github.com/angular/angular-cli/commit/8d000d1563684f9a9b6869e549e265f0997187c4) | feat | add environments generation schematic                                |
| [6c39a162b](https://github.com/angular/angular-cli/commit/6c39a162bec67083bf6c11b54e84612f1d68c384) | feat | Add schematics for generating functional router guards and resolvers |
| [62121f89a](https://github.com/angular/angular-cli/commit/62121f89abce54e0a1c2b816cdd32b57f2b5a5d1) | feat | add sideEffects:false to library package.json                        |
| [9299dea64](https://github.com/angular/angular-cli/commit/9299dea6492527bcaea24c9c7f3116ee2779405b) | feat | generate functional interceptors                                     |
| [49b313f27](https://github.com/angular/angular-cli/commit/49b313f27adef6300063c9d6817d1454a8657fe2) | fix  | add missing import for functional interceptor spec                   |
| [2f92fe7e5](https://github.com/angular/angular-cli/commit/2f92fe7e589705b282102271897454ea852c4814) | fix  | add missing semicolon in functional guard/resolver/interceptor       |
| [9b6d190f4](https://github.com/angular/angular-cli/commit/9b6d190f4a082c166d253b0f00162e0286238e45) | fix  | remove EnvironmentInjector import in functional guard spec           |
| [b11d3f644](https://github.com/angular/angular-cli/commit/b11d3f6442d38f609471ab19c08a1c9a871e0ae3) | fix  | use proper variable in functional guard spec                         |
| [451975f76](https://github.com/angular/angular-cli/commit/451975f7650041a83994e1308f85fe7e33a31e32) | fix  | use proper variable in resolver functional spec                      |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [c29df6954](https://github.com/angular/angular-cli/commit/c29df695467c41feccd3846a55c91c6784af87b2) | feat | add `assets` option to server builder                        |
| [839d0cb57](https://github.com/angular/angular-cli/commit/839d0cb57ad42896578c235354ffb918ea8bb146) | feat | implement stats-json option for esbuild builder              |
| [216991b9d](https://github.com/angular/angular-cli/commit/216991b9d9ca1d8f09992880a5fa92e7c98813fa) | feat | support inline component Sass styles with esbuild builder    |
| [7c87ce47c](https://github.com/angular/angular-cli/commit/7c87ce47c66a6426b6b7fbb2edd38d8da729221f) | fix  | ensure Sass load paths are resolved from workspace root      |
| [7a063238b](https://github.com/angular/angular-cli/commit/7a063238b83eea8b5b3237fed12db5528d1f6912) | fix  | explicitly send options to JS transformer workers            |
| [22cba7937](https://github.com/angular/angular-cli/commit/22cba79370ed60a27f932acda363ffd87f5d9983) | fix  | provide an option to `exclude` specs in Karma builder        |
| [20376649c](https://github.com/angular/angular-cli/commit/20376649c5e3003b0aa99b9328e2b61699ccba78) | fix  | transform async generator class methods for Zone.js support  |
| [0520608f6](https://github.com/angular/angular-cli/commit/0520608f68f1768a13a46fbdb9ecb65310492460) | fix  | use relative css resource paths in esbuild JSON stats        |
| [0c01532cb](https://github.com/angular/angular-cli/commit/0c01532cb5a3072b96cd65845a38b88ed4543de6) | perf | use worker pool for JavaScript transforms in esbuild builder |

### @angular-devkit/schematics

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [207358afb](https://github.com/angular/angular-cli/commit/207358afb89e6515cb8d73f5a3a63d9101e80d97) | feat | add `runSchematic` and `runExternalSchematic` methods |

## Special Thanks

Alan Agius, Andrew Scott, Charles Lyding, Cédric Exbrayat, Doug Parker, Felix Hamann, Jason Bedard, Joey Perrott and Kristiyan Kostadinov

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.0.5"></a>

# 15.0.5 (2023-01-06)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [c2030dec7](https://github.com/angular/angular-cli/commit/c2030dec7d9fecf42cca2de37cc3f7adaaa45e7f) | fix  | format esbuild error messages to include more information |

## Special Thanks

Alan Agius, Kristiyan Kostadinov, Paul Gschwendtner and aanchal

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.0.4"></a>

# 15.0.4 (2022-12-14)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                           |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| [ccc8e0350](https://github.com/angular/angular-cli/commit/ccc8e0350810d123269f55de29acd7964e663f7e) | fix  | display actionable error when a style does not exist in Karma builder |
| [507f756c3](https://github.com/angular/angular-cli/commit/507f756c34171db842365398150460e1e29f531a) | fix  | downlevel class private methods when targeting Safari <=v15           |
| [a0da91dba](https://github.com/angular/angular-cli/commit/a0da91dba3d9b4c4a86102668f52ab933406e5da) | fix  | include sources in generated                                          |
| [9fd356234](https://github.com/angular/angular-cli/commit/9fd356234210734ec5f44ae18f055308b7acc963) | fix  | only set ngDevMode when script optimizations are enabled              |
| [8e85f4728](https://github.com/angular/angular-cli/commit/8e85f47284472f9df49f2ca6c59057ad28240e9c) | fix  | update `css-loader` to `6.7.3`                                        |
| [b2d4415ca](https://github.com/angular/angular-cli/commit/b2d4415caa486bebe55e6147a153f120cf08b070) | fix  | update locale setting snippet to use `globalThis`.                    |

## Special Thanks

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.0.3"></a>

# 15.0.3 (2022-12-07)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [3d9971edb](https://github.com/angular/angular-cli/commit/3d9971edb05e9b8de24bafc1b4381cbf4bad8dbf) | fix  | default preserve symlinks to Node.js value for esbuild      |
| [24f4b51d2](https://github.com/angular/angular-cli/commit/24f4b51d22a0debc8ff853cf9040a15273654f7a) | fix  | downlevel class fields with Safari <= v15 for esbuild       |
| [45afc42db](https://github.com/angular/angular-cli/commit/45afc42db86e58357d1618d9984dcf03bffea957) | fix  | downlevel class properties when targeting Safari <=v15      |
| [e6461badf](https://github.com/angular/angular-cli/commit/e6461badf7959ff8b8d9a3824a4a081f44e0b237) | fix  | prevent optimization adding unsupported ECMASCript features |

## Special Thanks

Charles Lyding, Dominic Elm and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.0.2"></a>

# 15.0.2 (2022-11-30)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------ |
| [2891d5bc9](https://github.com/angular/angular-cli/commit/2891d5bc9eecf7fa8e3b80906d9c56e6a49f3d15) | fix  | correctly set Sass quietDeps and verbose options |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [d9cc4b028](https://github.com/angular/angular-cli/commit/d9cc4b0289eaf382782a994a15497e9526c5a4a2) | fix  | elide unused type references |

## Special Thanks

Alan Agius and Juuso Valkeejärvi

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.0.1"></a>

# 15.0.1 (2022-11-23)

### @angular/cli

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [eda96def4](https://github.com/angular/angular-cli/commit/eda96def48e11533cd0a3353c96b7eac9a881e1e) | fix  | use global version of the CLI when running `ng new` |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [48426852b](https://github.com/angular/angular-cli/commit/48426852b0c1d5541a3e7369dc2b343e33856968) | fix  | show warning when a TS Config is not found during migrations |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------- |
| [2af32fd3a](https://github.com/angular/angular-cli/commit/2af32fd3a981b1c29e1cf77b442982e1e07aae38) | fix  | hide loader paths in webpack warnings                               |
| [19f5cc746](https://github.com/angular/angular-cli/commit/19f5cc746ec724f15d1b89126c7c1b8a343818fe) | fix  | improve package deep import Sass index resolution in esbuild plugin |
| [2220a907d](https://github.com/angular/angular-cli/commit/2220a907daf9ccd9e22dfc8e5ddc259b9d495997) | fix  | use url function lexer to rebase Sass URLs                          |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Joey Perrott and Piotr Wysocki

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.0.0"></a>

# 15.0.0 (2022-11-16)

## Breaking Changes

### @angular/cli

- The Angular CLI no longer supports `16.10.x`, `16.11.x` and `16.12.x`. Current minimum versions of Node.js are `14.20.0`, `16.13.0` and `18.10.0`.
- Node.js versions older than 14.20 are no longer supported.
- The 'path' option in schematics schema no longer has a special meaning. Use 'workingDirectory' smart default provider should be used instead.

### @schematics/angular

- Removed unused `appDir` option from Universal and App-Shell schematic. This option can safely be removed if present since it no longer has effect.

###

- `analyticsSharing` option in the global angular configuration has been
  removed without replacement. This option was used to configure the Angular CLI to access to your own users' CLI usage data.

  If this option is used, it can be removed using `ng config --global cli.analyticsSharing undefined`.

- analytics APIs have been removed without replacement from `@angular-devkit/core` and `@angular-devkit/architect`.

### @angular-devkit/build-angular

- TypeScript versions older than 4.8.2 are no longer supported.
- The server builder `bundleDependencies` option has been removed. This option was used pre Ivy. Currently, using this option is unlikely to produce working server bundles.

  The `externalDependencies` option can be used instead to exclude specific node_module packages from the final bundle.

- - Deprecated support for tilde import has been removed. Please update the imports by removing the `~`.

  Before

  ```scss
  @import '~font-awesome/scss/font-awesome';
  ```

  After

  ```scss
  @import 'font-awesome/scss/font-awesome';
  ```

  - By default the CLI will use Sass modern API, While not recommended, users can still opt to use legacy API by setting `NG_BUILD_LEGACY_SASS=1`.

- Internally the Angular CLI now always set the TypeScript `target` to `ES2022` and `useDefineForClassFields` to `false` unless the target is set to `ES2022` or later in the TypeScript configuration. To control ECMA version and features use the Browerslist configuration.
- `require.context` are no longer parsed. Webpack specific features are not supported nor guaranteed to work in the future.
- Producing ES5 output is no longer possible. This was needed for Internet Explorer which is no longer supported. All browsers that Angular supports work with ES2015+
- server builder `bundleDependencies` option now only accept a boolean value.
- Deprecated support for Stylus has been removed. The Stylus package has never reached a stable version and its usage in the Angular CLI is minimal. It's recommended to migrate to another CSS preprocessor that the Angular CLI supports.

### @angular-devkit/core

- Workspace projects with missing `root` is now an error.

### @ngtools/webpack

- TypeScript versions older than 4.8.2 are no longer supported.

### @schematics/angular

| Commit                                                                                              | Type     | Description                                                        |
| --------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| [766d4a089](https://github.com/angular/angular-cli/commit/766d4a0895e7895211e93bc73ff131c6e47613a7) | feat     | add migration to remove require calls from karma builder main file |
| [d8bff4f1e](https://github.com/angular/angular-cli/commit/d8bff4f1e68a76da1983f9d0774f415e73dfd8c3) | feat     | Added --project-root option to the library schematics              |
| [597bfea1b](https://github.com/angular/angular-cli/commit/597bfea1b29cc7b25d1f466eb313cbeeb6dffc98) | feat     | drop `polyfills.ts` file from new templates                        |
| [1c21e470c](https://github.com/angular/angular-cli/commit/1c21e470c76d69d08e5096b46b952dbce330f7ef) | feat     | enable error on unknown properties and elements in tests           |
| [f2a0682dc](https://github.com/angular/angular-cli/commit/f2a0682dc82afa23a3d3481df59e4aaca5e90c78) | feat     | generate new projects using TypeScript 4.8.2                       |
| [b06421d15](https://github.com/angular/angular-cli/commit/b06421d15e4b5e6daffcb73ee1c2c8703b72cb47) | feat     | mark `projectRoot` as non hidden option in application schematic   |
| [b6897dbb0](https://github.com/angular/angular-cli/commit/b6897dbb0a1ef287644e117251c1c76cc8afcae0) | feat     | remove `karma.conf.js` from newly generated projects               |
| [301b5669a](https://github.com/angular/angular-cli/commit/301b5669a724261d53444d5172334966903078c0) | feat     | remove `ngOnInit` from component template                          |
| [9beb878e2](https://github.com/angular/angular-cli/commit/9beb878e2eecd32e499c8af557f22f46548248fc) | feat     | remove Browserslist configuration files from projects              |
| [283b564d1](https://github.com/angular/angular-cli/commit/283b564d1de985f0af8c2fcb6192801a90baacda) | feat     | remove environment files in new applications                       |
| [56a1e8f9f](https://github.com/angular/angular-cli/commit/56a1e8f9f52658488afb9d36007e96c96d08a03b) | feat     | remove test.ts file from new projects                              |
| [4e69e8050](https://github.com/angular/angular-cli/commit/4e69e80501dd2a9394b7df4518e0d6b0f2ebb7d9) | fix      | add `@angular/localize` as type when localize package is installed |
| [57d93fb7d](https://github.com/angular/angular-cli/commit/57d93fb7d979e68c2a4e6f6046ff633f69098afe) | fix      | mark project as required option                                    |
| [84e3f7727](https://github.com/angular/angular-cli/commit/84e3f7727dc1de31484704c7c06d51ff5392a34a) | fix      | remove empty lines                                                 |
| [316a50d75](https://github.com/angular/angular-cli/commit/316a50d75e45962ea3efe4108aa48d9479245dd5) | fix      | remove TypeScript target from universal schematic                  |
| [69b221498](https://github.com/angular/angular-cli/commit/69b2214987c8fad6efd091782cf28b20be62d244) | refactor | remove deprecated appDir option                                    |

### @angular/cli

| Commit                                                                                              | Type     | Description                                                                                                       |
| --------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| [4827d1b23](https://github.com/angular/angular-cli/commit/4827d1b23e564e4e4a8684c5e8ff035d8fa855a2) | feat     | add support for Node.js version 18                                                                                |
| [4b623461a](https://github.com/angular/angular-cli/commit/4b623461a4a938ba320b5e019f9c715d634a46c4) | feat     | drop support for Node.js versions older than 14.20                                                                |
| [3dea1fa71](https://github.com/angular/angular-cli/commit/3dea1fa7173e846aff5b0d15b919d9786bbf7198) | fix      | add unique user id as user parameter in GA                                                                        |
| [af07aa340](https://github.com/angular/angular-cli/commit/af07aa340a1c3c9f3d42446981be59a73effa498) | fix      | add workspace information as part of analytics collection                                                         |
| [83524f625](https://github.com/angular/angular-cli/commit/83524f62533f9a6bda0c1dbc76c6b16e730a7397) | fix      | allow `ng add` to find prerelease versions when CLI is prerelease                                                 |
| [22955f245](https://github.com/angular/angular-cli/commit/22955f24592df8044dbdeeb8e635beb1cc770c75) | fix      | do not collect analytics when running in non TTY mode                                                             |
| [35e5f4278](https://github.com/angular/angular-cli/commit/35e5f4278145b7ef55a75f1692c8e92d6bcd59db) | fix      | exclude `@angular/localize@<10.0.0` from ng add pa… ([#24152](https://github.com/angular/angular-cli/pull/24152)) |
| [1a584364e](https://github.com/angular/angular-cli/commit/1a584364e70cafd84770ef45f3da9ad58a46083f) | fix      | exclude `@angular/material@7.x` from ng add package discovery                                                     |
| [ff0382718](https://github.com/angular/angular-cli/commit/ff0382718af60923fe71f8b224d36a50449484e6) | fix      | respect registry in RC when running update through yarn                                                           |
| [774d349b7](https://github.com/angular/angular-cli/commit/774d349b73a436a99f2ea932b7509dab7c1d5e45) | refactor | remove deprecated path handler                                                                                    |

###

| Commit                                                                                              | Type     | Description                                  |
| --------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------- |
| [639a3071c](https://github.com/angular/angular-cli/commit/639a3071c3630c1ccdf7e3c015e81e9423ab2678) | refactor | migrate analytics collector to use GA4       |
| [c969152de](https://github.com/angular/angular-cli/commit/c969152de630a9afdef44ba2342e728b9353c8e7) | refactor | remove analytics API from core and architect |

### @angular-devkit/build-angular

| Commit                                                                                              | Type     | Description                                                                                  |
| --------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| [4ead45cab](https://github.com/angular/angular-cli/commit/4ead45caba08cb0b67dc7df2f6a9b304c75fff7d) | feat     | add `ng-server-context` when using app-shell builder                                         |
| [1c527a9da](https://github.com/angular/angular-cli/commit/1c527a9da5b55a8421ebca787fd322e879f6d29d) | feat     | add esbuild-based builder initial support for fileReplacements                               |
| [67324b3e5](https://github.com/angular/angular-cli/commit/67324b3e5861510b1df9641bb4b10bb67e3a2325) | feat     | add initial incremental code rebuilding to esbuild builder                                   |
| [3d94ca21b](https://github.com/angular/angular-cli/commit/3d94ca21bbb7496a2ff588166fd93c5f2339b823) | feat     | add initial watch support to esbuild-based builder                                           |
| [c592ec584](https://github.com/angular/angular-cli/commit/c592ec584f1c0b126a2045e5ea1b01cb1569ce4d) | feat     | amend `polyfills` option in all builders to support an array of module specifiers            |
| [a95d130ef](https://github.com/angular/angular-cli/commit/a95d130ef4249457ed2433d52eb43c94a1169782) | feat     | auto include `@angular/localize/init` when found in `types`                                  |
| [979bce45e](https://github.com/angular/angular-cli/commit/979bce45e63eda9ac5402869ef3dc4c63aaca3f1) | feat     | auto include `@angular/platform-server/init` during server builds                            |
| [fd4175357](https://github.com/angular/angular-cli/commit/fd41753579affa78328bfc4b6108db15ff5053f9) | feat     | drop support for TypeScript 4.6 and 4.7                                                      |
| [15d3fc6dc](https://github.com/angular/angular-cli/commit/15d3fc6dc3f74462818b3745f6fb4995212a4d22) | feat     | export `@angular/platform-server` symbols in server bundle                                   |
| [05a98c029](https://github.com/angular/angular-cli/commit/05a98c02924f656be3257d5f459ae88c1ae29fba) | feat     | karma builder `main` option is now optional                                                  |
| [2b6029245](https://github.com/angular/angular-cli/commit/2b602924538bf987e92f806c25c2a3d008a3f0a9) | feat     | providing a karma config is now optional                                                     |
| [9c13fce16](https://github.com/angular/angular-cli/commit/9c13fce162eff8d01d1fa6a7f0e0029da2887c86) | feat     | remove `bundleDependencies` from server builder                                              |
| [308e3a017](https://github.com/angular/angular-cli/commit/308e3a017f876bfc727e68803bfbce11e9d3396e) | feat     | switch to use Sass modern API                                                                |
| [1e5d4a750](https://github.com/angular/angular-cli/commit/1e5d4a75084dfd2aeebb6a0c0b3039417e14bc84) | feat     | use Browserslist to determine ECMA output                                                    |
| [3ff391738](https://github.com/angular/angular-cli/commit/3ff39173808f2beed97ee5deb91be541205f9a03) | fix      | account for package.json exports fields with CSS import statements                           |
| [001445982](https://github.com/angular/angular-cli/commit/0014459820dc1c127e93993414c154947a7f8da6) | fix      | account for package.json exports with Sass in esbuild builder                                |
| [6280741ce](https://github.com/angular/angular-cli/commit/6280741ce4a89882595c834f48a45cca6f9534e0) | fix      | add `@angular/platform-server` as an optional peer dependency                                |
| [f9a2c3a12](https://github.com/angular/angular-cli/commit/f9a2c3a1216cf9510e122df44a64ddd11d47226b) | fix      | allow both script and module sourceTypes to be localized                                     |
| [4cb27b803](https://github.com/angular/angular-cli/commit/4cb27b8031d0f36e687c5116538ebe473acaa149) | fix      | avoid attempted resolve of external CSS URLs with esbuild builder                            |
| [192e0e6d7](https://github.com/angular/angular-cli/commit/192e0e6d77d4f0f20af3f88b653c5196a2c1e052) | fix      | correct escaping of target warning text in esbuild builder                                   |
| [4fcb0a82b](https://github.com/angular/angular-cli/commit/4fcb0a82b5fa8a092d8c374cdea448edd80270d4) | fix      | correctly resolve Sass partial files in node packages                                        |
| [fb5a66ae6](https://github.com/angular/angular-cli/commit/fb5a66ae66b595602d2a8aea8e938efe5df6d13c) | fix      | fix crash when Sass error occurs                                                             |
| [b6df9c136](https://github.com/angular/angular-cli/commit/b6df9c1367ae5795a3895628ec9822d432b315bb) | fix      | handle conditional exports in `scripts` and `styles` option                                  |
| [0ee7625d6](https://github.com/angular/angular-cli/commit/0ee7625d6b4bd84be6fca0df82f3e74e4b94728c) | fix      | ignore cache path when watching with esbuild builder                                         |
| [e34bfe5eb](https://github.com/angular/angular-cli/commit/e34bfe5eb1a559cbf53449ce213503e32fa27ae4) | fix      | ignore specs in node_modules when finding specs                                              |
| [f143171fd](https://github.com/angular/angular-cli/commit/f143171fd030fa1cc8df84ed5f0b96f5ad0f9e10) | fix      | only add `@angular/platform-server/init` when package is installed.                          |
| [3a1970b76](https://github.com/angular/angular-cli/commit/3a1970b76e4da7424e2661664a1e9e669bd279b4) | fix      | only import karma when running karma builder                                                 |
| [8b84c18ed](https://github.com/angular/angular-cli/commit/8b84c18edd01e91c7ebf4327dde8ce60f7f700ca) | fix      | provide workaround for V8 object spread performance defect                                   |
| [7dd122ad5](https://github.com/angular/angular-cli/commit/7dd122ad5f34a488f3784326b579b8a93511af7e) | fix      | rebase Sass url() values when using esbuild-based builder                                    |
| [2105964af](https://github.com/angular/angular-cli/commit/2105964afc0285cc40c16d32c47d1eb60be5e279) | fix      | resolve transitive dependencies in Sass when using Yarn PNP                                  |
| [54e1c01d8](https://github.com/angular/angular-cli/commit/54e1c01d8b608ff240f7559ca176cd50e991952c) | fix      | show file replacement in TS missing file error in esbuild builder                            |
| [6c3f281d9](https://github.com/angular/angular-cli/commit/6c3f281d927c9ae2d4ec76ff9f920752e2cb73d1) | fix      | show warning when using TypeScript target older then ES2022 in esbuild builder               |
| [8f8e02c32](https://github.com/angular/angular-cli/commit/8f8e02c3221c9477ec931bb6983daf6a2c8dc8be) | fix      | support Yarn PNP resolution in modern SASS API                                               |
| [fc82e3bec](https://github.com/angular/angular-cli/commit/fc82e3bec3f188d449e952d9955b845b2efdcd6b) | fix      | update browerslist package                                                                   |
| [0d62157a3](https://github.com/angular/angular-cli/commit/0d62157a30a246c1e00273c2300b9251574e75ae) | fix      | update sourcemaps when rebasing Sass url() functions in esbuild builder                      |
| [1518133db](https://github.com/angular/angular-cli/commit/1518133db3b1c710500786f9f1fcfa05a016862e) | fix      | use relative sourcemap source paths for Sass in esbuild builder                              |
| [fb4ead2ce](https://github.com/angular/angular-cli/commit/fb4ead2ce0de824eef46ce8e27a8f6cc1d08c744) | fix      | wait during file watching to improve multi-save rebuilds for esbuild builder                 |
| [b059fc735](https://github.com/angular/angular-cli/commit/b059fc73597c12330a96fca5f6ab9b1ca226136c) | fix      | warn when components styles sourcemaps are not generated when styles optimization is enabled |
| [9d0872fb5](https://github.com/angular/angular-cli/commit/9d0872fb5e369f714633387d9ae39c4242ba1ea1) | perf     | add initial global styles incremental rebuilds with esbuild builder                          |
| [0fe6b3b75](https://github.com/angular/angular-cli/commit/0fe6b3b75b87f6f8050b196615e1c1543b707841) | perf     | add vendor chunking to server builder                                                        |
| [8c915d414](https://github.com/angular/angular-cli/commit/8c915d41496c99fb42ae3992d9c91de542260bf2) | perf     | avoid extra babel file reads in esbuild builder rebuilds                                     |
| [919fe2148](https://github.com/angular/angular-cli/commit/919fe2148885c44655ce36085768b1eab2c8c246) | perf     | avoid extra TypeScript emits with esbuild rebuilds                                           |
| [92145c4a7](https://github.com/angular/angular-cli/commit/92145c4a7d2c835b703319676bafd8ea3b4a19f0) | perf     | avoid template diagnostics for declaration files in esbuild builder                          |
| [52db3c000](https://github.com/angular/angular-cli/commit/52db3c00076dfe118cd39d7724229210c30665e0) | perf     | minimize Angular diagnostics incremental analysis in esbuild-based builder                   |
| [feb06753d](https://github.com/angular/angular-cli/commit/feb06753d59f782c6ad8fd59a60537863094f498) | perf     | use esbuild-based builder to directly downlevel for await...of                               |
| [9d83fb91b](https://github.com/angular/angular-cli/commit/9d83fb91b654eed79a5c9c9691d0f1c094f37771) | perf     | use Sass worker pool for Sass support in esbuild builder                                     |
| [45a94228f](https://github.com/angular/angular-cli/commit/45a94228fb23acbd0d1a9329448f07b759c8654b) | perf     | use Uint8Arrays for incremental caching with esbuild-based builder                           |
| [f393b0928](https://github.com/angular/angular-cli/commit/f393b09282582da47db683344e037fd1434b32a8) | refactor | disable `requireContext` parsing                                                             |
| [12931ba8c](https://github.com/angular/angular-cli/commit/12931ba8c3772b1dd65846cbd6146804b08eab31) | refactor | remove deprecated ES5 support                                                                |
| [7f1017e60](https://github.com/angular/angular-cli/commit/7f1017e60f82389568065478d666ae4be6ebfea2) | refactor | remove old `bundleDependencies` enum logic                                                   |
| [2ba44a433](https://github.com/angular/angular-cli/commit/2ba44a433c827413a53d12de0ef203f8988ddc2a) | refactor | remove support for Stylus                                                                    |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [ea4c0aa2e](https://github.com/angular/angular-cli/commit/ea4c0aa2e84d48be37b75e37c99ad381122297c3) | fix  | throw error when project has missing root property |
| [de467f46d](https://github.com/angular/angular-cli/commit/de467f46de63059f9c701dfe8695513c742f22b5) | fix  | update logger `forEach` `promiseCtor` type         |

### @angular-devkit/schematics

| Commit                                                                                              | Type     | Description                                                        |
| --------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| [9b07b469b](https://github.com/angular/angular-cli/commit/9b07b469b622e083a9915ed3c24e1d53d8abf38f) | refactor | remove `UpdateBuffer` and rename `UpdateBuffer2` to `UpdateBuffer` |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                                                |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------- |
| [43bd0abc1](https://github.com/angular/angular-cli/commit/43bd0abc147cf3177e707624bf6163b3dc9e06f8) | feat | drop support for TypeScript 4.6 and 4.7                                    |
| [1c1f985b9](https://github.com/angular/angular-cli/commit/1c1f985b9c9913f28915f101ee1717c0da540362) | fix  | support inline style sourcemaps when using css-loader for component styles |

## Special Thanks

Alan Agius, Brent Schmidt, Charles Lyding, Cédric Exbrayat, Dariusz Ostolski, Doug Parker, Günhan Gülsoy, Jason Bedard, Lukas Spirig, Ruslan Lekhman, angular-robot[bot] and minijus

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.10"></a>

# 14.2.10 (2022-11-17)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------- |
| [9ce386caf](https://github.com/angular/angular-cli/commit/9ce386caf6037f21f422a785fec977634406d208) | fix  | exclude `@angular/localize@<10.0.0` from ng add pa… ([#24152](https://github.com/angular/angular-cli/pull/24152)) |
| [6446091a3](https://github.com/angular/angular-cli/commit/6446091a310f327ceeb68ae85f3673f6e3e83286) | fix  | exclude `@angular/material@7.x` from ng add package discovery                                                     |
| [7541e04f3](https://github.com/angular/angular-cli/commit/7541e04f36ff32118e93588be38dcbb5cc2c92a9) | fix  | respect registry in RC when running update through yarn                                                           |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                      |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------- |
| [21cea0b42](https://github.com/angular/angular-cli/commit/21cea0b42f08bf56990bdade82e2daa7c33011ed) | fix  | update `loader-utils` to `3.2.1` |

## Special Thanks

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.10"></a>

# 13.3.10 (2022-11-17)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                      |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------- |
| [f298ebbd5](https://github.com/angular/angular-cli/commit/f298ebbd5f86077985d994662314379df92b6771) | fix  | update `loader-utils` to `3.2.1` |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.9"></a>

# 14.2.9 (2022-11-09)

### @angular-devkit/architect

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [e3e787767](https://github.com/angular/angular-cli/commit/e3e78776782da9d933f7b0e4c6bf391a62585bee) | fix  | default to failure if no builder result is provided |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [12b2dc5a2](https://github.com/angular/angular-cli/commit/12b2dc5a2374f992df151af32cc80e2c2d7c4dee) | fix  | isolate zone.js usage when rendering server bundles |

## Special Thanks

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.8"></a>

# 14.2.8 (2022-11-02)

### @schematics/angular

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [4b0ee8ad1](https://github.com/angular/angular-cli/commit/4b0ee8ad15efcb513ab5d9e38bf9b1e08857e798) | fix  | guard schematics should include all guards (CanMatch) |

## Special Thanks

Andrew Scott

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.7"></a>

# 14.2.7 (2022-10-26)

### @angular/cli

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [91b5bcbb3](https://github.com/angular/angular-cli/commit/91b5bcbb31715a3c2e183e264ebd5ec1188d5437) | fix  | disable version check during auto completion              |
| [02a3d7b71](https://github.com/angular/angular-cli/commit/02a3d7b715f4069650389ba26a3601747e67d9c2) | fix  | skip node.js compatibility checks when running completion |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [bebed9df8](https://github.com/angular/angular-cli/commit/bebed9df834d01f72753aa0e60dc104f1781bd67) | fix  | issue dev-server support warning when using esbuild builder |

## Special Thanks

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.6"></a>

# 14.2.6 (2022-10-12)

### @angular/cli

| Commit                                                                                              | Type | Description                                                              |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------ |
| [1c9cf594f](https://github.com/angular/angular-cli/commit/1c9cf594f7a855ea4b462fad53acd3bf3a2e7622) | fix  | handle missing `which` binary in path                                    |
| [28b2cd18e](https://github.com/angular/angular-cli/commit/28b2cd18e3c490cf2db64d4a6744bbd26c0aeabb) | fix  | skip downloading temp CLI when running `ng update` without package names |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------- |
| [ad6928184](https://github.com/angular/angular-cli/commit/ad692818413a97afe54aee6a39f0447ee9239343) | fix  | project extension warning message should identify concerned project |

## Special Thanks

AgentEnder and Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.5"></a>

# 14.2.5 (2022-10-05)

### @angular-devkit/schematics

| Commit                                                                                              | Type | Description                                                    |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| [17eb20c77](https://github.com/angular/angular-cli/commit/17eb20c77098841d45f0444f5f047c4d44fc614f) | fix  | throw more relevant error when Rule returns invalid null value |

## Special Thanks

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.4"></a>

# 14.2.4 (2022-09-28)

### @angular/cli

| Commit                                                                                              | Type | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| [05b18f4e4](https://github.com/angular/angular-cli/commit/05b18f4e4b39d73c8a3532507c4b7bba8722bf80) | fix  | add builders and schematic names as page titles in collected analytics |

## Special Thanks

Alan Agius, Jason Bedard and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.3"></a>

# 14.2.3 (2022-09-15)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [e7e0cb78f](https://github.com/angular/angular-cli/commit/e7e0cb78f4c6d684fdf25e23a11599b82807cd25) | fix  | correctly display error messages that contain "at" text. |
| [4756d7e06](https://github.com/angular/angular-cli/commit/4756d7e0675aa9a8bed11b830b66288141fa6e16) | fix  | watch symbolic links                                     |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------- |
| [1e3ecbdb1](https://github.com/angular/angular-cli/commit/1e3ecbdb138861eff550e05d9662a10d106c0990) | perf | avoid bootstrap conversion AST traversal where possible |

## Special Thanks

Alan Agius, Charles Lyding, Jason Bedard and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.2"></a>

# 14.2.2 (2022-09-08)

### @angular/cli

| Commit                                                                                              | Type | Description                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------- |
| [5405a9b3b](https://github.com/angular/angular-cli/commit/5405a9b3b56675dc671e1ef27410e632f3f6f536) | fix  | favor non deprecated packages during update |

### @schematics/angular

| Commit                                                                                              | Type | Description                            |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------- |
| [6bfd6a7fb](https://github.com/angular/angular-cli/commit/6bfd6a7fbcaf433bd2c380087803044df4c6d8ee) | fix  | update minimum Angular version to 14.2 |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [2b00bca61](https://github.com/angular/angular-cli/commit/2b00bca615a2c79b0a0311c83cb9f1450b6f1745) | fix  | allow esbuild-based builder to use SVG Angular templates  |
| [45c95e1bf](https://github.com/angular/angular-cli/commit/45c95e1bf1327532ceeb1277fa6f4ce7c3a45581) | fix  | change service worker errors to compilation errors        |
| [ecc014d66](https://github.com/angular/angular-cli/commit/ecc014d669efe9609177354c465f24a1c94279cd) | fix  | handle service-worker serving with localize in dev-server |
| [39ea128c1](https://github.com/angular/angular-cli/commit/39ea128c1294046525a8c098ed6a776407990365) | fix  | handling of `@media` queries inside css layers            |
| [17b7e1bdf](https://github.com/angular/angular-cli/commit/17b7e1bdfce5823718d1fa915d25858f4b0d7110) | fix  | issue warning when using deprecated tilde imports         |
| [3afd784f1](https://github.com/angular/angular-cli/commit/3afd784f1f00ee07f68ba112bea7786ccb2d4f35) | fix  | watch index file when running build in watch mode         |

## Special Thanks

Alan Agius, Charles Lyding, Jason Bedard and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.1"></a>

# 14.2.1 (2022-08-26)

### @schematics/angular

| Commit                                                                                              | Type | Description                            |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------- |
| [e4ca46866](https://github.com/angular/angular-cli/commit/e4ca4686627bd31604cf68bc1d2473337e26864c) | fix  | update ng-packagr version to `^14.2.0` |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.0"></a>

# 14.2.0 (2022-08-25)

### @angular/cli

| Commit                                                                                              | Type | Description                                    |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| [596037010](https://github.com/angular/angular-cli/commit/596037010a8113809657cebc9385d040922e6d86) | fix  | add missing space after period in warning text |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| [44c25511e](https://github.com/angular/angular-cli/commit/44c25511ea2adbd4fbe82a6122fc00af612be8e8) | feat | add ability to serve service worker when using dev-server         |
| [3fb569b5c](https://github.com/angular/angular-cli/commit/3fb569b5c82f22afca4dc59313356f198755827e) | feat | switch to Sass modern API in esbuild builder                      |
| [5bd03353a](https://github.com/angular/angular-cli/commit/5bd03353ac6bb19c983efb7ff015e7aec3ff61d1) | fix  | correct esbuild builder global stylesheet sourcemap URL           |
| [c4402b1bd](https://github.com/angular/angular-cli/commit/c4402b1bd32cdb0cdd7aeab14239b57ee700d361) | fix  | correctly handle parenthesis in url                               |
| [50c783307](https://github.com/angular/angular-cli/commit/50c783307eb1253f4f2a87502bd7a19f6a409aeb) | fix  | use valid CSS comment for sourcemaps with Sass in esbuild builder |
| [4c251853f](https://github.com/angular/angular-cli/commit/4c251853fbc66c6c9aae171dc75612db31afe2fb) | perf | avoid extra string creation with no sourcemaps for esbuild sass   |
| [d97640534](https://github.com/angular/angular-cli/commit/d9764053478620a5f4a3349c377c74415435bcbb) | perf | with esbuild builder only load Sass compiler when needed          |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Jason Bedard, Joey Perrott, Kristiyan Kostadinov and angular-robot[bot]

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.1.3"></a>

# 14.1.3 (2022-08-17)

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                                |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| [365035cb3](https://github.com/angular/angular-cli/commit/365035cb37c57e07cb96e45a38f266b16b4e2fbf) | fix  | update workspace extension warning to use correct phrasing |

## Special Thanks

AgentEnder, Alan Agius, Charles Lyding and Jason Bedard

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.1.2"></a>

# 14.1.2 (2022-08-10)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| [3e19c842c](https://github.com/angular/angular-cli/commit/3e19c842cc2a7f2dc62904f5f88025a4687d378a) | fix  | avoid collect stats from chunks with no files                             |
| [d0a0c597c](https://github.com/angular/angular-cli/commit/d0a0c597cd09b1ce4d7134d3e330982b522f28a9) | fix  | correctly handle data URIs with escaped quotes in stylesheets             |
| [67b3a086f](https://github.com/angular/angular-cli/commit/67b3a086fe90d1b7e5443e8a9f29b12367dd07e7) | fix  | process stylesheet resources from url tokens with esbuild browser builder |
| [e6c45c316](https://github.com/angular/angular-cli/commit/e6c45c316ebcd1b5a16b410a3743088e9e9f789c) | perf | reduce babel transformation in esbuild builder                            |
| [38b71bcc0](https://github.com/angular/angular-cli/commit/38b71bcc0ddca1a34a5a4480ecd0b170bd1e9620) | perf | use esbuild in esbuild builder to downlevel native async/await            |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------- |
| [dd47a5e8c](https://github.com/angular/angular-cli/commit/dd47a5e8c543cbd3bb37afe5040a72531b028347) | fix  | elide type only named imports when using `emitDecoratorMetadata` |

## Special Thanks

Alan Agius, Charles Lyding and Jason Bedard

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.1.1"></a>

# 14.1.1 (2022-08-03)

### @angular/cli

| Commit                                                                                              | Type | Description                                    |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| [4ee825bac](https://github.com/angular/angular-cli/commit/4ee825baca21c21db844bdf718b6ec29dc6c3d42) | fix  | catch clause variable is not an Error instance |

### @schematics/angular

| Commit                                                                                              | Type | Description                      |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------- |
| [83dcfb32f](https://github.com/angular/angular-cli/commit/83dcfb32f8ef3334f83bb36a2c3097fe9f8a4e4b) | fix  | prevent numbers from class names |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------- |
| [ef6da4aad](https://github.com/angular/angular-cli/commit/ef6da4aad76ff534d4edb9e73c2d56c53b649b15) | fix  | allow the esbuild-based builder to fully resolve global stylesheet packages |
| [eed54b359](https://github.com/angular/angular-cli/commit/eed54b359d2b514156242529ee8a25b51c50dae0) | fix  | catch clause variable is not an Error instance                              |
| [c98471094](https://github.com/angular/angular-cli/commit/c9847109438d33d38a31ded20a1cab2721fc1fbd) | fix  | correctly respond to preflight requests                                     |
| [94b444e4c](https://github.com/angular/angular-cli/commit/94b444e4caff4c3092e0291d9109e2abed966656) | fix  | correctly set `ngDevMode` in esbuilder                                      |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| [44c18082a](https://github.com/angular/angular-cli/commit/44c18082a5963b7f9d0f1577a0975b2f35abe6a2) | fix  | `classify` string util should concat string without using a `.` |

### @angular/create

| Commit                                                                                              | Type | Description                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------- |
| [cb0d3fb33](https://github.com/angular/angular-cli/commit/cb0d3fb33f196393761924731c3c3786a3a3493b) | fix  | use appropriate package manager to install dependencies |

## Special Thanks

Alan Agius, Charles Lyding, Jason Bedard and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.1.0"></a>

# 14.1.0 (2022-07-20)

### @angular/cli

| Commit                                                                                              | Type | Description                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------- |
| [3884b8652](https://github.com/angular/angular-cli/commit/3884b865262c1ffa5652ac0f4d67bbf59087f453) | fix  | add esbuild browser builder to workspace schema |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| [707911d42](https://github.com/angular/angular-cli/commit/707911d423873623d4201d2fbce4a294ab73a135) | feat | support controlling `addDependency` utility rule install behavior |
| [a8fe4fcc3](https://github.com/angular/angular-cli/commit/a8fe4fcc315fd408b5b530a44a02c1655b5450a8) | fix  | Allow skipping existing dependencies in E2E schematic             |
| [b8bf3b480](https://github.com/angular/angular-cli/commit/b8bf3b480bef752641370e542ebb5aee649a8ac6) | fix  | only issue a warning for addDependency existing specifier         |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                        |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| [a7709b718](https://github.com/angular/angular-cli/commit/a7709b718c953d83f3bde00fa3bf896501359946) | feat | add `externalDependencies` to the esbuild browser builder          |
| [248860ad6](https://github.com/angular/angular-cli/commit/248860ad674b54f750bb5c197588bb6d031be208) | feat | add Sass file support to experimental esbuild-based builder        |
| [b06ae5514](https://github.com/angular/angular-cli/commit/b06ae55140c01f8b5107527fd0af1da3b04a721f) | feat | add service worker support to experimental esbuild builder         |
| [b5f6d862b](https://github.com/angular/angular-cli/commit/b5f6d862b95afd0ec42d9b3968e963f59b1b1658) | feat | Identify third-party sources in sourcemaps                         |
| [b3a14d056](https://github.com/angular/angular-cli/commit/b3a14d05629ba6e3b23c09b1bfdbc4b35d534813) | fix  | allow third-party sourcemaps to be ignored in esbuild builder      |
| [53dd929e5](https://github.com/angular/angular-cli/commit/53dd929e59f98a7088d150e861d18e97e6de4114) | fix  | ensure esbuild builder sourcemap sources are relative to workspace |

### @angular-devkit/schematics

| Commit                                                                                              | Type | Description                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------- |
| [526cdb263](https://github.com/angular/angular-cli/commit/526cdb263a8c74ad228f584f70dc029aa69351d7) | feat | allow `chain` rule to accept iterables of rules |

### @angular/create

| Commit                                                                                              | Type | Description                                  |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------- |
| [cfe93fbc8](https://github.com/angular/angular-cli/commit/cfe93fbc89fad2f58826f0118ce7ff421cd0e4f2) | feat | add support for `yarn create` and `npm init` |

## Special Thanks

Alan Agius, Charles Lyding, Derek Cormier, Doug Parker, Jason Bedard, Joey Perrott, Paul Gschwendtner, Victor Porof and renovate[bot]

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.7"></a>

# 14.0.7 (2022-07-20)

### @schematics/angular

| Commit                                                                                              | Type | Description                         |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------- |
| [f653bf4fb](https://github.com/angular/angular-cli/commit/f653bf4fbb69b9e0fa0e6440a88a30f17566d9a3) | fix  | incorrect logo for Angular Material |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| [5810c2cc2](https://github.com/angular/angular-cli/commit/5810c2cc2dd21e5922a5eaa330e854e4327a0500) | fix  | fallback to use projectRoot when sourceRoot is missing during coverage |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                         |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------- |
| [2ba4678b6](https://github.com/angular/angular-cli/commit/2ba4678b6ba2164e80cb661758565c133e08afaa) | fix  | add i18n as valid project extension |
| [c2201c835](https://github.com/angular/angular-cli/commit/c2201c835801ef9c1cc6cacec2748c8ca341519d) | fix  | log name of invalid extension too   |

## Special Thanks

Alan Agius, Fortunato Ventre, Katerina Skroumpelou and Kristiyan Kostadinov

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.9"></a>

# 13.3.9 (2022-07-20)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                             |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------- |
| [0d62716ae](https://github.com/angular/angular-cli/commit/0d62716ae3753bb463de6b176ae07520ebb24fc9) | fix  | update terser to address CVE-2022-25858 |

## Special Thanks

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.6"></a>

# 14.0.6 (2022-07-13)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| [178550529](https://github.com/angular/angular-cli/commit/1785505290940dad2ef9a62d4725e0d1b4b486d4) | fix  | handle cases when completion is enabled and running in an older CLI workspace |
| [10f24498e](https://github.com/angular/angular-cli/commit/10f24498ec2938487ae80d6ecea584e20b01dcbe) | fix  | remove deprecation warning of `no` prefixed schema options                    |

### @schematics/angular

| Commit                                                                                              | Type | Description                       |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------- |
| [dfa6d73c5](https://github.com/angular/angular-cli/commit/dfa6d73c5c45d3c3276fb1fecfb6535362d180c5) | fix  | remove browserslist configuration |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------- |
| [4d848c4e6](https://github.com/angular/angular-cli/commit/4d848c4e6f6944f32b9ecb2cf2db5c544b3894fe) | fix  | generate different content hashes for scripts which are changed during the optimization phase |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------- |
| [2500f34a4](https://github.com/angular/angular-cli/commit/2500f34a401c2ffb03b1dfa41299d91ddebe787e) | fix  | provide actionable warning when a workspace project has missing `root` property |

## Special Thanks

Alan Agius and martinfrancois

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.5"></a>

# 14.0.5 (2022-07-06)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| [98a6aad60](https://github.com/angular/angular-cli/commit/98a6aad60276960bd6bcecda73172480e4bdec48) | fix  | during an update only use package manager force option with npm 7+                   |
| [094aa16aa](https://github.com/angular/angular-cli/commit/094aa16aaf5b148f2ca94cae45e18dbdeaacad9d) | fix  | improve error message for project-specific ng commands when run outside of a project |
| [e5e07fff1](https://github.com/angular/angular-cli/commit/e5e07fff1919c46c15d6ce61355e0c63007b7d55) | fix  | show deprecated workspace config options in IDE                                      |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [f9f970cab](https://github.com/angular/angular-cli/commit/f9f970cab515a8a1b1fbb56830b03250dd5cccce) | fix  | prevent importing `RouterModule` parallel to `RoutingModule` |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------- |
| [aa8ed532f](https://github.com/angular/angular-cli/commit/aa8ed532f816f2fa23b1fe443a216c5d75507432) | fix  | disable glob mounting for patterns that start with a forward slash  |
| [c76edb8a7](https://github.com/angular/angular-cli/commit/c76edb8a79d1a12376c2a163287251c06e1f0222) | fix  | don't override base-href in HTML when it's not set in builder       |
| [f64903528](https://github.com/angular/angular-cli/commit/f649035286d640660c3bc808b7297fb60d0888bc) | fix  | improve detection of CommonJS dependencies                          |
| [74dbd5fc2](https://github.com/angular/angular-cli/commit/74dbd5fc273aece097b2b3ee0b28607d24479d8c) | fix  | support hidden component stylesheet sourcemaps with esbuild builder |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [7aed97561](https://github.com/angular/angular-cli/commit/7aed97561c2320f92f8af584cc9852d4c8d818b9) | fix  | do not run ngcc when `node_modules` does not exist |

## Special Thanks

Alan Agius, Charles Lyding, JoostK and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.4"></a>

# 14.0.4 (2022-06-29)

### @angular/cli

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [fc72c625b](https://github.com/angular/angular-cli/commit/fc72c625bb7db7b9c8d865086bcff05e2db426ee) | fix  | correctly handle `--collection` option in `ng new` |
| [f5badf221](https://github.com/angular/angular-cli/commit/f5badf221d2a2f5357f93bf0e32146669f8bbede) | fix  | improve global schema validation                   |
| [ed302ea4c](https://github.com/angular/angular-cli/commit/ed302ea4c80b4f6fe8a73c5a0d25055a7dca1db2) | fix  | remove color from help epilogue                    |

### @schematics/angular

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [c58c66c0d](https://github.com/angular/angular-cli/commit/c58c66c0d5c76630453151b65b1a1c3707c82e9f) | fix  | use `sourceRoot` instead of `src` in universal schematic |

### @angular-devkit/architect

| Commit                                                                                              | Type | Description                                        |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| [88acec1fd](https://github.com/angular/angular-cli/commit/88acec1fd302d7d8a053e37ed0334ec6a30c952c) | fix  | complete builders on the next event loop iteration |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| [694b73dfa](https://github.com/angular/angular-cli/commit/694b73dfa12e5aefff8fc5fdecf220833ac40b42) | fix  | exit dev-server when CTRL+C is pressed                                 |
| [6d4782199](https://github.com/angular/angular-cli/commit/6d4782199c4a4e92a9c0b189d6a7857ca631dd3f) | fix  | exit localized builds when CTRL+C is pressed                           |
| [282baffed](https://github.com/angular/angular-cli/commit/282baffed507926e806db673b6804b9299c383af) | fix  | hide stacktraces from webpack errors                                   |
| [c4b0abf5b](https://github.com/angular/angular-cli/commit/c4b0abf5b8c1e392ead84c8810e8d6e615fd0024) | fix  | set base-href in service worker manifest when using i18n and app-shell |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [33f1cc192](https://github.com/angular/angular-cli/commit/33f1cc192d963b4a4348bb41b8fb0969ffd5c342) | fix  | restore process title after NGCC is executed           |
| [6796998bf](https://github.com/angular/angular-cli/commit/6796998bf4dd829f9ac085a52ce7e9d2cda73fd1) | fix  | show a compilation error on invalid TypeScript version |

## Special Thanks

Alan Agius, Charles Lyding and Tim Bowersox

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.3"></a>

# 14.0.3 (2022-06-23)

### @angular/cli

| Commit                                                                                              | Type | Description                                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| [b3db91baf](https://github.com/angular/angular-cli/commit/b3db91baf50c92589549a66ffef437f7890d3de7) | fix  | disable version check when running `ng completion` commands            |
| [cdab9fa74](https://github.com/angular/angular-cli/commit/cdab9fa7431db7e2a75e04e776555b8e5e15fc94) | fix  | provide an actionable error when using `--configuration` with `ng run` |
| [5521648e3](https://github.com/angular/angular-cli/commit/5521648e33af634285f6352b43a324a1ee023e27) | fix  | temporarily handle boolean options in schema prefixed with `no`        |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [5e960ce24](https://github.com/angular/angular-cli/commit/5e960ce246e7090f57ce22723911a743aa8fcb0c) | fix  | fix incorrect glob cwd in karma when using `--include` option |
| [1b5e92075](https://github.com/angular/angular-cli/commit/1b5e92075e64563459942d4de785f1a8bef46ec7) | fix  | handle `codeCoverageExclude` correctly in Windows             |
| [ff6d81a45](https://github.com/angular/angular-cli/commit/ff6d81a4539657446c8f5770cefe688d2d578450) | fix  | ignore supported browsers during i18n extraction              |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [170c16f2e](https://github.com/angular/angular-cli/commit/170c16f2ea769e76a48f1ac215ee88ba47ff511d) | fix  | workspace writer skip creating empty projects property |

## Special Thanks

Alan Agius, Charles Lyding and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.2"></a>

# 14.0.2 (2022-06-15)

### @angular/cli

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [23095e9c3](https://github.com/angular/angular-cli/commit/23095e9c3fc514c7e9a892833d8a18270da5bd95) | fix  | show more actionable error when command is ran in wrong scope |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [5a486cb64](https://github.com/angular/angular-cli/commit/5a486cb64253ba2829160a6f1fa3bf0e381d45ea) | fix  | remove vscode testing configurations for `minimal` workspaces |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                         |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------- |
| [9d88c96d8](https://github.com/angular/angular-cli/commit/9d88c96d898c5c46575a910a7230d239f4fe7a77) | fix  | replace fallback locale for `en-US` |

## Special Thanks

Alan Agius and Julien Marcou

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.8"></a>

# 13.3.8 (2022-06-15)

### @angular/pwa

| Commit                                                                                              | Type | Description                        |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------- |
| [c7f994f88](https://github.com/angular/angular-cli/commit/c7f994f88a396be96c01da1017a15083d5f544fb) | fix  | add peer dependency on Angular CLI |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.1"></a>

# 14.0.1 (2022-06-08)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| [e4fb96657](https://github.com/angular/angular-cli/commit/e4fb96657f044d97562008b5b3c6f3a55ac8ba3a) | fix  | add text to help output to indicate that additional commands are available when ran in different context |
| [7952e5790](https://github.com/angular/angular-cli/commit/7952e579066f7191f4b82a10816c6a41a4ea5644) | fix  | avoid creating unnecessary global configuration                                                          |
| [66a1d6b9d](https://github.com/angular/angular-cli/commit/66a1d6b9d2e1fba3d5ee88a6c5d81206f530ce3a) | fix  | correct scope cache command                                                                              |
| [e2d964289](https://github.com/angular/angular-cli/commit/e2d964289fe2a418e5f4e421249e2f8da64185cc) | fix  | correctly print package manager name when an install is needed                                           |
| [75fd3330d](https://github.com/angular/angular-cli/commit/75fd3330d4c27263522ea931eb1545ce0a34ab6a) | fix  | during an update only use package manager force option with npm 7+                                       |
| [e223890c1](https://github.com/angular/angular-cli/commit/e223890c1235b4564ec15eb99d71256791a21c3c) | fix  | ensure full process exit with older local CLI versions                                                   |
| [0cca3638a](https://github.com/angular/angular-cli/commit/0cca3638adb46cd5d0c18b823c83d4b604d7c798) | fix  | handle project being passed as a flag                                                                    |
| [b1451cb5e](https://github.com/angular/angular-cli/commit/b1451cb5e90f43df365202a6fdfcfbc9e0853ca4) | fix  | improve resilience of logging during process exit                                                        |
| [17fec1357](https://github.com/angular/angular-cli/commit/17fec13577ac333fc66c3752c75be58146c9ebac) | fix  | provide actionable error when project cannot be determined                                               |

### @schematics/angular

| Commit                                                                                              | Type | Description                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------- |
| [73dcf39c6](https://github.com/angular/angular-cli/commit/73dcf39c6e7678a3915a113fd72829549ccc3b8e) | fix  | remove strict setting under application project |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                    |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| [c788d5b56](https://github.com/angular/angular-cli/commit/c788d5b56a1a191e7ca53c3b63245e3979a1cf44) | fix  | log modified and removed files when using the `verbose` option |
| [6e8fe0ed5](https://github.com/angular/angular-cli/commit/6e8fe0ed54d88132da0238fdb3a6e97330c85ff7) | fix  | replace dev-server socket path from `/ws` to `/ng-cli-ws`      |
| [651adadf4](https://github.com/angular/angular-cli/commit/651adadf4df8b66c60771f27737cb2a67957b46a) | fix  | update Angular peer dependencies to 14.0 stable                |

### @angular/pwa

| Commit                                                                                              | Type | Description                        |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------- |
| [cfd264d06](https://github.com/angular/angular-cli/commit/cfd264d061109c7989933e51a14b6bf83b289b07) | fix  | add peer dependency on Angular CLI |

## Special Thanks

Alan Agius, Charles Lyding and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.0"></a>

# 14.0.0 (2022-06-02)

## Breaking Changes

### @angular/cli

- Several changes to the `ng analytics` command syntax.

  - `ng analytics project <setting>` has been replaced with `ng analytics <setting>`
  - `ng analytics <setting>` has been replaced with `ng analytics <setting> --global`

- Support for Node.js v12 has been removed as it will become EOL on 2022-04-30. Please use Node.js v14.15 or later.
- Support for TypeScript 4.4 and 4.5 has been removed. Please update to TypeScript 4.6.
- `--all` option from `ng update` has been removed without replacement. To update packages which don’t provide `ng update` capabilities in your workspace `package.json` use `npm update`, `yarn upgrade-interactive` or `yarn upgrade` instead.
- Deprecated option `--prod` has been removed from all builders. `--configuration production`/`-c production` should be used instead if the default configuration of the builder is not configured to `production`.
- `--configuration` cannot be used with `ng run`. Provide the configuration as part of the target. Ex: `ng run project:builder:configuration`.
- Deprecated `ng x18n` and `ng i18n-extract` commands have been removed in favor of `ng extract-i18n`.
- Several changes in the Angular CLI commands and arguments handling.

  - `ng help` has been removed in favour of the `—-help` option.
  - `ng —-version` has been removed in favour of `ng version` and `ng v`.
  - Deprecated camel cased arguments are no longer supported. Ex. using `—-sourceMap` instead of `—-source-map` will result in an error.
  - `ng update`, `—-migrate-only` option no longer accepts a string of migration name, instead use `—-migrate-only -—name <migration-name>`.
  - `—-help json` help has been removed.

### @angular-devkit/architect-cli

- camel case arguments are no longer allowed.

### @angular-devkit/schematics-cli

- camel case arguments are no longer allowed.

### @angular-devkit/build-angular

- `browser` and `karma` builders `script` and `styles` options input files extensions are now validated.

  Valid extensions for `scripts` are:

  - `.js`
  - `.cjs`
  - `.mjs`
  - `.jsx`
  - `.cjsx`
  - `.mjsx`

  Valid extensions for `styles` are:

  - `.css`
  - `.less`
  - `.sass`
  - `.scss`
  - `.styl`

- We now issue a build time error since importing a CSS file as an ECMA module is non standard Webpack specific feature, which is not supported by the Angular CLI.

  This feature was never truly supported by the Angular CLI, but has as such for visibility.

- Reflect metadata polyfill is no longer automatically provided in JIT mode
  Reflect metadata support is not required by Angular in JIT applications compiled by the CLI.
  Applications built in AOT mode did not and will continue to not provide the polyfill.
  For the majority of applications, the reflect metadata polyfill removal should have no effect.
  However, if an application uses JIT mode and also uses the previously polyfilled reflect metadata JavaScript APIs, the polyfill will need to be manually added to the application after updating.
  To replicate the previous behavior, the `core-js` package should be manually installed and the `import 'core-js/proposals/reflect-metadata';` statement should be added to the application's `polyfills.ts` file.
- `NG_BUILD_CACHE` environment variable has been removed. `cli.cache` in the workspace configuration should be used instead.
- The deprecated `showCircularDependencies` browser and server builder option has been removed. The recommended method to detect circular dependencies in project code is to use either a lint rule or other external tools.

### @angular-devkit/core

- `parseJson` and `ParseJsonOptions` APIs have been removed in favor of 3rd party JSON parsers such as `jsonc-parser`.
- The below APIs have been removed without replacement. Users should leverage other Node.js or other APIs.
  - `fs` namespace
  - `clean`
  - `mapObject`

### @angular-devkit/schematics

- Schematics `NodePackageInstallTask` will not execute package scripts by default
  The `NodePackageInstallTask` will now use the package manager's `--ignore-scripts` option by default.
  The `--ignore-scripts` option will prevent package scripts from executing automatically during an install.
  If a schematic installs packages that need their `install`/`postinstall` scripts to be executed, the
  `NodePackageInstallTask` now contains an `allowScripts` boolean option which can be enabled to provide the
  previous behavior for that individual task. As with previous behavior, the `allowScripts` option will
  prevent the individual task's usage of the `--ignore-scripts` option but will not override the package
  manager's existing configuration.
- Deprecated `analytics` property has been removed from `TypedSchematicContext` interface

### @ngtools/webpack

- `ivy` namespace has been removed from the public API.

  - `ivy.AngularWebpackPlugin` -> `AngularWebpackPlugin`
  - `ivy.AngularPluginOptions` -> `AngularPluginOptions`

## Deprecations

### @angular/cli

- The `defaultCollection` workspace option has been deprecated in favor of `schematicCollections`.

  Before

  ```json
  "defaultCollection": "@angular/material"
  ```

  After

  ```json
  "schematicCollections": ["@angular/material"]
  ```

- The `defaultProject` workspace option has been deprecated. The project to use will be determined from the current working directory.

### @angular-devkit/core

- - `ContentHasMutatedException`, `InvalidUpdateRecordException`, `UnimplementedException` and `MergeConflictException` symbol from `@angular-devkit/core` have been deprecated in favor of the symbol from `@angular-devkit/schematics`.
  - `UnsupportedPlatformException` - A custom error exception should be created instead.

### @angular/cli

| Commit                                                                                              | Type     | Description                                                                        |
| --------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| [afafa5788](https://github.com/angular/angular-cli/commit/afafa5788f11b8727c39bb0a390300a706aba5bc) | feat     | add `--global` option to `ng analytics` command                                    |
| [bb550436a](https://github.com/angular/angular-cli/commit/bb550436a476d74705742a8c36f38971b346b903) | feat     | add `ng analytics info` command                                                    |
| [e5bf35ea3](https://github.com/angular/angular-cli/commit/e5bf35ea3061a3e532aa85df44551107e62e24c5) | feat     | add `ng cache` command                                                             |
| [7ab22ed40](https://github.com/angular/angular-cli/commit/7ab22ed40d521e3cec29ab2d66d0289c3cdb4106) | feat     | add disable/enable aliases for off/on `ng analytics` command                       |
| [4212fb8de](https://github.com/angular/angular-cli/commit/4212fb8de2f4f3e80831a0803acc5fc6e54db1e1) | feat     | add prompt to set up CLI autocompletion                                            |
| [0316dea67](https://github.com/angular/angular-cli/commit/0316dea676be522b04d654054880cc5794e3c8b3) | feat     | add prompts on missing builder targets                                             |
| [607a723f7](https://github.com/angular/angular-cli/commit/607a723f7d623ec8a15054722b2afd13042f66a1) | feat     | add support for auto completion                                                    |
| [366cabc66](https://github.com/angular/angular-cli/commit/366cabc66c3dd836e2fdfea8dad6c4c7c2096b1d) | feat     | add support for multiple schematics collections                                    |
| [036327e9c](https://github.com/angular/angular-cli/commit/036327e9ca838f9ef3f117fbd18949d9d357e68d) | feat     | deprecated `defaultProject` option                                                 |
| [fb0622893](https://github.com/angular/angular-cli/commit/fb06228932299870774a7b254f022573f5d8175f) | feat     | don't prompt to set up autocompletion for `ng update` and `ng completion` commands |
| [4ebfe0341](https://github.com/angular/angular-cli/commit/4ebfe03415ebe4e8f1625286d1be8bd1b54d3862) | feat     | drop support for Node.js 12                                                        |
| [022d8c7bb](https://github.com/angular/angular-cli/commit/022d8c7bb142e8b83f9805a39bc1ae312da465eb) | feat     | make `ng completion` set up CLI autocompletion by modifying `.bashrc` files        |
| [2e15df941](https://github.com/angular/angular-cli/commit/2e15df9417dcc47b12785a8c4c9074bf05d0450c) | feat     | remember after prompting users to set up autocompletion and don't prompt again     |
| [7fa3e6587](https://github.com/angular/angular-cli/commit/7fa3e6587955d0638929758d3c257392c242c796) | feat     | support TypeScript 4.6.2                                                           |
| [9e69331fa](https://github.com/angular/angular-cli/commit/9e69331fa61265c77d6281232bb64a2c63509290) | feat     | use PNPM as package manager when `pnpm-lock.yaml` exists                           |
| [6f6b453fb](https://github.com/angular/angular-cli/commit/6f6b453fbf90adad16eba7ea8929a11235c1061b) | fix      | `ng doc` doesn't open browser in Windows                                           |
| [8e66c9188](https://github.com/angular/angular-cli/commit/8e66c9188be827380e5acda93c7e21fae718b9ce) | fix      | `ng g` show description from `collection.json` if not present in `schema.json`     |
| [9edeb8614](https://github.com/angular/angular-cli/commit/9edeb86146131878c5e8b21b6adaa24a26f12453) | fix      | add long description to `ng update`                                                |
| [160cb0718](https://github.com/angular/angular-cli/commit/160cb071870602d9e7fece2ce381facb71e7d762) | fix      | correctly handle `--search` option in `ng doc`                                     |
| [d46cf6744](https://github.com/angular/angular-cli/commit/d46cf6744eadb70008df1ef25e24fb1db58bb997) | fix      | display option descriptions during auto completion                                 |
| [09f8659ce](https://github.com/angular/angular-cli/commit/09f8659cedcba70903140d0c3eb5d0e10ebb506c) | fix      | display package manager during `ng update`                                         |
| [a49cdfbfe](https://github.com/angular/angular-cli/commit/a49cdfbfefbdd756882be96fb61dc8a0d374b6e0) | fix      | don't prompt for analytics when running `ng analytics`                             |
| [4b22593c4](https://github.com/angular/angular-cli/commit/4b22593c4a269ea4bd63cef39009aad69f159fa1) | fix      | ensure all available package migrations are executed                               |
| [054ae02c2](https://github.com/angular/angular-cli/commit/054ae02c2fb8eed52af76cf39a432a3770d301e4) | fix      | favor project in cwd when running architect commands                               |
| [ff4eba3d4](https://github.com/angular/angular-cli/commit/ff4eba3d4a9417d2baef70aaa953bdef4bb426a6) | fix      | handle duplicate arguments                                                         |
| [5a8bdeb43](https://github.com/angular/angular-cli/commit/5a8bdeb434c7561334bfc8865ed279110a44bd93) | fix      | hide private schematics from `ng g` help output                                    |
| [644f86d55](https://github.com/angular/angular-cli/commit/644f86d55b75a289e641ba280e8456be82383b06) | fix      | improve error message for Windows autocompletion use cases                         |
| [3012036e8](https://github.com/angular/angular-cli/commit/3012036e81fc6e5fc6c0f1df7ec626f91285673e) | fix      | populate path with working directory in nested schematics                          |
| [8a396de6a](https://github.com/angular/angular-cli/commit/8a396de6a8a58347d2201a43d7f5101f94f20e89) | fix      | print entire config when no positional args are provided to `ng config`            |
| [bdf2b9bfa](https://github.com/angular/angular-cli/commit/bdf2b9bfa9893a940ba254073d024172e0dc1abc) | fix      | print schematic errors correctly                                                   |
| [efc3c3225](https://github.com/angular/angular-cli/commit/efc3c32257a65caf36999dc34cadc41eedcbf323) | fix      | remove analytics prompt postinstall script                                         |
| [bf15b202b](https://github.com/angular/angular-cli/commit/bf15b202bb1cd073fe01cf387dce2c033b5bb14c) | fix      | remove cache path from global valid paths                                          |
| [142da460b](https://github.com/angular/angular-cli/commit/142da460b22e07a5a37b6140b50663446c3a2dbf) | fix      | remove incorrect warning during `ng update`                                        |
| [96a0d92da](https://github.com/angular/angular-cli/commit/96a0d92da2903edfb3835ce86b3700629d6e43ad) | fix      | remove JSON serialized description from help output                                |
| [78460e995](https://github.com/angular/angular-cli/commit/78460e995a192336db3c4be9d0592b4e7a2ff2c8) | fix      | remove type casting and add optional chaining for current in optionTransforms      |
| [e5bdadac4](https://github.com/angular/angular-cli/commit/e5bdadac44ac023363bc0a2473892fc17430b81f) | fix      | skip prompt or warn when setting up autocompletion without a global CLI install    |
| [ca401255f](https://github.com/angular/angular-cli/commit/ca401255f49568cfe5f9ec6a35ea5b91c91afa70) | fix      | sort commands in help output                                                       |
| [b97772dfc](https://github.com/angular/angular-cli/commit/b97772dfc03401fe1faa79e77742905341bd5d46) | fix      | support silent package installs with Yarn 2+                                       |
| [87cd5cd43](https://github.com/angular/angular-cli/commit/87cd5cd4311e71a15ea1ecb82dde7480036cb815) | fix      | workaround npm 7+ peer dependency resolve errors during updates                    |
| [d94a67353](https://github.com/angular/angular-cli/commit/d94a67353dcdaa30cf5487744a7ef151a6268f2d) | refactor | remove deprecated `--all` option from `ng update`                                  |
| [2fc7c73d7](https://github.com/angular/angular-cli/commit/2fc7c73d7e40dbb0a593df61eeba17c8a8f618a9) | refactor | remove deprecated `--prod` flag                                                    |
| [b69ca3a7d](https://github.com/angular/angular-cli/commit/b69ca3a7d22b54fc06fbc1cfb559b2fd915f5609) | refactor | remove deprecated command aliases for `extract-i18n`.                              |
| [2e0493130](https://github.com/angular/angular-cli/commit/2e0493130acfe7244f7ee3ef28c961b1b04d7722) | refactor | replace command line arguments parser                                              |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| [7b78b7840](https://github.com/angular/angular-cli/commit/7b78b7840e95b0f4dca2fcb9218b67dd7500ff2c) | feat | add --standalone to ng generate                                           |
| [e49220fba](https://github.com/angular/angular-cli/commit/e49220fba0d158be0971989e26eb199ec02fa113) | feat | add migratiom to remove `defaultProject` in workspace config              |
| [3fa38b08b](https://github.com/angular/angular-cli/commit/3fa38b08ba8ef57a6079873223a7d6088d5ea64e) | feat | introduce `addDependency` rule to utilities                               |
| [b07ccfbb1](https://github.com/angular/angular-cli/commit/b07ccfbb1b2045d285c23dd4b654e1380892fcb2) | feat | introduce a utility subpath export for Angular rules and utilities        |
| [7e7de6858](https://github.com/angular/angular-cli/commit/7e7de6858dd71bd461ceb0f89e29e2c57099bbcc) | feat | update Angular dependencies to use `^` as version prefix                  |
| [69ecddaa7](https://github.com/angular/angular-cli/commit/69ecddaa7d8b01aa7a9e61c403a4b9a8669e34c4) | feat | update new and existing projects compilation target to `ES2020`           |
| [7e8e42063](https://github.com/angular/angular-cli/commit/7e8e42063f354c402d758f10c8ba9bee7e0c8aff) | fix  | add migration to remove `package.json` in libraries secondary entrypoints |
| [b928d973e](https://github.com/angular/angular-cli/commit/b928d973e97f33220afe16549b41c4031feb5c5e) | fix  | alphabetically order imports during component generation                  |
| [09a71bab6](https://github.com/angular/angular-cli/commit/09a71bab6044e517319f061dbd4555ce57fe6485) | fix  | Consolidated setup with a single `beforeEach()`                           |
| [1921b07ee](https://github.com/angular/angular-cli/commit/1921b07eeb710875825dc6f7a4452bd5462e6ba7) | fix  | don't add path mapping to old entrypoint definition file                  |
| [c927c038b](https://github.com/angular/angular-cli/commit/c927c038ba356732327a026fe9a4c36ed23c9dec) | fix  | remove `@types/node` from new projects                                    |
| [27cb29438](https://github.com/angular/angular-cli/commit/27cb29438aa01b185b2dca3617100d87f45f14e8) | fix  | remove extra space in standalone imports                                  |

### @angular-devkit/architect-cli

| Commit                                                                                              | Type     | Description                      |
| --------------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
| [c7556b62b](https://github.com/angular/angular-cli/commit/c7556b62b7b0eab5717ed6eeab3fa7f0f1f2a873) | refactor | replace parser with yargs-parser |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type     | Description                      |
| --------------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
| [5330d52ae](https://github.com/angular/angular-cli/commit/5330d52aee32daca27fa1a2fa15712f4a408602a) | refactor | replace parser with yargs-parser |

### @angular-devkit/build-angular

| Commit                                                                                              | Type     | Description                                                                    |
| --------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| [00186fb93](https://github.com/angular/angular-cli/commit/00186fb93f66d8da51886de37cfa4599f3e89af9) | feat     | add initial experimental esbuild-based application browser builder             |
| [d23a168b8](https://github.com/angular/angular-cli/commit/d23a168b8d558ae9d73c8c9eed4ff199fc4d74b9) | feat     | validate file extensions for `scripts` and `styles` options                    |
| [2adf252dc](https://github.com/angular/angular-cli/commit/2adf252dc8a7eb0ce504de771facca56730e5272) | fix      | add es2015 exports package condition to browser-esbuild                        |
| [72e820e7b](https://github.com/angular/angular-cli/commit/72e820e7b2bc6904b030f1092bbb610334a4036f) | fix      | better handle Windows paths in esbuild experimental builder                    |
| [587082fb0](https://github.com/angular/angular-cli/commit/587082fb0fa7bdb6cddb36327f791889d76e3e7b) | fix      | close compiler on Karma exit                                                   |
| [c52d10d1f](https://github.com/angular/angular-cli/commit/c52d10d1fc4b70483a2043edfa73dc0f323f6bf1) | fix      | close dev-server on error                                                      |
| [48630ccfd](https://github.com/angular/angular-cli/commit/48630ccfd7a672fc5174ef484b3bd5c549d32fef) | fix      | detect `tailwind.config.cjs` as valid tailwindcss configuration                |
| [4d5f6c659](https://github.com/angular/angular-cli/commit/4d5f6c65918c1a8a4bde0a0af01089242d1cdc4a) | fix      | downlevel libraries based on the browserslist configurations                   |
| [1a160dac0](https://github.com/angular/angular-cli/commit/1a160dac00f34aab089053281c640dba3efd597f) | fix      | ensure karma sourcemap support on Windows                                      |
| [07e776ea3](https://github.com/angular/angular-cli/commit/07e776ea379a50a98a50cf590156c2dc1b272e78) | fix      | fail build when importing CSS files as an ECMA modules                         |
| [ac1383f9e](https://github.com/angular/angular-cli/commit/ac1383f9e5d491181812c090bd4323f46110f3d8) | fix      | properly handle locally-built APF v14 libraries                                |
| [966d25b55](https://github.com/angular/angular-cli/commit/966d25b55eeb6cb84eaca183b30e7d3b0d0a2188) | fix      | remove unneeded JIT reflect metadata polyfill                                  |
| [b8564a638](https://github.com/angular/angular-cli/commit/b8564a638df3b6971ef2ac8fb838e6a7c910ac3b) | refactor | remove deprecated `NG_BUILD_CACHE` environment variable                        |
| [0a1cd584d](https://github.com/angular/angular-cli/commit/0a1cd584d8ed00889b177f4284baec7e5427caf2) | refactor | remove deprecated `showCircularDependencies` browser and server builder option |

### @angular-devkit/core

| Commit                                                                                              | Type     | Description                                               |
| --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------- |
| [c5b3e9299](https://github.com/angular/angular-cli/commit/c5b3e9299130132aecfa19219405e1964d0c5443) | refactor | deprecate unused exception classes                        |
| [67144b9e5](https://github.com/angular/angular-cli/commit/67144b9e54b5a9bfbc963e386b01275be5eaccf5) | refactor | remove deprecated `parseJson` and `ParseJsonOptions` APIs |
| [a0c02af7e](https://github.com/angular/angular-cli/commit/a0c02af7e340bb16f4e6f523c2d835c9b18926b3) | refactor | remove deprecated fs, object and array APIs               |

### @angular-devkit/schematics

| Commit                                                                                              | Type     | Description                                                                 |
| --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| [c9c781c7d](https://github.com/angular/angular-cli/commit/c9c781c7d5f3c6de780912fd7c624a457e6da14c) | feat     | add parameter to `listSchematicNames` to allow returning hidden schematics. |
| [0e6425fd8](https://github.com/angular/angular-cli/commit/0e6425fd88ea32679516251efdca6ff07cc4b56a) | feat     | disable package script execution by default in `NodePackageInstallTask`     |
| [25498ad5b](https://github.com/angular/angular-cli/commit/25498ad5b2ba6fa5a88c9802ddeb0ed85c5d9b60) | feat     | re-export core string helpers from schematics package                       |
| [464cf330a](https://github.com/angular/angular-cli/commit/464cf330a14397470e1e57450a77f421a45a927e) | feat     | support null for options parameter from OptionTransform type                |
| [33f9f3de8](https://github.com/angular/angular-cli/commit/33f9f3de869bba2ecd855a01cc9a0a36651bd281) | feat     | support reading JSON content directly from a Tree                           |
| [01297f450](https://github.com/angular/angular-cli/commit/01297f450387dea02eafd6f5701c417ab5c5d844) | feat     | support reading text content directly from a Tree                           |
| [48f9b79bc](https://github.com/angular/angular-cli/commit/48f9b79bc4d43d0180bab5af5726621a68204a15) | fix      | support ignore scripts package installs with Yarn 2+                        |
| [3471cd6d8](https://github.com/angular/angular-cli/commit/3471cd6d8696ae9c28dba901d3e0f6868d69efc8) | fix      | support quiet package installs with Yarn 2+                                 |
| [44c1e6d0d](https://github.com/angular/angular-cli/commit/44c1e6d0d2db5f2dc212d63a34ade045cb7854d5) | refactor | remove deprecated `analytics` property                                      |

### @angular/pwa

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [243cb4062](https://github.com/angular/angular-cli/commit/243cb40622fef4107b0162bc7b6a374471cebc14) | fix  | remove `@schematics/angular` utility deep import usage |

### @ngtools/webpack

| Commit                                                                                              | Type     | Description                                      |
| --------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| [0c344259d](https://github.com/angular/angular-cli/commit/0c344259dcdc10a35840151bfe3ae1b27f9b53ff) | fix      | update peer dependency to reflect TS 4.6 support |
| [044101554](https://github.com/angular/angular-cli/commit/044101554dfbca07d74f2a4391f94875df7928d2) | perf     | use Webpack's built-in xxhash64 support          |
| [9277eed1d](https://github.com/angular/angular-cli/commit/9277eed1d9603d5e258eb7ae27de527eba919482) | refactor | remove deprecated ivy namespace                  |

## Special Thanks

Adrien Crivelli, Alan Agius, Charles Lyding, Cédric Exbrayat, Daniil Dubrava, Doug Parker, Elton Coelho, George Kalpakas, Jason Bedard, Joey Perrott, Kristiyan Kostadinov, Paul Gschwendtner, Pawel Kozlowski, Tobias Speicher and alkavats1

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.7"></a>

# 13.3.7 (2022-05-25)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------- |
| [a54018d8f](https://github.com/angular/angular-cli/commit/a54018d8f5f976034bf0a33f826245b7a6b74bbe) | fix  | add debugging and timing information in JavaScript and CSS optimization plugins |

## Special Thanks

Alan Agius and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.6"></a>

# 13.3.6 (2022-05-18)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------- |
| [e20964c43](https://github.com/angular/angular-cli/commit/e20964c43c52125b6d2bfa9bbea444fb2eea1e15) | fix  | resolve relative schematic from `angular.json` instead of current working directory |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                    |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------ |
| [16fec8d58](https://github.com/angular/angular-cli/commit/16fec8d58b6ec421df5e7809c45838baf232b4a9) | fix  | update `babel-loader` to 8.2.5 |

## Special Thanks

Alan Agius, Charles Lyding, Jason Bedard and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.5"></a>

# 13.3.5 (2022-05-04)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------- |
| [6da0910d3](https://github.com/angular/angular-cli/commit/6da0910d345eb84084e32a462432a508d518f402) | fix  | update `@ampproject/remapping` to `2.2.0` |

## Special Thanks

Alan Agius, Charles Lyding and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.4"></a>

# 13.3.4 (2022-04-27)

### @angular/cli

| Commit                                                                                              | Type | Description                       |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------- |
| [f4da75656](https://github.com/angular/angular-cli/commit/f4da756560358273098df2a5cae7848201206c77) | fix  | change wrapping of schematic code |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| [5d0141bfb](https://github.com/angular/angular-cli/commit/5d0141bfb4ae80b1a7543eab64e9c381c932eaef) | fix  | correctly resolve custom service worker configuration file |

## Special Thanks

Charles Lyding and Wagner Maciel

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.3"></a>

# 13.3.3 (2022-04-13)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| [d38b247cf](https://github.com/angular/angular-cli/commit/d38b247cf19edf5ecf7792343fa2bc8c05a3a8b8) | fix  | display debug logs when using the `--verbose` option |

### @angular-devkit/build-webpack

| Commit                                                                                              | Type | Description                 |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------- |
| [5682baee4](https://github.com/angular/angular-cli/commit/5682baee4b562b314dad781403dcc0c46e0a8abb) | fix  | emit devserver setup errors |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.2"></a>

# 13.3.2 (2022-04-06)

### @angular/cli

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [49dc63d09](https://github.com/angular/angular-cli/commit/49dc63d09a7a7f2b7759b47e79fac934b867e9b4) | fix  | ensure lint command auto-add exits after completion |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| [bbe74b87e](https://github.com/angular/angular-cli/commit/bbe74b87e52579c06b911db6173f33c67b8010a6) | fix  | provide actionable error message when routing declaration cannot be found |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                              |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------- |
| [c97c8e7c9](https://github.com/angular/angular-cli/commit/c97c8e7c9bbcad66ba80967681cac46042c3aca7) | fix  | update `minimatch` dependency to `3.0.5` |

## Special Thanks

Alan Agius, Charles Lyding and Morga Cezary

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.1"></a>

# 13.3.1 (2022-03-30)

### @schematics/angular

| Commit                                                                                              | Type | Description                                                                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------- |
| [cf3cb2ecf](https://github.com/angular/angular-cli/commit/cf3cb2ecf9ca47a984c4272f0094f2a1c68c7dfe) | fix  | fix extra comma added when use --change-detection=onPush and --style=none to generate a component |

### @angular-devkit/architect-cli

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [9f8d4dea0](https://github.com/angular/angular-cli/commit/9f8d4dea0449e236de7b928c5cc97e597a6f5844) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [ba3486de9](https://github.com/angular/angular-cli/commit/ba3486de94e733addf0ac17706b806dd813c9046) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/benchmark

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [1f7fa6970](https://github.com/angular/angular-cli/commit/1f7fa6970e8cddb2ba0c42df0e048a57292b7fe8) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                    |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| [293526c31](https://github.com/angular/angular-cli/commit/293526c31db9f0becc0ffc2d60999c80afa8a308) | fix  | add `node_modules` prefix to excludes RegExp   |
| [58ed97410](https://github.com/angular/angular-cli/commit/58ed97410b760909d523b05c3b4a06364e3c9a0f) | fix  | allow Workers in Stackblitz                    |
| [4cd2331d3](https://github.com/angular/angular-cli/commit/4cd2331d34e2a9ab2ed78edf0284dbfefef511a5) | fix  | don't override asset info when updating assets |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| [c7c75820f](https://github.com/angular/angular-cli/commit/c7c75820f1d4ef827336626b78c8c3e5c0bd1f00) | fix  | add Angular CLI major version as analytics dimension |

## Special Thanks

Alan Agius and gauravsoni119

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.17"></a>

# 12.2.17 (2022-03-31)

### @angular-devkit/architect-cli

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [ccb0f95f3](https://github.com/angular/angular-cli/commit/ccb0f95f33ff0d23a0ff9b237d0d78fc4c864787) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [abcdf4df2](https://github.com/angular/angular-cli/commit/abcdf4df20c29907ee28a38842942464addcf259) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/benchmark

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [2656a330e](https://github.com/angular/angular-cli/commit/2656a330eb365f37c3b6f8894436b4449d157e63) | fix  | update `minimist` to `1.2.6` |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="11.2.19"></a>

# 11.2.19 (2022-03-30)

### @angular-devkit/architect-cli

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [75caa1143](https://github.com/angular/angular-cli/commit/75caa1143f4007c9550ab0dabb62ae4df91e3827) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [80d479e9f](https://github.com/angular/angular-cli/commit/80d479e9fdfcf6863ebbe0986ea6cd29309f398d) | fix  | update `minimist` to `1.2.6` |

### @angular-devkit/benchmark

| Commit                                                                                              | Type | Description                  |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [f61cd1a79](https://github.com/angular/angular-cli/commit/f61cd1a79b6960711d4aa5b16d04308bbdc67beb) | fix  | update `minimist` to `1.2.6` |

## Special Thanks

Alan Agius and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.3.0"></a>

# 13.3.0 (2022-03-16)

### @angular/cli

| Commit                                                                                              | Type | Description            |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------- |
| [c995ed5e8](https://github.com/angular/angular-cli/commit/c995ed5e8a8e1b20cf376f4c48c5141fd5f4548a) | feat | support TypeScript 4.6 |

## Special Thanks

Alan Agius and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.6"></a>

# 13.2.6 (2022-03-09)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                          |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------ |
| [90a5531b1](https://github.com/angular/angular-cli/commit/90a5531b1fbe4043ab47f921ad6b858d34e7c7d0) | fix  | ignore css only chunks during naming |

## Special Thanks

Alan Agius, Charles Lyding and Daniele Maltese

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.5"></a>

# 13.2.5 (2022-02-23)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                           |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------- |
| [acf1e5e4a](https://github.com/angular/angular-cli/commit/acf1e5e4a5b359be125272f7e4055208116a13d8) | fix  | don't rename blocks which have a name |
| [7a493979c](https://github.com/angular/angular-cli/commit/7a493979ccb71e974d668fca67d75e1b194f8608) | fix  | update `terser` to `5.11.0`           |

## Special Thanks

Alan Agius and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.4"></a>

# 13.2.4 (2022-02-17)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                            |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------- |
| [48c655ac9](https://github.com/angular/angular-cli/commit/48c655ac98e1d69622dd832c6a915c48e703cd8f) | fix  | update `esbuild` to `0.14.22`          |
| [c0736ea0b](https://github.com/angular/angular-cli/commit/c0736ea0b173861bb5ceb9315d27038eb28535e1) | fix  | update license-webpack-plugin to 4.0.2 |

## Special Thanks

Alan Agius, Anner Visser and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.3"></a>

# 13.2.3 (2022-02-09)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                       |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------- |
| [8c8377fee](https://github.com/angular/angular-cli/commit/8c8377fee4999266f4e58bf3c3091100d4393df7) | fix  | block Karma from starting until build is complete |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [1317e470e](https://github.com/angular/angular-cli/commit/1317e470ec74d1dd9dced2d0ec0022abfe921995) | fix  | support locating PNPM lock file during NGCC processing |

## Special Thanks

Alan Agius, Derek Cormier and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.2"></a>

# 13.2.2 (2022-02-02)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [cc5505cfc](https://github.com/angular/angular-cli/commit/cc5505cfcf12732fad4f85e6e76c8e4f0584c13a) | fix  | add `whatwg-url` to downlevel exclusion list              |
| [ff54b49e7](https://github.com/angular/angular-cli/commit/ff54b49e7097cda2eb835bc8c9674f71fcc91c3c) | fix  | ensure to use content hash as filenames hashing mechanism |
| [b0e2bb289](https://github.com/angular/angular-cli/commit/b0e2bb289050efc77478a0f50778abbec9c5a318) | perf | update `license-webpack-plugin` to `4.0.1`                |

### @angular-devkit/core

| Commit                                                                                              | Type | Description                                  |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------- |
| [c8826a973](https://github.com/angular/angular-cli/commit/c8826a9738f860e374bd65a058c6be1b02545133) | fix  | correctly resolve schema references defaults |

## Special Thanks

Alan Agius, Derek Cormier and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.1"></a>

# 13.2.1 (2022-01-31)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------- |
| [acd752773](https://github.com/angular/angular-cli/commit/acd752773d85e4debbc2b415c7ea369bc3d7018a) | fix  | invalid browsers version ranges |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.2.0"></a>

# 13.2.0 (2022-01-26)

### @schematics/angular

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [41a828e20](https://github.com/angular/angular-cli/commit/41a828e2068b881f744846c3f0edbff8c62cb9ce) | fix  | updated Angular new project version to v13.2.0-next.0 |

### @angular-devkit/architect

| Commit                                                                                              | Type | Description                   |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------- |
| [f2c6b2b7e](https://github.com/angular/angular-cli/commit/f2c6b2b7ec88a1b7e45884b38faa0978af1b4b74) | fix  | correctly handle ESM builders |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                           |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| [cbe028e37](https://github.com/angular/angular-cli/commit/cbe028e37c8af6f2e17cbbeddc968c9410151bbb) | feat | expose i18nDuplicateTranslation option of browser and server builders |
| [509322b62](https://github.com/angular/angular-cli/commit/509322b6214b3425bd209087ac99ee9b14edeaba) | fix  | Don't use TAILWIND_MODE=watch                                         |

### @angular-devkit/build-webpack

| Commit                                                                                              | Type | Description                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------- |
| [820ff2a3e](https://github.com/angular/angular-cli/commit/820ff2a3e84c5a55e23359e3a45714db83362a2a) | fix  | correctly handle ESM webpack configurations |

## Special Thanks

Alan Agius, Cédric Exbrayat, Derek Cormier, Doug Parker, Joey Perrott, Jordan Pittman, grant-wilson and minijus

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.1.4"></a>

# 13.1.4 (2022-01-19)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [2f2069dba](https://github.com/angular/angular-cli/commit/2f2069dbaa70c3d4725923f1c3ccbf56b1f57576) | fix  | disable parsing `new URL` syntax                      |
| [bddd0fb9f](https://github.com/angular/angular-cli/commit/bddd0fb9f34a8706dd1646952eed08970b9cddbe) | fix  | support ESNext as target for JavaScript optimizations |

## Special Thanks

Alan Agius, Derek Cormier and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.1.3"></a>

# 13.1.3 (2022-01-12)

### @angular/cli

| Commit                                                                                              | Type | Description                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| [4c9d72c65](https://github.com/angular/angular-cli/commit/4c9d72c659d912bd9ef4590a2e88340932a96868) | fix  | remove extra space in `Unable to find compatible package` during `ng add` |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------- |
| [9b07191b1](https://github.com/angular/angular-cli/commit/9b07191b1ccdcd2a6bb17686471acddd5862dcf5) | fix  | set `skipTest` flag for resolvers when using ng new --skip-tests |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [5b39e0eca](https://github.com/angular/angular-cli/commit/5b39e0eca6e8a3825f66ad6cd1818e551bf98f08) | fix  | automatically purge stale build cache entries          |
| [6046e06b9](https://github.com/angular/angular-cli/commit/6046e06b926af29f89c605504f5356ec553c6390) | fix  | correctly resolve `core-js/proposals/reflect-metadata` |
| [de68daa55](https://github.com/angular/angular-cli/commit/de68daa5581dd1f257382da16704d442b540ec41) | fix  | enable `:where` CSS pseudo-class                       |
| [6a617ff4a](https://github.com/angular/angular-cli/commit/6a617ff4a2fe75968965dc5dcf0f3ba7bae92935) | fix  | ensure `$localize` calls are replaced in watch mode    |
| [92b4e067b](https://github.com/angular/angular-cli/commit/92b4e067b24bdcd1bb7e40612b5355ce61e040ce) | fix  | load translations fresh start                          |
| [d674dcd1a](https://github.com/angular/angular-cli/commit/d674dcd1af409910dd4f41ac676349aee363ebdb) | fix  | localized bundle generation fails in watch mode        |
| [6876ad36e](https://github.com/angular/angular-cli/commit/6876ad36efaadac5c4d371cff96c9a4cfa0e3d2b) | fix  | use `contenthash` instead of `chunkhash` for chunks    |
| [11fd02105](https://github.com/angular/angular-cli/commit/11fd02105908e155c4a9c7f87e9641127cc2f378) | fix  | websocket client only injected if required             |
| [6ca0e41a9](https://github.com/angular/angular-cli/commit/6ca0e41a9b54aef0a8ea626be73e06d19370f3a7) | perf | update `esbuild` to `0.14.11`                          |

## Special Thanks

Alan Agius, Bill Barry, Derek Cormier, Elio Goettelmann, Joey Perrott, Kasper Christensen, Lukas Spirig and Zoltan Lehoczky

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.15"></a>

# 12.2.15 (2022-01-12)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [526115fdb](https://github.com/angular/angular-cli/commit/526115fdb7d35ff01f5dbdb6027d9f5e925e4056) | fix  | updated webpack-dev-server to latest security patch |

## Special Thanks

Doug Parker and iRealNirmal

<a name="11.2.18"></a>

# 11.2.18 (2022-01-12)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                         |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------- |
| [534678450](https://github.com/angular/angular-cli/commit/534678450196a45610e88a85ee01317aa43dc788) | fix  | updated webpack-dev-server to latest security patch |

## Special Thanks

Doug Parker and iRealNirmal

<a name="13.2.0-next.1"></a>

# 13.2.0-next.1 (2021-12-15)

### @schematics/angular

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [41a828e20](https://github.com/angular/angular-cli/commit/41a828e2068b881f744846c3f0edbff8c62cb9ce) | fix  | updated Angular new project version to v13.2.0-next.0 |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [0323a35b4](https://github.com/angular/angular-cli/commit/0323a35b47a4a2fd3870b09d46e3655714e50abd) | fix  | add `tailwindcss` support for version 3                       |
| [471930007](https://github.com/angular/angular-cli/commit/471930007cb9cd26264eab483fdfd1f5b4db6641) | fix  | display FS cache information when `verbose` option is used    |
| [f1d2873ca](https://github.com/angular/angular-cli/commit/f1d2873ca7ee337748366d04878514c2c27a72a2) | fix  | only extract CSS styles when are specified in `styles` option |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------- |
| [b03b9eefe](https://github.com/angular/angular-cli/commit/b03b9eefeac77b93931803de208118e3a6c5a928) | perf | reduce redundant module rebuilds when cache is restored |

## Special Thanks

Alan Agius, Cédric Exbrayat, Derek Cormier and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.1.2"></a>

# 13.1.2 (2021-12-15)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                   |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| [1ddbd75ae](https://github.com/angular/angular-cli/commit/1ddbd75ae200c14b5f33556bd6d5ae6b7722d14e) | fix  | add `tailwindcss` support for version 3                       |
| [adf925c07](https://github.com/angular/angular-cli/commit/adf925c0755b6e78a57932becdb7b7a764afb9e6) | fix  | display FS cache information when `verbose` option is used    |
| [09c3826c9](https://github.com/angular/angular-cli/commit/09c3826c9d9128a6b520d0fe8da3cb466d18cddc) | fix  | only extract CSS styles when are specified in `styles` option |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------- |
| [f31d7f79d](https://github.com/angular/angular-cli/commit/f31d7f79dfa8f997fecdcfec1ebc6cfbe657f3fb) | perf | reduce redundant module rebuilds when cache is restored |

## Special Thanks

Alan Agius, Derek Cormier and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="11.2.17"></a>

# 11.2.17 (2021-12-16)

### @angular/cli

| Commit                                                                                              | Type | Description                                                    |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| [1efff8f82](https://github.com/angular/angular-cli/commit/1efff8f82df38b7485f8a8dcdd5bfea5a457c6a1) | fix  | exclude deprecated packages with removal migration from update |

## Special Thanks

Alan Agius and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="11.2.16"></a>

# 11.2.16 (2021-12-15)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| [f456b0962](https://github.com/angular/angular-cli/commit/f456b0962b9f339759bc86c092256f68d68d9ecf) | fix  | error when updating Angular packages across multi-major migrations                        |
| [886d2511e](https://github.com/angular/angular-cli/commit/886d2511e292b687acce1ac4c6924f992494d14f) | fix  | logic which determines which temp version of the CLI is to be download during `ng update` |
| [776d1210a](https://github.com/angular/angular-cli/commit/776d1210a9e62bf2531d977138f49f93820a8b87) | fix  | update `ng update` output for Angular packages                                            |

## Special Thanks

Alan Agius and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="10.2.4"></a>

# 10.2.4 (2021-12-15)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| [745d77728](https://github.com/angular/angular-cli/commit/745d777288a5ae0e79b4ecdf7b8483f242ba8e66) | fix  | error when updating Angular packages across multi-major migrations                        |
| [460ea21b5](https://github.com/angular/angular-cli/commit/460ea21b5d4b8759a3f7457b885110022dd21dfc) | fix  | logic which determines which temp version of the CLI is to be download during `ng update` |
| [03da12899](https://github.com/angular/angular-cli/commit/03da1289996790ae574a49bb46123c74417a97c2) | fix  | update `ng update` output for Angular packages                                            |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                  |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| [d6582d489](https://github.com/angular/angular-cli/commit/d6582d48944f7bf169f3902e4c19186a6751f473) | fix  | change `karma-jasmine-html-reporter` dependency to use tilde |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.1.1"></a>

# 13.1.1 (2021-12-10)

### @schematics/angular

| Commit                                                                                              | Type | Description                                    |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| [a315b968a](https://github.com/angular/angular-cli/commit/a315b968a36e6aae990e52d9a18673fef9b5fda6) | fix  | updated Angular new project version to v13.1.0 |

## Special Thanks

Alan Agius, Cédric Exbrayat and Derek Cormier

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.1.0"></a>

# 13.1.0 (2021-12-09)

### @angular/cli

| Commit                                                                                              | Type | Description                                                        |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------ |
| [56f802b7d](https://github.com/angular/angular-cli/commit/56f802b7dd26bfc774b6b00982a1dbbe0bafddd0) | feat | ask to install angular-eslint when running ng lint in new projects |
| [ecd9fb5c7](https://github.com/angular/angular-cli/commit/ecd9fb5c774b6301348c4514da04d58ae8903d06) | feat | provide more detailed error for not found builder                  |
| [0b6071af3](https://github.com/angular/angular-cli/commit/0b6071af3a51e7d3f38a661bd4e0a3c3e81aff2f) | fix  | `ng doc` does open browser on Windows                              |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| [d5d9f042f](https://github.com/angular/angular-cli/commit/d5d9f042f2ea42573b7ff4fab90cab85d0c5ec0b) | feat | add VS Code configurations when generating a new workspace |
| [f95cc8281](https://github.com/angular/angular-cli/commit/f95cc8281a64bd9ac19e0fa5d92cb0a6ee8c32ec) | feat | generate new projects using TypeScript 4.5                 |
| [21809e14c](https://github.com/angular/angular-cli/commit/21809e14cd5c666c82fdaebc9e601341dfb76d0a) | feat | loosen project name validation                             |

### @angular-devkit/schematics-cli

| Commit                                                                                              | Type | Description                                |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| [339bab06c](https://github.com/angular/angular-cli/commit/339bab06cc25863571acb09cb3e877fed14ca2f9) | feat | generate new projects using TypeScript 4.5 |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                     |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------- |
| [bc8563760](https://github.com/angular/angular-cli/commit/bc856376039287cf5fb6135ca5da65a9000f5664) | feat | add estimated transfer size to build output report                              |
| [bc17cf0cd](https://github.com/angular/angular-cli/commit/bc17cf0cdd02bf50758e510756a26e6e6ca32d14) | feat | colorize file raw sizes based on failing budgets                                |
| [3c681b68d](https://github.com/angular/angular-cli/commit/3c681b68d7a32f1cfaf3feee6b2e02cc6e0f0568) | feat | set `dir` attribute when using localization                                     |
| [6d0f99a2d](https://github.com/angular/angular-cli/commit/6d0f99a2deef957c15836c172b9f68f716f836a4) | feat | support JSON comments in dev-server proxy configuration file                    |
| [9300545e6](https://github.com/angular/angular-cli/commit/9300545e6148b4548cc02bb6a311a2f0e2bb79c5) | feat | watch i18n translation files with dev server                                    |
| [9bacba342](https://github.com/angular/angular-cli/commit/9bacba3420cda7897091522415a8d55cf1b75106) | fix  | differentiate components and global styles using file query instead of filename |
| [7408511da](https://github.com/angular/angular-cli/commit/7408511da555f37560ca7e3b536e15dfc8f6a1e5) | fix  | display cleaner errors                                                          |
| [d55fc62ef](https://github.com/angular/angular-cli/commit/d55fc62ef2f8bc7a6f1190f56f8e8b64c9195263) | fix  | fallback to use language ID to set the `dir` attribute                          |
| [4c288b8bd](https://github.com/angular/angular-cli/commit/4c288b8bd28e7215887aa52025c4fa41fcf7bc01) | fix  | lazy modules bundle budgets                                                     |
| [562dc6a89](https://github.com/angular/angular-cli/commit/562dc6a8924826509d9012b2c0fe61c089077399) | fix  | prefer ES2015 entrypoints when application targets ES2019 or lower              |
| [ac66e400c](https://github.com/angular/angular-cli/commit/ac66e400cddc81bde46949d1abe4560185dfbedb) | fix  | Sass compilation in StackBlitz webcontainers                                    |
| [e1bac5bbb](https://github.com/angular/angular-cli/commit/e1bac5bbb36f391b89445ba61abe561c75746f30) | fix  | update Angular peer dependencies to v13.1 prerelease                            |
| [789ddfaeb](https://github.com/angular/angular-cli/commit/789ddfaeb0fcbc9aab1581384b88c3618e606c4b) | perf | disable webpack backwards compatible APIs                                       |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [5402f99f8](https://github.com/angular/angular-cli/commit/5402f99f8ad20e0a57456a416a992415fc6332bd) | fix  | add `cjs` and `mjs` to passthrough files                 |
| [10d4ede2d](https://github.com/angular/angular-cli/commit/10d4ede2de42dfc302dcb4c5790274290170568d) | fix  | handle promise rejection during Angular program analyzes |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Ferdinand Malcher, Joey Perrott and Ruslan Lekhman

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.14"></a>

# 12.2.14 (2021-12-07)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| [30295b33e](https://github.com/angular/angular-cli/commit/30295b33ed74667f31e9d3a4a0017910a85fd734) | fix  | error when updating Angular packages across multi-major migrations                        |
| [e07bd059e](https://github.com/angular/angular-cli/commit/e07bd059e3d6bc6b40191c036c467595ed119da7) | fix  | logic which determines which temp version of the CLI is to be download during `ng update` |
| [ce1ec0420](https://github.com/angular/angular-cli/commit/ce1ec0420770a8e28c1c1301df9e5eb4548d4c53) | fix  | update `ng update` output for Angular packages                                            |
| [dd9f8df52](https://github.com/angular/angular-cli/commit/dd9f8df5204d639272f183795ebd48d7994df427) | fix  | update `pacote` to `12.0.2`                                                               |

## Special Thanks

Alan Agius and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.4"></a>

# 13.0.4 (2021-12-01)

### @angular/cli

| Commit                                                                                              | Type | Description                                                                               |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| [ded7b5c06](https://github.com/angular/angular-cli/commit/ded7b5c069a145d1b3e264538d7c4302919ad030) | fix  | exit with a non-zero error code when migration fails during `ng update`                   |
| [250a58b48](https://github.com/angular/angular-cli/commit/250a58b4820a738aba7609627fa7fce0a24f10db) | fix  | logic which determines which temp version of the CLI is to be download during `ng update` |

### @schematics/angular

| Commit                                                                                              | Type | Description                                  |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------- |
| [372e2e633](https://github.com/angular/angular-cli/commit/372e2e633f4bd9bf29c35d02890e1c6a70da3169) | fix  | address eslint linting failures in `test.ts` |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                                                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------- |
| [b835389c8](https://github.com/angular/angular-cli/commit/b835389c8a60749151039ed0baf0be025ce0932b) | fix  | correctly extract messages when using cached build ([#22266](https://github.com/angular/angular-cli/pull/22266)) |
| [647a5f0b1](https://github.com/angular/angular-cli/commit/647a5f0b18e49b2ece3f43c0a06bfb75d7caef49) | fix  | don't watch nested `node_modules` when polling is enabled                                                        |
| [4d01d4f72](https://github.com/angular/angular-cli/commit/4d01d4f72344c42f650f5495b21e6bd94069969a) | fix  | transform remapped sourcemap into a plain object                                                                 |

### @ngtools/webpack

| Commit                                                                                              | Type | Description                                               |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| [4d918ef99](https://github.com/angular/angular-cli/commit/4d918ef9912d53a09d73fb19fa41b121dceed37c) | fix  | JIT mode CommonJS accessing inexistent `default` property |

## Special Thanks

Alan Agius, Billy Lando, David-Emmanuel DIVERNOIS and Derek Cormier

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.3"></a>

# 13.0.3 (2021-11-17)

## Special Thanks

Alan Agius, Joey Perrott and Krzysztof Platis

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.2"></a>

# 13.0.2 (2021-11-10)

### @angular/cli

| Commit                                                                                              | Type | Description                                            |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| [34047b1ad](https://github.com/angular/angular-cli/commit/34047b1adccd7eb852c1900c872e9ca71c8d4cd9) | fix  | avoid redirecting @angular/core in Angular migrations  |
| [ff4538e98](https://github.com/angular/angular-cli/commit/ff4538e981cfff49b6e8433ffcb5ac2d2ea5d07e) | fix  | favor ng-update `packageGroupName` in ng update output |

### @schematics/angular

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [1bc00b6fe](https://github.com/angular/angular-cli/commit/1bc00b6feb9033fd611dec965c82f03e4135a9f4) | fix  | migrate ng-packagr configurations in package.json        |
| [9ea74a13d](https://github.com/angular/angular-cli/commit/9ea74a13d07208373490c7cdb3ff7c452c698322) | fix  | show warning when migrating ng-packagr JS configurations |

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                             |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------- |
| [35164bf92](https://github.com/angular/angular-cli/commit/35164bf92b986a67215580622aaddc4148a7c822) | fix  | don't restore `input` of type `file` during HMR                         |
| [facb5d8ff](https://github.com/angular/angular-cli/commit/facb5d8ffd4f6a81d3132515b8bae64278cf8316) | fix  | don't show `[NG HMR] Unknown input type` when restoring file type input |
| [ef8815d04](https://github.com/angular/angular-cli/commit/ef8815d0434836f2d8119e91a7bc09742ff77d37) | fix  | improve sourcemap fidelity during code-coverage                         |
| [966a1334a](https://github.com/angular/angular-cli/commit/966a1334a6502f5d4a18710ae22e739e62770101) | fix  | suppress "@charset" must be the first rule in the file warning          |
| [1cdc24da0](https://github.com/angular/angular-cli/commit/1cdc24da0105fad75221e3c145de12dafc601059) | fix  | update Angular peer dependencies to 13.0 stable                         |

## Special Thanks

Alan Agius, Charles Lyding, Joey Perrott and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.1"></a>

# 13.0.1 (2021-11-03)

### @schematics/angular

| Commit                                                                                              | Type | Description                                    |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------- |
| [40f599241](https://github.com/angular/angular-cli/commit/40f599241e278478c694580c9dec4f5cc34db011) | fix  | updated Angular new project version to v13.0.0 |

## Special Thanks

Charles Lyding and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.13"></a>

# 12.2.13 (2021-11-03)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [a2bd940e4](https://github.com/angular/angular-cli/commit/a2bd940e4ab44db57b0fc69d5346d2862a19c879) | fix  | add verbose logging for differential loading and i18n |

## Special Thanks

Charles Lyding and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.0"></a>

# 13.0.0 (2021-11-03)

## Breaking Changes

### @angular/cli

- We drop support for Node.js versions prior to `12.20`.

### @schematics/angular

- `classlist.js` and `web-animations-js` are removed from application polyfills and uninstalled from the package. These were only needed for compatibility with Internet Explorer, which is no longer needed now that Angular only supports evergreen browsers. See: https://angular.dev/reference/versions#browser-support.

Add the following to the polyfills file for an app to re-add these packages:

```typescript
import 'classlist.js';
import 'web-animations-js';
```

And then run:

```sh
npm install classlist.js web-animations-js --save
```

- We removed several deprecated `@schematics/angular` deprecated options.
- `lintFix` have been removed from all schematics. `ng lint --fix` should be used instead.
- `legacyBrowsers` have been removed from the `application` schematics since IE 11 is no longer supported.
- `configuration` has been removed from the `web-worker` as it was unused.
- `target` has been removed from the `service-worker` as it was unused.

### @angular-devkit/build-angular

- Support for `karma-coverage-instanbul-reporter` has been dropped in favor of the official karma coverage plugin `karma-coverage`.

- Support for `node-sass` has been removed. `sass` will be used by default to compile SASS and SCSS files.

- `NG_PERSISTENT_BUILD_CACHE` environment variable option no longer have effect. Configure `cli.cache` in the workspace configuration instead.

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "cli": {
    "cache": {
      "enabled": true,
      "path": ".custom-cache-path",
      "environment": "all"
    }
  }
  ...
}
```

- Calling `BuilderContext.scheduleBuilder()` with a builder from `@angular-devkit/build-angular` now requires passing the `target` property in the 3rd argument, like in the following example:

  ```typescript
  context.scheduleBuilder('@angular-devkit/build-angular:ng-packagr', options, {
    target: context.target,
  });
  ```

- The automatic inclusion of Angular-required ES2015 polyfills to support ES5 browsers has been removed. Previously when targeting ES5 within the application's TypeScript configuration or listing an ES5 requiring browser in the browserslist file, Angular-required polyfills were included in the built application. However, with Angular no longer supporting IE11, there are now no browsers officially supported by Angular that would require these polyfills. As a result, the automatic inclusion of these ES2015 polyfills has been removed. Any polyfills manually added to an application's code are not affected by this change.

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

- With this change we removed several deprecated builder options
- `extractCss` has been removed from the browser builder. CSS is now always extracted.
- `servePathDefaultWarning` and `hmrWarning` have been removed from the dev-server builder. These options had no effect.

- Deprecated `@angular-devkit/build-angular:tslint` builder has been removed. Use https://github.com/angular-eslint/angular-eslint instead.

- Differential loading support has been removed. With Angular no longer supporting IE11, there are now no browsers officially supported by Angular that require ES5 code. As a result, differential loading's functionality for creating and conditionally loading ES5 and ES2015+ variants of an application is no longer required.

- TypeScript versions prior to 4.4 are no longer supported.

- The dev-server now uses WebSockets to communicate changes to the browser during HMR and live-reloaded. If during your development you are using a proxy you will need to enable proxying of WebSockets.

- We remove inlining of Google fonts in WOFF format since IE 11 is no longer supported. Other supported browsers use WOFF2.

### @angular-devkit/build-webpack

- Support for `webpack-dev-server` version 3 has been removed. For more information about the migration please see: https://github.com/webpack/webpack-dev-server/blob/master/migration-v4.md

Note: this change only affects users depending on `@angular-devkit/build-webpack` directly.

### @angular-devkit/core

- With this change we drop support for the deprecated behaviour to transform `id` in schemas. Use `$id` instead.

Note: this only effects schematics and builders authors.

- The deprecated JSON parser has been removed from public API. [jsonc-parser](https://www.npmjs.com/package/jsonc-parser) should be used instead.

### @angular-devkit/schematics

- `isAction` has been removed without replacement as it was unused.

- With this change we remove the following deprecated APIs
- `TslintFixTask`
- `TslintFixTaskOptions`

**Note:** this only effects schematics developers.

### @ngtools/webpack

- Deprecated `inlineStyleMimeType` option has been removed from `AngularWebpackPluginOptions`. Use `inlineStyleFileExtension` instead.

- Applications directly using the `webpack-cli` and not the Angular CLI to build must set the environment variable `DISABLE_V8_COMPILE_CACHE=1`. The `@ngtools/webpack` package now uses dynamic imports to provide support for the ESM `@angular/compiler-cli` package. The `v8-compile-cache` package used by the `webpack-cli` does not currently support dynamic import expressions and will cause builds to fail if the environment variable is not specified. Applications using the Angular CLI are not affected by this limitation.

## Deprecations

###

- `@angular-devkit/build-optimizer`

It's functionality has been included in `@angular-devkit/build-angular` so this package is no longer needed by the CLI and we will stop publishing the package soon. It has been an experimental (never hit `1.0.0`) and internal (only used by Angular itself) package and should be not be used directly by others.

### @angular-devkit/build-angular

- `NG_BUILD_CACHE` environment variable option will be removed in the next major version. Configure `cli.cache` in the workspace configuration instead.

### @angular/cli

| Commit                                                                                              | Type | Description                                                         |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------- |
| [9fe55752d](https://github.com/angular/angular-cli/commit/9fe55752db8bb50cad5a1ddfe670dce06528e23e) | feat | officially support Node.js v16                                      |
| [5ad145722](https://github.com/angular/angular-cli/commit/5ad145722f66af526a36983b259c6d625c93f307) | fix  | error when updating Angular packages across multi-major migrations  |
| [e4bc35e33](https://github.com/angular/angular-cli/commit/e4bc35e332e378f8d238f4069dc56f422fe205d6) | fix  | exclude packages from ng add that contain invalid peer dependencies |
| [e1b954d70](https://github.com/angular/angular-cli/commit/e1b954d707f90622d8a75fc45840cefeb224c286) | fix  | keep relative migration paths during update analysis                |
| [c3acf3cc2](https://github.com/angular/angular-cli/commit/c3acf3cc26b9e37a3b8f4c369f42731f46b522ee) | fix  | remove unused cli project options.                                  |
| [77fe6c4e6](https://github.com/angular/angular-cli/commit/77fe6c4e67147ff42fa6350edaf4ef7dc184a3a6) | fix  | update `engines` to require `node` `12.20.0`                        |
| [8795536a3](https://github.com/angular/angular-cli/commit/8795536a31efbed6373787188cb21c5d1e0accbd) | fix  | update `ng update` output for Angular packages                      |
| [d8c9f6eaf](https://github.com/angular/angular-cli/commit/d8c9f6eaf4513639741d20c6af97a751b33b968e) | fix  | update the update command to fully support Node.js v16              |

### @schematics/angular

| Commit                                                                                              | Type | Description                                                                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------- |
| [7ff8c5350](https://github.com/angular/angular-cli/commit/7ff8c5350ea2e49574dd659adae02215957d2685) | feat | add `/.angular/cache` to `.gitignore`                                                       |
| [3ba13f467](https://github.com/angular/angular-cli/commit/3ba13f467c12f4ad0c314cc92a2d94fb63f640ec) | feat | add `noImplicitOverride` and `noPropertyAccessFromIndexSignature` to workspace tsconfig     |
| [268a03b63](https://github.com/angular/angular-cli/commit/268a03b63094d9c680401bc0977edafb22826ce3) | feat | add migration to update the workspace config                                                |
| [7bdcd7da1](https://github.com/angular/angular-cli/commit/7bdcd7da1ff3a31f4958d90d856beb297e99b187) | feat | create new projects with rxjs 7                                                             |
| [eac18aed7](https://github.com/angular/angular-cli/commit/eac18aed78da55efb840a3ef6f5e90718946504c) | feat | drop polyfills required only for Internet Explorer now that support has been dropped for it |
| [4f91816b2](https://github.com/angular/angular-cli/commit/4f91816b2951c0e2b0109ad1938eb0ae632c0c76) | feat | migrate libraries to be published from ViewEngine to Ivy Partial compilation                |
| [5986befcd](https://github.com/angular/angular-cli/commit/5986befcdc953c0e8c90c756ac1c89b8c4b66614) | feat | remove deprecated options                                                                   |
| [9fbd16655](https://github.com/angular/angular-cli/commit/9fbd16655e86ec6fc598a47436e3e80a48beb649) | feat | remove IE 11 specific polyfills                                                             |
| [a7b2e6f51](https://github.com/angular/angular-cli/commit/a7b2e6f512d2a1124f0d2c68caacfe6552a10cd5) | feat | update ngsw-config resources extensions                                                     |
| [732ef7985](https://github.com/angular/angular-cli/commit/732ef798523f74994ed3d482a65b191058674d19) | fix  | add browserslist configuration in library projects                                          |
| [585adacd0](https://github.com/angular/angular-cli/commit/585adacd0624ddf32c5c69a755d8e542f3463861) | fix  | don't add `destroyAfterEach` in newly generated spec files                                  |
| [e58226ee9](https://github.com/angular/angular-cli/commit/e58226ee948ea88f27a81d50d71945b5c9c39ee3) | fix  | don't export `renderModuleFactory` from server file                                         |
| [0ec0ad8a4](https://github.com/angular/angular-cli/commit/0ec0ad8a4dba4a778b368c5cd76ef13fb370b310) | fix  | remove `target` and `lib` options for library tsconfig                                      |
| [f227e145d](https://github.com/angular/angular-cli/commit/f227e145dfbec2954cb96c92ab3c4cb97cbe0f32) | fix  | updated Angular new project version to v13.0 prerelease                                     |

###

| Commit                                                                                              | Type | Description                                           |
| --------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| [5e435ff37](https://github.com/angular/angular-cli/commit/5e435ff37703f9ffea7fa92fbd5cd42d9a3db07e) | docs | mark `@angular-devkit/build-optimizer` as deprecated. |

### @angular-devkit/architect

| Commit                                                                                              | Type | Description                                      |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------ |
| [09e039500](https://github.com/angular/angular-cli/commit/09e039500f34b0d6a16e62128409ac5821e8b9c2) | feat | include workspace extensions in project metadata |

### @angular-devkit/build-angular

| Commit                                                                                              | Type     | Description                                                                   |
| --------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| [f53bf9dc2](https://github.com/angular/angular-cli/commit/f53bf9dc21ee9aa8a682b8a82ee8a9870fa859e1) | feat     | add `type=module` to all scripts tags                                         |
| [e95ecb8ab](https://github.com/angular/angular-cli/commit/e95ecb8ab0382eb803741619c446d6cc7b215ba0) | feat     | deprecate deployUrl                                                           |
| [7dcfffaff](https://github.com/angular/angular-cli/commit/7dcfffafff6f3d29bbe679a90cdf77b1292fec0b) | feat     | drop support for `karma-coverage-instanbul-reporter`                          |
| [ac3fc2752](https://github.com/angular/angular-cli/commit/ac3fc2752f28761e1cd42157b59dcf2364ae5567) | feat     | drop support for `node-sass`                                                  |
| [5904afd1d](https://github.com/angular/angular-cli/commit/5904afd1de3ffa0bb6cd1757795ba9abfce9e523) | feat     | enable disk cache by default and provide configurable options                 |
| [22cd9edfa](https://github.com/angular/angular-cli/commit/22cd9edfafd357bb9d62a93dd56f033b3f34bbe8) | feat     | favor es2020 main fields                                                      |
| [7576136b2](https://github.com/angular/angular-cli/commit/7576136b2fc8a9173b0a92e2ab14c9bc2559081e) | feat     | remove automatic inclusion of ES5 browser polyfills                           |
| [000b0e51c](https://github.com/angular/angular-cli/commit/000b0e51c166ecd26b6f24d6a133ea5076df9849) | feat     | remove deprecated dev-server options                                          |
| [20e48a33c](https://github.com/angular/angular-cli/commit/20e48a33c14a1b0b959ba0a45018df53a3e129c8) | feat     | remove deprecated options                                                     |
| [e78f6ab5d](https://github.com/angular/angular-cli/commit/e78f6ab5d8f00338d826c8407ce5c8fca40cf097) | feat     | remove deprecated tslint builder                                              |
| [701214d17](https://github.com/angular/angular-cli/commit/701214d174586fe7373b6155024c9b6e97b26377) | feat     | remove differential loading support                                           |
| [fb1ad7c5b](https://github.com/angular/angular-cli/commit/fb1ad7c5b3fa3df85f1d3dff3850e1ad0003ef9d) | feat     | support ESM proxy configuration files for the dev server                      |
| [505438cc4](https://github.com/angular/angular-cli/commit/505438cc4146b1950038531ce30e1f62f7c41d00) | feat     | support TypeScript 4.4                                                        |
| [32dbf659a](https://github.com/angular/angular-cli/commit/32dbf659acb632fac1d76d99d8191ea9c5e6350b) | feat     | update `webpack-dev-server` to version 4                                      |
| [c1efaa17f](https://github.com/angular/angular-cli/commit/c1efaa17feb1d2911dcdea12688d75086d410bf1) | fix      | calculate valid Angular versions from peerDependencies                        |
| [d7af4a7b5](https://github.com/angular/angular-cli/commit/d7af4a7b536a7c43704f808ea208bc9f230d2403) | fix      | enable custom `es2020` and `es2015` conditional exports                       |
| [f383f3201](https://github.com/angular/angular-cli/commit/f383f3201b69d28f8755c0bd63134619f9da408d) | fix      | ESM-interop loaded plugin creators of `@angular/localize/tools` not respected |
| [7934becb5](https://github.com/angular/angular-cli/commit/7934becb581d07c8e1f74898ddd4c20f050be659) | fix      | generate unique webpack runtimes                                              |
| [b14e0a547](https://github.com/angular/angular-cli/commit/b14e0a54727352a6939c7a0ff13dffe2deaa67d2) | fix      | improve sourcemaps fidelity when code coverage is enabled                     |
| [e19287453](https://github.com/angular/angular-cli/commit/e19287453c10740ea21b31a6c8a3cd5f3714955d) | fix      | move `@angular/localize` detection prior to webpack initialization            |
| [76d6d8826](https://github.com/angular/angular-cli/commit/76d6d8826f9968f84edf219f67b84673d70bbe95) | fix      | set browserslist defaults                                                     |
| [167eed465](https://github.com/angular/angular-cli/commit/167eed4654be4480c45d7fdfe7a0b9f160170289) | fix      | update Angular peer dependencies to v13.0 prerelease                          |
| [1d8cdf853](https://github.com/angular/angular-cli/commit/1d8cdf853dc8fdea78b067a715b3342ed9427caa) | fix      | update esbuild to 0.13.12                                                     |
| [884111ac0](https://github.com/angular/angular-cli/commit/884111ac0b8a73dca06d844b2ed795a3e3ed3289) | fix      | update IE unsupported and deprecation messages                                |
| [4be6537dd](https://github.com/angular/angular-cli/commit/4be6537ddf4b32e8d204dbaa75f1a53712fe9d44) | fix      | update TS/JS regexp checks to latest extensions                               |
| [427a9ee97](https://github.com/angular/angular-cli/commit/427a9ee9738c0911caeaba5fb4b59d183ffe6244) | fix      | update workspace tsconfig lib es2020                                          |
| [ea926db25](https://github.com/angular/angular-cli/commit/ea926db257ad3b042af86178e472b5763a695146) | fix      | use es2015 when generating server bundles                                     |
| [13cceab8e](https://github.com/angular/angular-cli/commit/13cceab8e737a12d0809f184f852ceb5620d81fb) | fix      | use URLs for absolute import paths with ESM                                   |
| [4e0743c8a](https://github.com/angular/angular-cli/commit/4e0743c8ad5879f212f2ea232ac9492848a8df2c) | perf     | change webpack hashing function to `xxhash64`                                 |
| [cb7d156c2](https://github.com/angular/angular-cli/commit/cb7d156c23a7ef2f1c2f338db1487b85f8b98690) | perf     | use esbuild as a CSS optimizer for global styles                              |
| [8e82263c5](https://github.com/angular/angular-cli/commit/8e82263c5e7da6ca25bdd4e2ce9ad2c775d623b7) | perf     | use esbuild/terser combination to optimize global scripts                     |
| [e82eef924](https://github.com/angular/angular-cli/commit/e82eef924eb172a98fa157a958bde2cfcaa52ce6) | refactor | remove WOFF handling from inline-fonts processor                              |

### @angular-devkit/build-webpack

| Commit                                                                                              | Type | Description                              |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------- |
| [a0b5897d5](https://github.com/angular/angular-cli/commit/a0b5897d50a00ee4668029c2cbc47cacd2ab925f) | feat | update `webpack-dev-server` to version 4 |
| [9efcb32e3](https://github.com/angular/angular-cli/commit/9efcb32e378442714eae4caec43281123c5e30f6) | fix  | better handle concurrent dev-servers     |

### @angular-devkit/core

| Commit                                                                                              | Type     | Description                                                                  |
| --------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| [0c92ea5ca](https://github.com/angular/angular-cli/commit/0c92ea5ca34d82849862d55c4210cf62c819d514) | feat     | remove deprecated schema id handling                                         |
| [9874aff71](https://github.com/angular/angular-cli/commit/9874aff71ecb5f3baf6c1dcc489581d1dcb58491) | fix      | add missing option peer dependency on `chokidar`                             |
| [a54e5e065](https://github.com/angular/angular-cli/commit/a54e5e06551c828eb5cf08695674e04fd8a78bf3) | fix      | support Node.js v16 with `NodeJsSyncHost`/`NodeJsAsyncHost` delete operation |
| [d722fdf1f](https://github.com/angular/angular-cli/commit/d722fdf1f67c394762906794605bc1ad657670d1) | refactor | remove deprecated JSON parser                                                |

### @angular-devkit/schematics

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [0565ed62e](https://github.com/angular/angular-cli/commit/0565ed62eb08c1e82cffb2533e6afde216c37eb7) | feat | add UpdateBuffer2 based on magic-string                  |
| [8954d1152](https://github.com/angular/angular-cli/commit/8954d1152b6c1a33dd7d4b63d2fa430d91e7b370) | feat | remove deprecated `isAction`                             |
| [053b7d66c](https://github.com/angular/angular-cli/commit/053b7d66c269423804891e4d43d61f8605838e24) | feat | remove deprecated tslint APIs                            |
| [bdd89ae84](https://github.com/angular/angular-cli/commit/bdd89ae84ad6919b670dde862de72f562c86d0c5) | fix  | handle zero or negative length removals in update buffer |

### @ngtools/webpack

| Commit                                                                                              | Type     | Description                                           |
| --------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------- |
| [d2a97f919](https://github.com/angular/angular-cli/commit/d2a97f9193fcf7e454fe8eb48c0ed732d3b2f24f) | fix      | update Angular peer dependencies to v13.0 prerelease  |
| [7928b18ed](https://github.com/angular/angular-cli/commit/7928b18edf34243a404b5a4f40a5d6e40247d797) | perf     | reduce repeat path mapping analysis during resolution |
| [8ce8e4edc](https://github.com/angular/angular-cli/commit/8ce8e4edc5ca2984d6a36fe4c7d308fa7f089102) | refactor | remove deprecated `inlineStyleMimeType` option        |
| [7d98ab3df](https://github.com/angular/angular-cli/commit/7d98ab3df9f7c15612c69cedca5a01a535301508) | refactor | support an ESM-only `@angular/compiler-cli` package   |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Douglas Parker, Joey Perrott, Kristiyan Kostadinov, Lukas Spirig and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.9"></a>

# 12.2.9 (2021-10-06)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                          |
| --------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| [9d45b7752](https://github.com/angular/angular-cli/commit/9d45b77522a9693c4876fdfd741e8869e89e0268) | fix  | add web-streams-polyfill to downlevel exclusion list |
| [ccedf53a8](https://github.com/angular/angular-cli/commit/ccedf53a820a748b56c84528294b36c7af30dbaf) | fix  | update `esbuild` to `0.13.4`                         |

## Special Thanks

Alan Agius and Charles Lyding

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

<a name="12.2.7"></a>

# 12.2.7 (2021-09-22)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                   |
| --------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------- |
| [d856b4d23](https://github.com/angular/angular-cli/commit/d856b4d2369bea76ce65fc5f6d1585145ad41618) | fix  | support WASM-based esbuild optimizer fallback |

## Special Thanks

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.5"></a>

# 12.2.5 (2021-09-08)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                              |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| [0498768c5](https://github.com/angular/angular-cli/commit/0498768c54de225a40c28fdf27bb1fc43959ba20) | fix  | disable dev-server response compression                  |
| [367fce2e9](https://github.com/angular/angular-cli/commit/367fce2e9f9389c41f2ed5361ef6749198c49785) | fix  | improve Safari browserslist to esbuild target conversion |

## Special Thanks:

Alan Agius and Charles Lyding

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.4"></a>

# 12.2.4 (2021-09-01)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                 |
| --------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------- |
| [aaadef026](https://github.com/angular/angular-cli/commit/aaadef02698ba729ca04ccd4159bda5b6582babb) | fix  | update `esbuild` to `0.12.24`               |
| [f8a9f4a01](https://github.com/angular/angular-cli/commit/f8a9f4a0100286b7cf656ffbe486c3424cad5172) | fix  | update `mini-css-extract-plugin` to `2.2.1` |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.2.3"></a>

# 12.2.3 (2021-08-26)

### @angular-devkit/build-angular

| Commit                                                                                              | Type | Description                                                    |
| --------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| [3e3321857](https://github.com/angular/angular-cli/commit/3e33218578007f93a131dc8be569e9985179098f) | fix  | RGBA converted to hex notation in component styles breaks IE11 |

## Special Thanks:

Alan Agius and Trevor Karjanis

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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
| [41e645792](https://github.com/angular/angular-cli/commit/41e64579213b9d4a7c976ea45daa6b32d980df10) | fix(@angular-devkit/build-angular): downlevel `for await...of` when targeting ES2018+                                          |
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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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
   style="vertical-align: top"
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
   style="vertical-align: top"
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
   style="vertical-align: top"
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
   style="vertical-align: top"
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
   style="vertical-align: top"
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
   style="vertical-align: top"
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
   style="vertical-align: top"
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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

  <td>downlevel `for await...of` when targeting ES2018+</td>

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

<!-- CHANGELOG SPLIT MARKER -->

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

  <td>downlevel `for await...of` when targeting ES2018+</td>

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

  <td>support using TypeScript 4.3</td>

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

  <td>support using TypeScript 4.3</td>

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

  <td>Support XDG Base Directory Specification</td>

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
`entryComponent` option has been removed from the `component` schematic as this was intended to be used with the now no longer supported ViewEngine rendering engine.

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

See: https://angular.dev/reference/configs/workspace-config#optimization-configuration

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

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-rc.3"></a>

# v12.0.0-rc.3 (2021-05-10)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular/cli (12.0.0-rc.3)</h3></td></tr>
  <tr>
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-rc.2"></a>

# v12.0.0-rc.2 (2021-05-05)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0-rc.2)</h3></td></tr>
  <tr>
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-rc.1"></a>

# v12.0.0-rc.1 (2021-04-28)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0-rc.1)</h3></td></tr>
  <tr>
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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

  <td>Support XDG Base Directory Specification</td>

  <td>
  </td>
</tr>

<tr><td colspan=3><h3>@schematics/angular (12.0.0-rc.1)</h3></td></tr>
  <tr>
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-rc.0"></a>

# v12.0.0-rc.0 (2021-04-21)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0-rc.0)</h3></td></tr>
  <tr>
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.9"></a>

# v12.0.0-next.9 (2021-04-14)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (12.0.0-next.9)</h3></td></tr>
  <tr>
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.8"></a>

# v12.0.0-next.8 (2021-04-07)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.8)</h3></td></tr>
  <tr>
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.7"></a>

# v12.0.0-next.7 (2021-04-02)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.7)</h3></td></tr>
  <tr>
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
`entryComponent` option has been removed from the `component` schematic as this was intended to be used with the now no longer supported ViewEngine rendering engine.

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

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.6"></a>

# v12.0.0-next.6 (2021-03-24)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.6)</h3></td></tr>
  <tr>
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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

<!-- CHANGELOG SPLIT MARKER -->

<a name="v12.0.0-next.5"></a>

# v12.0.0-next.5 (2021-03-18)

# Commits

<table>
<tbody>

<tr><td colspan=3><h3>@angular-devkit/build-angular (0.1200.0-next.5)</h3></td></tr>
  <tr>
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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
    <td><strong>Commit</strong>
    <td><strong>Description</strong>
    <td><strong>Notes</strong>
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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

See: https://angular.dev/reference/configs/workspace-config#optimization-configuration

---

# Special Thanks

Renovate Bot, Charles Lyding, Alan Agius, Keen Yee Liau, Douglas Parker, twerske

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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

<!-- CHANGELOG SPLIT MARKER -->

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
