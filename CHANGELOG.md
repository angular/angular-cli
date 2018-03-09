# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="5.0.0-beta.6"></a>
# 5.0.0-beta.6 (2018-02-28)

### Bug Fixes

* **express-engine:** node 9 strict engine error ([853](https://github.com/angular/universal/pull/853)) ([e4a9775](https://github.com/angular/universal/commit/e4a97754e62d5418faad3837a88a21b710aa3d8d)), closes [851](https://github.com/angular/universal/issues/851)
* **aspnetcore-engine:** fix ServerTransferStateModule and TransferState ([889](https://github.com/angular/universal/pull/889)) ([14c7616](https://github.com/angular/universal/commit/14c76166ac36c2de619c733531432fd109e4bb67))

**BREAKING CHANGE**:

The tokens for `express-engine` and `hapi-engine` are now imported at top-level. Do the following:

```ts
import {REQUEST, RESPONSE} from '@nguniversal/express-engine';
```

instead of

```ts
import {REQUEST, RESPONSE} from '@nguniversal/express-engine/tokens';
```

Note: there is a slight bundling/tree-shaking issue with this new structure which should be resolved in the next release. The current workaround is to temporarily downgrade to the previous version.


### Features

* **engines:** add optional url and document to render options ([#810](https://github.com/angular/universal/pull/810)) ([90b445b](https://github.com/angular/universal/commit/90b445b2b317e58003b9d6d51835139efb542422))
* **build:** add unit testing with karma ([891](https://github.com/angular/universal/pull/891)) ([a4d9f14b](https://github.com/angular/universal/commit/a4d9f14b39bbed2e5c7fec24dede0a89b9f97ae0))

<a name="5.0.0-beta.5"></a>
# 5.0.0-beta.5 (2017-10-31)
