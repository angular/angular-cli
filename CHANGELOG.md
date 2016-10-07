<a name="1.0.0-beta.17"></a>
# [1.0.0-beta.17](https://github.com/angular/angular-cli/compare/v1.0.0-beta.16...v1.0.0-beta.17) (2016-10-07)


### Bug Fixes

* **build:** remove html-loader ([#2537](https://github.com/angular/angular-cli/issues/2537)) ([afb36e8](https://github.com/angular/angular-cli/commit/afb36e8))
* **build:** use baseUrl and paths from tsconfig ([#2470](https://github.com/angular/angular-cli/issues/2470)) ([32e60b7](https://github.com/angular/angular-cli/commit/32e60b7))
* **cli:** fix `completion` and `make-this-awesome` command invalid problem([#1889](https://github.com/angular/angular-cli/issues/1889)) ([4b36ecf](https://github.com/angular/angular-cli/commit/4b36ecf)), closes [#1890](https://github.com/angular/angular-cli/issues/1890)
* **generate:** use prefix when initializing app ([#2046](https://github.com/angular/angular-cli/issues/2046)) ([#2367](https://github.com/angular/angular-cli/issues/2367)) ([06976f4](https://github.com/angular/angular-cli/commit/06976f4))
* **typo:** fixed typo in README ([#2383](https://github.com/angular/angular-cli/issues/2383)) ([f6a39b2](https://github.com/angular/angular-cli/commit/f6a39b2))
* **webpack:** Added ContextReplacementPlugin to remove ng test warning ([c2f4b37](https://github.com/angular/angular-cli/commit/c2f4b37)), closes [#2362](https://github.com/angular/angular-cli/issues/2362)
* check for old version of the CLI on empty project ([2b6bfe7](https://github.com/angular/angular-cli/commit/2b6bfe7)), closes [#2135](https://github.com/angular/angular-cli/issues/2135) [#2178](https://github.com/angular/angular-cli/issues/2178)


### Features

* **aot:** adding README and type checking. ([8a5b265](https://github.com/angular/angular-cli/commit/8a5b265)), closes [#2527](https://github.com/angular/angular-cli/issues/2527)
* **aot:** creating files in a virtual fs. ([#2464](https://github.com/angular/angular-cli/issues/2464)) ([790a1b4](https://github.com/angular/angular-cli/commit/790a1b4))
* **aot:** do not populate the whole filesystem if nothing changed ([#2490](https://github.com/angular/angular-cli/issues/2490)) ([b5771df](https://github.com/angular/angular-cli/commit/b5771df))
* **template:** issue template look better ([#2384](https://github.com/angular/angular-cli/issues/2384)) ([398cfb3](https://github.com/angular/angular-cli/commit/398cfb3))



<a name="1.0.0-beta.16"></a>
# [1.0.0-beta.16](https://github.com/angular/angular-cli/compare/v1.0.0-beta.15...v1.0.0-beta.16) (2016-09-28)


### Bug Fixes

* **build:** fail ng build on error ([#2360](https://github.com/angular/angular-cli/issues/2360)) ([aa48c30](https://github.com/angular/angular-cli/commit/aa48c30)), closes [#2014](https://github.com/angular/angular-cli/issues/2014)
* **build:** use config output path as default ([#2158](https://github.com/angular/angular-cli/issues/2158)) ([49a120b](https://github.com/angular/angular-cli/commit/49a120b))
* **generate:** Update directive.spec.ts blueprint to fix incorret import ([#1940](https://github.com/angular/angular-cli/issues/1940)) ([93da512](https://github.com/angular/angular-cli/commit/93da512))
* **karma:** set defaults for karma.conf.js ([#1837](https://github.com/angular/angular-cli/issues/1837)) ([e2e94a5](https://github.com/angular/angular-cli/commit/e2e94a5))
* **test:** correctly report packages spec failures ([#2238](https://github.com/angular/angular-cli/issues/2238)) ([3102453](https://github.com/angular/angular-cli/commit/3102453))


### Features

* **webpackDevServer:** Add watchOptions for webpackDevServer ([#1814](https://github.com/angular/angular-cli/issues/1814)) ([ce03088](https://github.com/angular/angular-cli/commit/ce03088))



<a name="1.0.0-beta.15"></a>
# [1.0.0-beta.15](https://github.com/angular/angular-cli/compare/v1.0.0-beta.14...v1.0.0-beta.15) (2016-09-20)


### Bug Fixes

* **help:** fix a bug where help was not available inside a project. ([#2146](https://github.com/angular/angular-cli/issues/2146)) ([5b880b2](https://github.com/angular/angular-cli/commit/5b880b2))
* pin beta package versions ([#2236](https://github.com/angular/angular-cli/issues/2236)) ([638a54b](https://github.com/angular/angular-cli/commit/638a54b)), closes [#2234](https://github.com/angular/angular-cli/issues/2234)



<a name="1.0.0-beta.14"></a>
# [1.0.0-beta.14](https://github.com/angular/angular-cli/compare/v1.0.0-beta.11-webpack.2...v1.0.0-beta.14) (2016-09-15)


### Bug Fixes

* **config:** change css regex which causes error ([#2069](https://github.com/angular/angular-cli/issues/2069)) ([7096cc9](https://github.com/angular/angular-cli/commit/7096cc9)), closes [angular/angular#11445](https://github.com/angular/angular/issues/11445)
* **init:** fix link and npm install ([#2086](https://github.com/angular/angular-cli/issues/2086)) ([7a39162](https://github.com/angular/angular-cli/commit/7a39162))



<a name="1.0.0-beta.11-webpack.9"></a>
# [1.0.0-beta.11-webpack.9](https://github.com/angular/angular-cli/compare/v1.0.0-beta.11-webpack.2...v1.0.0-beta.11-webpack.9) (2016-09-13)


### Bug Fixes

* add ast-tools as a direct dependency to angular-cli ([bf18f4d](https://github.com/angular/angular-cli/commit/bf18f4d))
* **bootstrap:** fix windows node_modules path ([#2037](https://github.com/angular/angular-cli/issues/2037)) ([c41600a](https://github.com/angular/angular-cli/commit/c41600a))
* **find-lazy-modules:** Allow for any valid keys/value to be used ([#1987](https://github.com/angular/angular-cli/issues/1987)) ([caa3142](https://github.com/angular/angular-cli/commit/caa3142)), closes [#1891](https://github.com/angular/angular-cli/issues/1891) [#1960](https://github.com/angular/angular-cli/issues/1960)
* **lint:** Updated the main.ts's blueprint to fix the ng lint failure ([#1903](https://github.com/angular/angular-cli/issues/1903)) ([#1904](https://github.com/angular/angular-cli/issues/1904)) ([0d9d646](https://github.com/angular/angular-cli/commit/0d9d646))
* add loader for gif ([#2066](https://github.com/angular/angular-cli/issues/2066)) ([126c82b](https://github.com/angular/angular-cli/commit/126c82b)), closes [#1878](https://github.com/angular/angular-cli/issues/1878)
* lazy loading now works as expected with latest webpack ([#2038](https://github.com/angular/angular-cli/issues/2038)) ([33c9c73](https://github.com/angular/angular-cli/commit/33c9c73))
* **test:** add build environment to karma ([#2074](https://github.com/angular/angular-cli/issues/2074)) ([b6a2165](https://github.com/angular/angular-cli/commit/b6a2165))


### Features

* **module:** add ability to generate a routing file for new modules ([#1971](https://github.com/angular/angular-cli/issues/1971)) ([9ddba69](https://github.com/angular/angular-cli/commit/9ddba69))
* **module:** select module to add generations to for declaration ([#1966](https://github.com/angular/angular-cli/issues/1966)) ([a647e51](https://github.com/angular/angular-cli/commit/a647e51))



<a name="1.0.0-beta.11-webpack.3"></a>
# [1.0.0-beta.11-webpack.3](https://github.com/angular/angular-cli/compare/v1.0.0-beta.11-webpack.2...v1.0.0-beta.11-webpack.3) (2016-08-29)


### Bug Fixes

* **lint:** change " to ' ([#1779](https://github.com/angular/angular-cli/issues/1779)) ([e572bb4](https://github.com/angular/angular-cli/commit/e572bb4))
* change inline-source-map to source-map for dev and common, prod already supports ([#1659](https://github.com/angular/angular-cli/issues/1659)) ([e0454e3](https://github.com/angular/angular-cli/commit/e0454e3))
* **test:** use updated ngModules in blueprint ([#1680](https://github.com/angular/angular-cli/issues/1680)) ([cb67d25](https://github.com/angular/angular-cli/commit/cb67d25))
* denodeify is needed in prod now too ([#1879](https://github.com/angular/angular-cli/issues/1879)) ([5e68151](https://github.com/angular/angular-cli/commit/5e68151))
* **build:** copy dot files in assets ([8c566ca](https://github.com/angular/angular-cli/commit/8c566ca)), closes [#1758](https://github.com/angular/angular-cli/issues/1758) [#1847](https://github.com/angular/angular-cli/issues/1847)
* fix compilation errors for the whole project ([#1864](https://github.com/angular/angular-cli/issues/1864)) ([8be7096](https://github.com/angular/angular-cli/commit/8be7096))
* **config:** misnamed variable causing errors. ([e9ea554](https://github.com/angular/angular-cli/commit/e9ea554))
* **generate:** use canonical paths for template and style URLs ([339af33](https://github.com/angular/angular-cli/commit/339af33)), closes [#1840](https://github.com/angular/angular-cli/issues/1840)
* **init:** karma paths reflect sourceDir config ([#1686](https://github.com/angular/angular-cli/issues/1686)) ([504a497](https://github.com/angular/angular-cli/commit/504a497)), closes [#1683](https://github.com/angular/angular-cli/issues/1683)
* **mobile:** add `icons/` path in front of icon `src` values ([cc5e9ad](https://github.com/angular/angular-cli/commit/cc5e9ad)), closes [#1179](https://github.com/angular/angular-cli/issues/1179) [#1181](https://github.com/angular/angular-cli/issues/1181)
* **mobile:** remove icon `density` field from manifest ([382487b](https://github.com/angular/angular-cli/commit/382487b)), closes [#1178](https://github.com/angular/angular-cli/issues/1178) [#1180](https://github.com/angular/angular-cli/issues/1180)
* **prod:** fix function name mangling ([9188ea2](https://github.com/angular/angular-cli/commit/9188ea2)), closes [#1644](https://github.com/angular/angular-cli/issues/1644) [#1644](https://github.com/angular/angular-cli/issues/1644) [#1662](https://github.com/angular/angular-cli/issues/1662)
* improve 'ember'->'ng' replacement ([80512ba](https://github.com/angular/angular-cli/commit/80512ba)), closes [#1405](https://github.com/angular/angular-cli/issues/1405) [#1829](https://github.com/angular/angular-cli/issues/1829)
* removed travis-specific configuration from karma ([#1815](https://github.com/angular/angular-cli/issues/1815)) ([f03f275](https://github.com/angular/angular-cli/commit/f03f275))


### Features

* add features in get-dependent-files.ts ([#1525](https://github.com/angular/angular-cli/issues/1525)) ([7565f2d](https://github.com/angular/angular-cli/commit/7565f2d))
* Add LCOV reporting by default in karma remap instanbul reporter ([#1657](https://github.com/angular/angular-cli/issues/1657)) ([10dd465](https://github.com/angular/angular-cli/commit/10dd465))
* **build:** implement --base-href argument ([74b29b3](https://github.com/angular/angular-cli/commit/74b29b3)), closes [#1064](https://github.com/angular/angular-cli/issues/1064) [#1506](https://github.com/angular/angular-cli/issues/1506)
* **build:** silence sourcemap warnings for vendors ([#1673](https://github.com/angular/angular-cli/issues/1673)) ([67098e0](https://github.com/angular/angular-cli/commit/67098e0))
* **build:** update angular-cli.json ([#1633](https://github.com/angular/angular-cli/issues/1633)) ([3dcd49b](https://github.com/angular/angular-cli/commit/3dcd49b))
* **feature:** add ability to generate feature modules ([#1867](https://github.com/angular/angular-cli/issues/1867)) ([1f4c6fe](https://github.com/angular/angular-cli/commit/1f4c6fe))
* **module:** add generation of modules ([f40e6f1](https://github.com/angular/angular-cli/commit/f40e6f1)), closes [#1650](https://github.com/angular/angular-cli/issues/1650)
* **serve:** add proxy support ([9d69748](https://github.com/angular/angular-cli/commit/9d69748))
* **tslint:** add validation for selector prefix ([9ff8c09](https://github.com/angular/angular-cli/commit/9ff8c09)), closes [#1565](https://github.com/angular/angular-cli/issues/1565)



<a name="1.0.0-beta.11-webpack.2"></a>
# [1.0.0-beta.11-webpack.2](https://github.com/angular/angular-cli/compare/v1.0.0-beta.10-webpack...v1.0.0-beta.11-webpack.2) (2016-08-10)


### Bug Fixes

* **webpack-copy:** copies files from public/ directory to dist/ and preserves references ([b11bc94](https://github.com/angular/angular-cli/commit/b11bc94))
* Set fs building/polyfill empty for better package support ([#1599](https://github.com/angular/angular-cli/issues/1599)) ([560ae8f](https://github.com/angular/angular-cli/commit/560ae8f))
* Updated webpack-karma which has proper peer deps settings ([#1597](https://github.com/angular/angular-cli/issues/1597)) ([ace720b](https://github.com/angular/angular-cli/commit/ace720b))


### Features

* add utility functions for route generation ([#1330](https://github.com/angular/angular-cli/issues/1330)) ([4fd8e9c](https://github.com/angular/angular-cli/commit/4fd8e9c))
* ngmodules and insert components based on the AST ([#1616](https://github.com/angular/angular-cli/issues/1616)) ([5bcb7be](https://github.com/angular/angular-cli/commit/5bcb7be))



<a name="1.0.0-beta.11-webpack"></a>
# [1.0.0-beta.11-webpack](https://github.com/angular/angular-cli/compare/v1.0.0-beta.10...v1.0.0-beta.11-webpack) (2016-08-02)

Hey you! Yes, you! Angular-CLI team here. You know us, but we don't know you enough. And we like to hear about you too. That's why we did this release, so that you could check out for us, as we're looking out for you.

Anyway, here goes...

### Features

🎺 **We moved the build system from SystemJS to Webpack.** 🎉

🎊 Yeah! 🎊 \^_\^

This is kind of a big deal, really. This will mean less thinking about the internals of the CLI and SystemJS, less time spent configuring a new npm package and karma, your life is going to be much easier! More coding where it actually matters, faster builds, more time spent with your loved ones, and lots of other goodies. Just for you. You'll love it!

We want to make sure it's ready. That's why we need your help. Basically, things _should_ work. Build and Serve should work. Also, testing and E2E should too. To put it short, everything should work as it was before. But we're not certain! Test every commands you can think of. Use your normal work flows. We need you to test your projects and file issues about it.

If you have a special build file that requires shuffling files around in Broccoli, give it a try without that. Note that TypeScript 2.0 path mapping is supported by the CLI so that might help you find out files.

There's a migration document to move your project over. It's not complete yet, but we're working on it. Here's the PR: https://github.com/angular/angular-cli/pull/1456. The main take away is that most build configuration and system configuration should not be needed anymore.

Please note that this is a really alpha release of this, and we want to tighten every nut and bolt before making it an official beta.

Which we will release. Shortly after we tighten it up. Because we love you, our users, very much. And we want to help you make your apps awesome. With webpack.

\- The Angular-CLI team

Oh, almost forgot. Also:

* **tests:** allow to create component without a spec file ([a85a507](https://github.com/angular/angular-cli/commit/a85a507)), closes [#1256](https://github.com/angular/angular-cli/issues/1256)
* add module-resolver utils ([b8ddeec](https://github.com/angular/angular-cli/commit/b8ddeec))
* add utilities for typescript ast ([#1159](https://github.com/angular/angular-cli/issues/1159)) ([0cfc2bf](https://github.com/angular/angular-cli/commit/0cfc2bf))



<a name="1.0.0-beta.10"></a>
# [1.0.0-beta.10](https://github.com/angular/angular-cli/compare/1.0.0-beta.9...v1.0.0-beta.10) (2016-07-19)


### Bug Fixes

* **build:** don't ignore js in public ([#1129](https://github.com/angular/angular-cli/issues/1129)) ([00e111a](https://github.com/angular/angular-cli/commit/00e111a)), closes [#540](https://github.com/angular/angular-cli/issues/540)
* **mobile:** remove app/index.js from concatenated bundle ([#1267](https://github.com/angular/angular-cli/issues/1267)) ([03fd4c4](https://github.com/angular/angular-cli/commit/03fd4c4))
* Fix all versions of dependencies to Angular-CLI ([#1331](https://github.com/angular/angular-cli/issues/1331)) ([022e7f9](https://github.com/angular/angular-cli/commit/022e7f9)), closes [#1331](https://github.com/angular/angular-cli/issues/1331)
* fix versions in the shrinkwrap instead of using ranges ([#1350](https://github.com/angular/angular-cli/issues/1350)) ([72bc9d9](https://github.com/angular/angular-cli/commit/72bc9d9)), closes [#1350](https://github.com/angular/angular-cli/issues/1350)


### Features

* **router:** upgrade the router version ([#1288](https://github.com/angular/angular-cli/issues/1288)) ([2c9a371](https://github.com/angular/angular-cli/commit/2c9a371))
* add get-dependent-fils utils ([6590743](https://github.com/angular/angular-cli/commit/6590743))



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

