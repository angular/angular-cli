# Change Log (DEPRECATED)

### SEE https://github.com/angular/universal/releases FOR RELEASE BASED CHANGELOG

<a name="8.1.1"></a>

## [8.1.1](https://github.com/angular/universal/compare/v8.1.0...v8.1.1) (2019-07-04)

### Bug Fixes

- **schematics:** ng add removes options from browser builder ([#1190](https://github.com/angular/universal/issues/1190)) ([10d68fc](https://github.com/angular/universal/commit/10d68fc)), closes [#1189](https://github.com/angular/universal/issues/1189) [#1189](https://github.com/angular/universal/issues/1189)

<a name="8.1.0"></a>

# [8.1.0](https://github.com/angular/universal/compare/v8.0.0-rc.1...v8.1.0) (2019-07-03)

### Bug Fixes

- **express-engine:** add bundleDependencies and lazy-loading fixes ([#1167](https://github.com/angular/universal/issues/1167)) ([d8be7af](https://github.com/angular/universal/commit/d8be7af))
- **hapi-engine:** add bundleDependencies and lazy-loading fixes ([#1188](https://github.com/angular/universal/issues/1188)) ([e688092](https://github.com/angular/universal/commit/e688092))
- **hapi-engine:** fix broken unit test ([6ef8e47](https://github.com/angular/universal/commit/6ef8e47))

### Features

- **hapi-engine:** add ModuleMapLoaderModule to the app server imports during ng-add ([#1143](https://github.com/angular/universal/issues/1143)) ([81af213](https://github.com/angular/universal/commit/81af213))

<a name="7.1.1"></a>

## [7.1.1](https://github.com/angular/universal/compare/v7.1.0...v7.1.1) (2019-03-07)

### Features

- **express-engine:** add ModuleMapLoaderModule to the app server imports during ng-add ([#1130](https://github.com/angular/universal/issues/1130)) ([e776dfc](https://github.com/angular/universal/commit/e776dfc))

<a name="7.1.0"></a>

# [7.1.0](https://github.com/angular/universal/compare/v7.0.2...v7.1.0) (2019-01-19)

### Bug Fixes

- **common:** check if DOMContentLoaded already fired ([#1104](https://github.com/angular/universal/issues/1104)) ([0e38dd1](https://github.com/angular/universal/commit/0e38dd1))
- **common:** check if readyState is interactive not loaded ([#1109](https://github.com/angular/universal/issues/1109)) ([e80b2f1](https://github.com/angular/universal/commit/e80b2f1))
- **express-engine:** remove unneeded dep from schematics server ([#1090](https://github.com/angular/universal/issues/1090)) ([cfa3909](https://github.com/angular/universal/commit/cfa3909))
- **readme:** use circle ci build badge, update img url, add socketengine ([#1111](https://github.com/angular/universal/issues/1111)) ([abcfbfb](https://github.com/angular/universal/commit/abcfbfb))

### Features

- **hapi-engine:** add schematics ([#1057](https://github.com/angular/universal/issues/1057)) ([a4bf3d9](https://github.com/angular/universal/commit/a4bf3d9))
- **modules:** pass in absolute URL as default for view rendering ([#897](https://github.com/angular/universal/issues/897)) ([77e298a](https://github.com/angular/universal/commit/77e298a))

<a name="7.0.2"></a>

## [7.0.2](https://github.com/angular/universal/compare/v7.0.0...v7.0.2) (2018-10-18)

<a name="7.0.0"></a>

# [7.0.0](https://github.com/angular/universal/compare/v7.0.0-rc.1...v7.0.0) (2018-10-18)

<a name="7.0.0-rc.1"></a>

# [7.0.0-rc.1](https://github.com/angular/universal/compare/v7.0.0-rc.0...v7.0.0-rc.1) (2018-10-12)

### Bug Fixes

- **express-engine:** modify dist directories to provide consistent access ([#1082](https://github.com/angular/universal/issues/1082)) ([4dc0482](https://github.com/angular/universal/commit/4dc0482))

<a name="7.0.0-rc.0"></a>

# [7.0.0-rc.0](https://github.com/angular/universal/compare/v6.1.0...v7.0.0-rc.0) (2018-10-11)

### Bug Fixes

- **express-engine:** add webpack option to schematics ([#1081](https://github.com/angular/universal/issues/1081)) ([0922de7](https://github.com/angular/universal/commit/0922de7)), closes [#1080](https://github.com/angular/universal/issues/1080)

### Features

- **express-engine:** add option to skip Universal schematic ([#1059](https://github.com/angular/universal/issues/1059)) ([9ebb943](https://github.com/angular/universal/commit/9ebb943))
- **socket-engine:** add providers parameter ([#1072](https://github.com/angular/universal/issues/1072)) ([c16860c](https://github.com/angular/universal/commit/c16860c))

<a name="6.1.0"></a>

# [6.1.0](https://github.com/angular/universal/compare/v6.0.0...v6.1.0) (2018-08-23)

### Bug Fixes

- **common:** fixup secondary entrypoints ([#1017](https://github.com/angular/universal/issues/1017)) ([7bb0e9b](https://github.com/angular/universal/commit/7bb0e9b))
- **common:** remove internal monicker for FileLoader ([#1009](https://github.com/angular/universal/issues/1009)) ([23f0d0f](https://github.com/angular/universal/commit/23f0d0f))
- **express-engine:** add server configuration to schematics ([#1056](https://github.com/angular/universal/issues/1056)) ([b031a26](https://github.com/angular/universal/commit/b031a26))

### Features

- **common:** add CommonEngine to encapsulate rendering ([#996](https://github.com/angular/universal/issues/996)) ([439b306](https://github.com/angular/universal/commit/439b306))
- **common:** TransferHttpCache now respects url params ([#1005](https://github.com/angular/universal/issues/1005)) ([f09c51d](https://github.com/angular/universal/commit/f09c51d))
- **express-engine:** add schematics ([#1051](https://github.com/angular/universal/issues/1051)) ([1909be1](https://github.com/angular/universal/commit/1909be1)), closes [#968](https://github.com/angular/universal/issues/968)
- **hapi:** upgrade to Hapi v17 ([#1015](https://github.com/angular/universal/issues/1015)) ([311b9fe](https://github.com/angular/universal/commit/311b9fe))
- **socket-engine:** introduce package ([#999](https://github.com/angular/universal/issues/999)) ([de33b02](https://github.com/angular/universal/commit/de33b02))

### BREAKING CHANGES

- **hapi:** \* The `ngHapiEngine` is no longer supported for Hapi v16. The `RESPONSE` token provided under `@nguniversal/hapi-engine/tokens` now uses the new `ResponseToolkit`, which is unavailable in Hapi v16. Updated instructions are available in the package's README

<a name="6.0.0"></a>

# [6.0.0](https://github.com/angular/universal/compare/v6.0.0-rc.1...v6.0.0) (2018-05-03)

<a name="6.0.0-rc.2"></a>

# [6.0.0-rc.2](https://github.com/angular/universal/compare/v6.0.0-rc.1...v6.0.0-rc.2) (2018-04-24)

<a name="6.0.0-rc.1"></a>

# [6.0.0-rc.1](https://github.com/angular/universal/compare/v6.0.0-rc.0...v6.0.0-rc.1) (2018-04-24)

<a name="6.0.0-rc.0"></a>

# [6.0.0-rc.0](https://github.com/angular/universal/compare/v5.0.0...v6.0.0-rc.0) (2018-04-24)

### Features

- **common:** enable StateTransferInitializerModule ([#948](https://github.com/angular/universal/issues/948)) ([6ff2844](https://github.com/angular/universal/commit/6ff2844))

<a name="6.0.0-rc.0"></a>

# [6.0.0-rc.0](https://github.com/angular/universal/compare/v5.0.0...v6.0.0-rc.0) (2018-04-24)

### Features

- **common:** enable StateTransferInitializerModule ([#948](https://github.com/angular/universal/issues/948)) ([6ff2844](https://github.com/angular/universal/commit/6ff2844))

<a name="5.0.0"></a>

# [5.0.0](https://github.com/angular/universal/compare/5.0.0-beta.8...5.0.0) (2018-04-02)

<a name="5.0.0-beta.8"></a>

# 5.0.0-beta.8 (2018-03-23)

### build

- fix secondary entrypoints and bundle with APF v5 ([#940](https://github.com/angular/universal/issues/940)) ([ce1baff](https://github.com/angular/universal/commit/ce1baff))

<a name="5.0.0-beta.7"></a>

# 5.0.0-beta.7 (2018-03-21)

### build

- re-introduce build.sh ([#930](https://github.com/angular/universal/issues/930)) ([7704d56](https://github.com/angular/universal/commit/7704d56))

### Features

- **common:** introduce StateTransferInitializerModule ([#916](https://github.com/angular/universal/issues/916)) ([5aef476](https://github.com/angular/universal/commit/5aef476))

<a name="5.0.0-beta.6"></a>

# 5.0.0-beta.6 (2018-02-28)

### Bug Fixes

- **express-engine:** node 9 strict engine error ([853](https://github.com/angular/universal/pull/853)) ([e4a9775](https://github.com/angular/universal/commit/e4a97754e62d5418faad3837a88a21b710aa3d8d)), closes [851](https://github.com/angular/universal/issues/851)
- **aspnetcore-engine:** fix ServerTransferStateModule and TransferState ([889](https://github.com/angular/universal/pull/889)) ([14c7616](https://github.com/angular/universal/commit/14c76166ac36c2de619c733531432fd109e4bb67))

**BREAKING CHANGE**:

The tokens for `express-engine` and `hapi-engine` are now imported at top-level. Do the following:

```ts
import { REQUEST, RESPONSE } from '@nguniversal/express-engine';
```

instead of

```ts
import { REQUEST, RESPONSE } from '@nguniversal/express-engine/tokens';
```

Note: there is a slight bundling/tree-shaking issue with this new structure which should be resolved in the next release. The current workaround is to temporarily downgrade to the previous version.

### Features

- **engines:** add optional url and document to render options ([#810](https://github.com/angular/universal/pull/810)) ([90b445b](https://github.com/angular/universal/commit/90b445b2b317e58003b9d6d51835139efb542422))
- **build:** add unit testing with karma ([891](https://github.com/angular/universal/pull/891)) ([a4d9f14b](https://github.com/angular/universal/commit/a4d9f14b39bbed2e5c7fec24dede0a89b9f97ae0))

<a name="5.0.0-beta.5"></a>

# 5.0.0-beta.5 (2017-10-31)
