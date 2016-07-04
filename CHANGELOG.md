**Always follow the [update guide](https://github.com/angular/angular-cli/blob/master/README.md#updating-angular-cli) when updating to a new version. The changelog does not list breaking changes that are fixed via the update procedure.**

---

<a name="1.0.0-beta.9"></a>
# [1.0.0-beta.9](https://github.com/angular/angular-cli/compare/v1.0.0-beta.6...v1.0.0-beta.9) (2016-07-04)


### Bug Fixes

* **npm:** update to npm 3.10.2 ([#1250](https://github.com/angular/angular-cli/issues/1250)) ([6f0ebfb](https://github.com/angular/angular-cli/commit/6f0ebfb)), closes [#1186](https://github.com/angular/angular-cli/issues/1186) [#1191](https://github.com/angular/angular-cli/issues/1191) [#1201](https://github.com/angular/angular-cli/issues/1201) [#1209](https://github.com/angular/angular-cli/issues/1209) [#1207](https://github.com/angular/angular-cli/issues/1207) [#1248](https://github.com/angular/angular-cli/issues/1248)
* **sass:** don't compile partials ([af9a4f9](https://github.com/angular/angular-cli/commit/af9a4f9))



<a name="1.0.0-beta.7"></a>
# 1.0.0-beta.7 (2016-06-23)


### Bug Fixes

* **deps:** update router (#1121) ([b90a110](https://github.com/angular/angular-cli/commit/b90a110))
* **e2e:** prevent chrome race condition (#1141) ([9df0ffe](https://github.com/angular/angular-cli/commit/9df0ffe))
* **init:** don't replace live reload script on diffs (#1128) ([e97fd9f](https://github.com/angular/angular-cli/commit/e97fd9f)), closes [#1122](https://github.com/angular/angular-cli/issues/1122)
* **lint:** add missing rulesDirectory (#1108) ([1690a82](https://github.com/angular/angular-cli/commit/1690a82)), closes [#1094](https://github.com/angular/angular-cli/issues/1094)
* **mobile:** partially fix dep problem (#1151) ([4b638c8](https://github.com/angular/angular-cli/commit/4b638c8)), closes [(#1151](https://github.com/(/issues/1151)

### Features

* add file system utilities for 'upgrade' process ([327f649](https://github.com/angular/angular-cli/commit/327f649))



<a name="1.0.0-beta.6"></a>
# 1.0.0-beta.6 (2016-06-15)


### Bug Fixes

* **admin:** added support for non Administrator CLI user ([0bc3d94](https://github.com/angular/angular-cli/commit/0bc3d94)), closes [#905](https://github.com/angular/angular-cli/issues/905) [#886](https://github.com/angular/angular-cli/issues/886) [#370](https://github.com/angular/angular-cli/issues/370)
* **barrel:** alphabetized barrel exports ([67b577d](https://github.com/angular/angular-cli/commit/67b577d)), closes [#582](https://github.com/angular/angular-cli/issues/582)
* **deploy:** Fix base href for user pages (#965) ([424cff2](https://github.com/angular/angular-cli/commit/424cff2)), closes [(#965](https://github.com/(/issues/965)
* **e2e:** return exit codes on failure of e2e tests ([d0c07ac](https://github.com/angular/angular-cli/commit/d0c07ac)), closes [#1017](https://github.com/angular/angular-cli/issues/1017) [#1025](https://github.com/angular/angular-cli/issues/1025) [#1044](https://github.com/angular/angular-cli/issues/1044)
* **generator:** --dry-run no longer modifies files ([6efc8ee](https://github.com/angular/angular-cli/commit/6efc8ee))
* Persist style extension config at project creation. ([85c9aec](https://github.com/angular/angular-cli/commit/85c9aec)), closes [#780](https://github.com/angular/angular-cli/issues/780)
* skips git-init if working folder is inside a git repo ([52c0cfb](https://github.com/angular/angular-cli/commit/52c0cfb)), closes [#802](https://github.com/angular/angular-cli/issues/802)
* **gh-deploy:** fix deep links (#1020) ([f8f8179](https://github.com/angular/angular-cli/commit/f8f8179)), closes [(#1020](https://github.com/(/issues/1020) [#995](https://github.com/angular/angular-cli/issues/995)
* **mobile:** add missing vendor file to build (#972) ([9a7bfe0](https://github.com/angular/angular-cli/commit/9a7bfe0)), closes [#847](https://github.com/angular/angular-cli/issues/847)
* **mobile:** lock dependency (#961) ([740805b](https://github.com/angular/angular-cli/commit/740805b)), closes [#958](https://github.com/angular/angular-cli/issues/958)
* **sourcemaps:** try to improve the source maps by fixing the path (#1028) ([5f909aa](https://github.com/angular/angular-cli/commit/5f909aa))
* **template:** Update pipe template to include Pipe in name ([c92f330](https://github.com/angular/angular-cli/commit/c92f330)), closes [#869](https://github.com/angular/angular-cli/issues/869)

### Features

* allow lazy route prefix to be configurable ([c3fd9c7](https://github.com/angular/angular-cli/commit/c3fd9c7)), closes [#842](https://github.com/angular/angular-cli/issues/842)
* **router:** upgrade the router version ([eb9b80e](https://github.com/angular/angular-cli/commit/eb9b80e))
* **style:** automatically add dependencies if style is set on new projects ([01e31ab](https://github.com/angular/angular-cli/commit/01e31ab)), closes [#986](https://github.com/angular/angular-cli/issues/986)
* **test:** run e2e of generated project (#490) ([d0dbd70](https://github.com/angular/angular-cli/commit/d0dbd70))


### BREAKING CHANGES

* The router has been updated to the newest version, usage of the deprecated router and the original release candidate routers are no longer supported

* `<PROJECT-NAME>AppComponent` is now simply `AppComponent`, and it's selector is now `app-root` (https://github.com/angular/angular-cli/pull/1042).

* Route generation is temporarily disabled while we move to the [recently announce router](http://angularjs.blogspot.ie/2016/06/improvements-coming-for-routing-in.html)(https://github.com/angular/angular-cli/pull/992). It is recommended that users manually move to this router in all new projects.



<a name="1.0.0-beta.5"></a>
# 1.0.0-beta.5 (2016-05-19)


### Bug Fixes

* **build:** fix broken sourcemaps (#839) ([234de2b](https://github.com/angular/angular-cli/commit/234de2b)), closes [(#839](https://github.com/(/issues/839)

### Features

* **blueprint:** add blueprint for generating interfaces (#757) ([482aa74](https://github.com/angular/angular-cli/commit/482aa74)), closes [#729](https://github.com/angular/angular-cli/issues/729)
* **test:** use link-cli option on e2e (#841) ([85d1400](https://github.com/angular/angular-cli/commit/85d1400))

### Performance Improvements

* **ng new:** command to link to `angular-cli` (#778) ([9b8334f](https://github.com/angular/angular-cli/commit/9b8334f))



<a name="1.0.0-beta.4"></a>
# 1.0.0-beta.4 (2016-05-18)


### Bug Fixes

* **build:** fix infinite loop on ng serve (#775) ([285db13](https://github.com/angular/angular-cli/commit/285db13)), closes [(#775](https://github.com/(/issues/775)
* **deploy:** fix file copy, index tag rewrite (#772) ([a34aca8](https://github.com/angular/angular-cli/commit/a34aca8)), closes [(#772](https://github.com/(/issues/772)
* **index:** fix live reload file path (#774) ([be718cb](https://github.com/angular/angular-cli/commit/be718cb)), closes [(#774](https://github.com/(/issues/774)
* **mobile:** don't import system-config in system-import.js (#794) ([7ab7d72](https://github.com/angular/angular-cli/commit/7ab7d72))
* **mobile:** make app-shell compilation synchronous ([9ed28ba](https://github.com/angular/angular-cli/commit/9ed28ba))
* **mobile:** prevent already-bundled JS from getting cached by Service Worker ([9d18f74](https://github.com/angular/angular-cli/commit/9d18f74))

### Features

* **mobile:** add app shell to mobile blueprint (#809) ([e7d7ed8](https://github.com/angular/angular-cli/commit/e7d7ed8))
* **SASSPlugin:** Allow regexes to be passed to include/exclude certain file patterns ([6b45099](https://github.com/angular/angular-cli/commit/6b45099)), closes [#558](https://github.com/angular/angular-cli/issues/558)



<a name="1.0.0-beta.2-mobile.3"></a>
# 1.0.0-beta.2-mobile.3 (2016-05-13)


### Bug Fixes

* **broccoli-typescript:** properly parse compilerOptions (#764) ([bbf1bc8](https://github.com/angular/angular-cli/commit/bbf1bc8))
* **mobile:** include vendor scripts in bundle ([679d0e6](https://github.com/angular/angular-cli/commit/679d0e6)), closes [#733](https://github.com/angular/angular-cli/issues/733)
* **mobile:** remove mobile-specific dependencies from root package ([263e23b](https://github.com/angular/angular-cli/commit/263e23b))
* **mobile:** update path to reflect updated service worker package (#746) ([818fb19](https://github.com/angular/angular-cli/commit/818fb19))
* **package:** temporarily remove angular2-service-worker ([7f86ab3](https://github.com/angular/angular-cli/commit/7f86ab3))

### Features

* **blueprints:** add enum blueprint. ([eddb354](https://github.com/angular/angular-cli/commit/eddb354)), closes [#707](https://github.com/angular/angular-cli/issues/707)



<a name="1.0.0-beta.2-mobile"></a>
# 1.0.0-beta.2-mobile (2016-05-12)


### Bug Fixes

* package.json use sourceDir for new command ([8dcd996](https://github.com/angular/angular-cli/commit/8dcd996))
* use options sourceDir, and fix null property access. Also use 1.9 ([7ba388d](https://github.com/angular/angular-cli/commit/7ba388d)), closes [#619](https://github.com/angular/angular-cli/issues/619)
* **710:** Missing http module dependency ([c0aadae](https://github.com/angular/angular-cli/commit/c0aadae))
* **commands:** fix outdated string utils import. ([7db40df](https://github.com/angular/angular-cli/commit/7db40df))

### Features

* **mobile:** add blueprint for app manifest and icons ([f717bde](https://github.com/angular/angular-cli/commit/f717bde))
* **mobile:** add prod build step to concatenate scripts ([51569ce](https://github.com/angular/angular-cli/commit/51569ce))
* **mobile:** add ServiceWorker generation to build process and index ([04593eb](https://github.com/angular/angular-cli/commit/04593eb))
* **mobile:** add support for generating App Shell in index.html ([cb1270f](https://github.com/angular/angular-cli/commit/cb1270f))
* **ng2 blueprint:** add test script entry to package.json ([eabc160](https://github.com/angular/angular-cli/commit/eabc160))



<a name="1.0.0-beta.1"></a>
# 1.0.0-beta.1 (2016-05-07)


### Bug Fixes

* **generated-project:** cli was not using the correct version of CLI in generated project. (#672) ([02073ae](https://github.com/angular/angular-cli/commit/02073ae))

