<a name="1.0.0-rc.4"></a>
# [1.0.0-rc.4](https://github.com/angular/angular-cli/compare/v1.0.0-rc.2...v1.0.0-rc.4) (2017-03-20)

### Notes

* To align with @angular/core behavior, all `templateUrl` and `styleUrls` are now treated as relative - developers should use the `./foo.html` form in all cases.
* Certain systems have issues installing the `node-sass` dependency, causing `npm install` to fail. `node-sass` is now an optional dependency, which will prevent installation failures on unsupported systems.
* The CLI no longer depends on a specific Angular version - this should lead to fewer version mismatch errors.

### Bug Fixes

* **@angular/cli:** all styleUrls and templateUrl are relative ([9b52253](https://github.com/angular/angular-cli/commit/9b52253)), closes [#5056](https://github.com/angular/angular-cli/issues/5056)
* **@angular/cli:** don't fail install due to node-sass ([#5282](https://github.com/angular/angular-cli/issues/5282)) ([1e47657](https://github.com/angular/angular-cli/commit/1e47657)), closes [#4429](https://github.com/angular/angular-cli/issues/4429)
* **@angular/cli:** fix error handling on test ([9cda847](https://github.com/angular/angular-cli/commit/9cda847)), closes [#2778](https://github.com/angular/angular-cli/issues/2778) [#3424](https://github.com/angular/angular-cli/issues/3424)
* **@angular/cli:** fix test typings ([303b2c0](https://github.com/angular/angular-cli/commit/303b2c0)), closes [#3911](https://github.com/angular/angular-cli/issues/3911) [#5332](https://github.com/angular/angular-cli/issues/5332) [#5351](https://github.com/angular/angular-cli/issues/5351)
* **@angular/cli:** generating will dasherize all new dirs ([#5437](https://github.com/angular/angular-cli/issues/5437)) ([d6504e2](https://github.com/angular/angular-cli/commit/d6504e2)), closes [#5424](https://github.com/angular/angular-cli/issues/5424)
* **@angular/cli:** ignore the whole "coverage" directory ([1fa27aa](https://github.com/angular/angular-cli/commit/1fa27aa))
* **@angular/cli:** obey the flat option when generating modules ([#5411](https://github.com/angular/angular-cli/issues/5411)) ([0fe1949](https://github.com/angular/angular-cli/commit/0fe1949)), closes [#5373](https://github.com/angular/angular-cli/issues/5373)
* **@angular/cli:** remove dependencies to [@angular](https://github.com/angular) ([b965a49](https://github.com/angular/angular-cli/commit/b965a49))
* **@angular/cli:** sourcemaps should be the main option, sourcemap an alias ([d94040b](https://github.com/angular/angular-cli/commit/d94040b))
* **@angular/cli:** updates module.id subsequent variable typing ([#5500](https://github.com/angular/angular-cli/issues/5500)) ([7087195](https://github.com/angular/angular-cli/commit/7087195))
* **@ngtools/webpack:** add parent nodes and keep program ([ebb495d](https://github.com/angular/angular-cli/commit/ebb495d)), closes [#5143](https://github.com/angular/angular-cli/issues/5143) [#4817](https://github.com/angular/angular-cli/issues/4817)
* **@ngtools/webpack:** only remove moduleId in decorators ([82ddc5c](https://github.com/angular/angular-cli/commit/82ddc5c)), closes [#5509](https://github.com/angular/angular-cli/issues/5509)
* **@ngtools/webpack:** remove webpack plugins peer deps on [@angular](https://github.com/angular)/core ([507b399](https://github.com/angular/angular-cli/commit/507b399))
* **@ngtools/webpack:** when an error happens rediagnose the file ([4bd8bd2](https://github.com/angular/angular-cli/commit/4bd8bd2)), closes [#4810](https://github.com/angular/angular-cli/issues/4810) [#5404](https://github.com/angular/angular-cli/issues/5404)



<a name="1.0.0-rc.2"></a>
# [1.0.0-rc.2](https://github.com/angular/angular-cli/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2017-03-13)

### Bug Fixes

* **@angular/cli:** add missing alias for guard blueprint ([#5339](https://github.com/angular/angular-cli/issues/5339)) ([9b70fda](https://github.com/angular/angular-cli/commit/9b70fda)), closes [#5336](https://github.com/angular/angular-cli/issues/5336)
* **@angular/cli:** Align tsconfig output dir to out-tsc. Add out-tsc to .gitignore ([e9372d3](https://github.com/angular/angular-cli/commit/e9372d3)), closes [#5220](https://github.com/angular/angular-cli/issues/5220)
* **@angular/cli:** don't break deployUrl with scheme ([501e974](https://github.com/angular/angular-cli/commit/501e974)), closes [#5254](https://github.com/angular/angular-cli/issues/5254)
* **@angular/cli:** eject command removes EOF ([7461528](https://github.com/angular/angular-cli/commit/7461528)), closes [#5387](https://github.com/angular/angular-cli/issues/5387)
* **@angular/cli:** enforce loglevel warn for npm-install ([07e93c0](https://github.com/angular/angular-cli/commit/07e93c0)), closes [#5010](https://github.com/angular/angular-cli/issues/5010)
* **@angular/cli:** ensure lint generates well-formed machine output ([c99cf96](https://github.com/angular/angular-cli/commit/c99cf96)), closes [#5259](https://github.com/angular/angular-cli/issues/5259) [#5224](https://github.com/angular/angular-cli/issues/5224)
* **@angular/cli:** fix e2e after eject ([3b39843](https://github.com/angular/angular-cli/commit/3b39843)), closes [#4957](https://github.com/angular/angular-cli/issues/4957)
* **@angular/cli:** Fix filtering files on completion ([cf14a15](https://github.com/angular/angular-cli/commit/cf14a15)), closes [#4664](https://github.com/angular/angular-cli/issues/4664) [#4972](https://github.com/angular/angular-cli/issues/4972)
* **@angular/cli:** fix ide import errors ([8a1b1f9](https://github.com/angular/angular-cli/commit/8a1b1f9))
* **@angular/cli:** fix issue with console prompt bailing early ([#5218](https://github.com/angular/angular-cli/issues/5218)) ([3515c3b](https://github.com/angular/angular-cli/commit/3515c3b)), closes [#4614](https://github.com/angular/angular-cli/issues/4614) [#5127](https://github.com/angular/angular-cli/issues/5127)
* **@angular/cli:** fix TS2.1 typeroots ([#5251](https://github.com/angular/angular-cli/issues/5251)) ([1c2f361](https://github.com/angular/angular-cli/commit/1c2f361)), closes [#5082](https://github.com/angular/angular-cli/issues/5082)
* **@angular/cli:** Fixing aliases for blueprint help ([b6cc79c](https://github.com/angular/angular-cli/commit/b6cc79c))
* **@angular/cli:** Fixing generate help command fix ([7f0333a](https://github.com/angular/angular-cli/commit/7f0333a))
* **@angular/cli:** Fixing set prefix issue ([#5301](https://github.com/angular/angular-cli/issues/5301)) ([1f8363a](https://github.com/angular/angular-cli/commit/1f8363a))
* **@angular/cli:** Fixing setting enums ([7e2c04f](https://github.com/angular/angular-cli/commit/7e2c04f))
* **@angular/cli:** karma config is default for test command ([#5263](https://github.com/angular/angular-cli/issues/5263)) ([c2a8569](https://github.com/angular/angular-cli/commit/c2a8569))
* **@angular/cli:** Log xi18n errors ([a54115c](https://github.com/angular/angular-cli/commit/a54115c)), closes [#5129](https://github.com/angular/angular-cli/issues/5129) [#5223](https://github.com/angular/angular-cli/issues/5223)
* **@angular/cli:** make flag values case insensitive ([#5355](https://github.com/angular/angular-cli/issues/5355)) ([8d8ddfc](https://github.com/angular/angular-cli/commit/8d8ddfc)), closes [#5344](https://github.com/angular/angular-cli/issues/5344)
* **@angular/cli:** only adjust root relative stylesheet urls ([1e7d519](https://github.com/angular/angular-cli/commit/1e7d519)), closes [#5238](https://github.com/angular/angular-cli/issues/5238)
* **@angular/cli:** remove outdated test command option `--build` ([fcb1f35](https://github.com/angular/angular-cli/commit/fcb1f35)), closes [#5235](https://github.com/angular/angular-cli/issues/5235)
* **@angular/cli:** remove providers from routing modules ([#5349](https://github.com/angular/angular-cli/issues/5349)) ([c8e5359](https://github.com/angular/angular-cli/commit/c8e5359))
* **@angular/cli:** rephrased warning message ([e314135](https://github.com/angular/angular-cli/commit/e314135)), closes [#5006](https://github.com/angular/angular-cli/issues/5006)
* **@angular/cli:** use inheritance for ng4 ([7c3ce6b](https://github.com/angular/angular-cli/commit/7c3ce6b)), closes [#5111](https://github.com/angular/angular-cli/issues/5111)
* **@angular/cli:** yarn install does not support --quiet ([#5310](https://github.com/angular/angular-cli/issues/5310)) ([5e54a01](https://github.com/angular/angular-cli/commit/5e54a01))
* **@angular/cli:** bump to tslint 4.5.0 ([a78a727](https://github.com/angular/angular-cli/commit/a78a727)), closes [#5099](https://github.com/angular/angular-cli/issues/5099)
* **@angular/cli:** use standard stackTraceLimit ([#5284](https://github.com/angular/angular-cli/issues/5284)) ([5c9c653](https://github.com/angular/angular-cli/commit/5c9c653))



<a name="1.0.0-rc.1"></a>
# [1.0.0-rc.1](https://github.com/angular/angular-cli/compare/v1.0.0-rc.0...v1.0.0-rc.1) (2017-03-03)


### Bug Fixes

* **@angular/cli:** add dom to lib array ([#5060](https://github.com/angular/angular-cli/issues/5060)) ([dd9eb17](https://github.com/angular/angular-cli/commit/dd9eb17)), closes [#5046](https://github.com/angular/angular-cli/issues/5046)
* **@angular/cli:** add typing for module.id for SystemJS usage ([21d776f](https://github.com/angular/angular-cli/commit/21d776f))
* **@angular/cli:** fix access to sections of package.json that dont exist ([#5074](https://github.com/angular/angular-cli/issues/5074)) ([211270d](https://github.com/angular/angular-cli/commit/211270d)), closes [#5070](https://github.com/angular/angular-cli/issues/5070)
* **@angular/cli:** fix webdriver deep import on yarn ([#5057](https://github.com/angular/angular-cli/issues/5057)) ([97bfb12](https://github.com/angular/angular-cli/commit/97bfb12)), closes [#4596](https://github.com/angular/angular-cli/issues/4596)
* **@angular/cli:** Fixing duplicate aliases issue ([#4987](https://github.com/angular/angular-cli/issues/4987)) ([0fc2190](https://github.com/angular/angular-cli/commit/0fc2190))
* **@angular/cli:** ignore ts-node when attempting to run karma with a linked cli ([#4997](https://github.com/angular/angular-cli/issues/4997)) ([7b8f692](https://github.com/angular/angular-cli/commit/7b8f692)), closes [#4568](https://github.com/angular/angular-cli/issues/4568) [#4177](https://github.com/angular/angular-cli/issues/4177)
* **@angular/cli:** look for existing manifest in src/ as well ([7f03b5a](https://github.com/angular/angular-cli/commit/7f03b5a))
* **@angular/cli:** pass the base href through to the sw plugin ([f3644a9](https://github.com/angular/angular-cli/commit/f3644a9))
* **@ngtools/webpack:** Bump loader-utils and use getOptions ([#5001](https://github.com/angular/angular-cli/issues/5001)) ([864d520](https://github.com/angular/angular-cli/commit/864d520))
* **@ngtools/webpack:** continue past invalid imports ([#5028](https://github.com/angular/angular-cli/issues/5028)) ([dbd71b7](https://github.com/angular/angular-cli/commit/dbd71b7))


### Features

* **@angular/cli:** add new xi18n parameters --locale and --outFile ([#5154](https://github.com/angular/angular-cli/issues/5154)) ([d52d290](https://github.com/angular/angular-cli/commit/d52d290)), closes [#5145](https://github.com/angular/angular-cli/issues/5145)



<a name="1.0.0-rc.0"></a>
# [1.0.0-rc.0](https://github.com/angular/angular-cli/compare/v1.0.0-beta.32...v1.0.0-rc.0) (2017-02-25)


### Bug Fixes

* **@angular/cli:** add $schema as a schema prop ([#4779](https://github.com/angular/angular-cli/issues/4779)) ([ab06196](https://github.com/angular/angular-cli/commit/ab06196))
* **@angular/cli:** add more description ([b4594ba](https://github.com/angular/angular-cli/commit/b4594ba))
* **@angular/cli:** adding help descriptions ([7ebe4f0](https://github.com/angular/angular-cli/commit/7ebe4f0))
* **@angular/cli:** allow flat modules from Angular RC ([#4969](https://github.com/angular/angular-cli/issues/4969)) ([a537dce](https://github.com/angular/angular-cli/commit/a537dce))
* **@angular/cli:** apps fixes ([#4942](https://github.com/angular/angular-cli/issues/4942)) ([c57ce2a](https://github.com/angular/angular-cli/commit/c57ce2a))
* **@angular/cli:** cache config by file path. ([#4902](https://github.com/angular/angular-cli/issues/4902)) ([198d27a](https://github.com/angular/angular-cli/commit/198d27a))
* **@angular/cli:** conform to style-guide import line spacing ([#4954](https://github.com/angular/angular-cli/issues/4954)) ([c3dd28a](https://github.com/angular/angular-cli/commit/c3dd28a))
* **@angular/cli:** fix angular-cli logic ([00f913c](https://github.com/angular/angular-cli/commit/00f913c))
* **@angular/cli:** fix css url processing  ([#4803](https://github.com/angular/angular-cli/issues/4803)) ([a2e819a](https://github.com/angular/angular-cli/commit/a2e819a)), closes [#4778](https://github.com/angular/angular-cli/issues/4778) [#4782](https://github.com/angular/angular-cli/issues/4782) [#4806](https://github.com/angular/angular-cli/issues/4806)
* **@angular/cli:** fix ng lint formatted output ([#4917](https://github.com/angular/angular-cli/issues/4917)) ([0d8799e](https://github.com/angular/angular-cli/commit/0d8799e))
* **@angular/cli:** fixing the help command aliases ([#4880](https://github.com/angular/angular-cli/issues/4880)) ([ba30cc1](https://github.com/angular/angular-cli/commit/ba30cc1))
* **@angular/cli:** Headless win32 now works as expected ([#4871](https://github.com/angular/angular-cli/issues/4871)) ([4af7a42](https://github.com/angular/angular-cli/commit/4af7a42)), closes [#4870](https://github.com/angular/angular-cli/issues/4870)
* **@angular/cli:** improve matching range to match beta/rc ([#4989](https://github.com/angular/angular-cli/issues/4989)) ([d2d788b](https://github.com/angular/angular-cli/commit/d2d788b))
* **@angular/cli:** put aliases for local config too ([#4886](https://github.com/angular/angular-cli/issues/4886)) ([2abbce2](https://github.com/angular/angular-cli/commit/2abbce2))
* **@angular/cli:** remove ng from blueprints help, simplify blueprints logic ([d4b56e4](https://github.com/angular/angular-cli/commit/d4b56e4)), closes [#4887](https://github.com/angular/angular-cli/issues/4887)
* **@angular/cli:** show help on just ng command ([#4780](https://github.com/angular/angular-cli/issues/4780)) ([b6d8511](https://github.com/angular/angular-cli/commit/b6d8511)), closes [#4776](https://github.com/angular/angular-cli/issues/4776)
* update dependencies in yarn.lock ([#4988](https://github.com/angular/angular-cli/issues/4988)) ([554e7f9](https://github.com/angular/angular-cli/commit/554e7f9))
* **@angular/cli:** stabilize webpack module identifiers ([26d1e41](https://github.com/angular/angular-cli/commit/26d1e41)), closes [#4733](https://github.com/angular/angular-cli/issues/4733)
* **@ngtools/json-schema:** aliases on invalid properties are noop ([68bd221](https://github.com/angular/angular-cli/commit/68bd221))
* **@ngtools/webpack:** add exclude override to tsconfig ([1e30159](https://github.com/angular/angular-cli/commit/1e30159)), closes [#3973](https://github.com/angular/angular-cli/issues/3973)
* **@ngtools/webpack:** allow 4.0.0-beta version of [@angular](https://github.com/angular)/tsc-wrapped dependency ([#4847](https://github.com/angular/angular-cli/issues/4847)) ([224eac7](https://github.com/angular/angular-cli/commit/224eac7))
* **eject:** set ejected project to run `webdriver-manager update` as part of `e2e` npm script ([7567f5c](https://github.com/angular/angular-cli/commit/7567f5c)), closes [#4920](https://github.com/angular/angular-cli/issues/4920)
* **serve:** allow relevant live-reload options to function ([#4744](https://github.com/angular/angular-cli/issues/4744)) ([a4b43a5](https://github.com/angular/angular-cli/commit/a4b43a5)), closes [#3361](https://github.com/angular/angular-cli/issues/3361)


### Features

* **@angular/cli:** add async method in Jasmine Tests blueprints ([#4775](https://github.com/angular/angular-cli/issues/4775)) ([c792c9f](https://github.com/angular/angular-cli/commit/c792c9f))
* **@angular/cli:** add npm build script ([#4949](https://github.com/angular/angular-cli/issues/4949)) ([e661f55](https://github.com/angular/angular-cli/commit/e661f55))
* **@angular/cli:** add warning when angular-cli is detected locally ([ae89fde](https://github.com/angular/angular-cli/commit/ae89fde)), closes [#4466](https://github.com/angular/angular-cli/issues/4466)
* **@angular/cli:** adding the --app command option ([#4754](https://github.com/angular/angular-cli/issues/4754)) ([ade2236](https://github.com/angular/angular-cli/commit/ade2236))
* **@angular/cli:** allow code coverage excludes ([#4966](https://github.com/angular/angular-cli/issues/4966)) ([b6893d0](https://github.com/angular/angular-cli/commit/b6893d0))
* **@angular/cli:** allow setting ssl certificate in angular-cli.json ([#4730](https://github.com/angular/angular-cli/issues/4730)) ([b498549](https://github.com/angular/angular-cli/commit/b498549))
* **@angular/cli:** allow to create new projects in existing directory ([e4fc294](https://github.com/angular/angular-cli/commit/e4fc294)), closes [#4762](https://github.com/angular/angular-cli/issues/4762) [#4901](https://github.com/angular/angular-cli/issues/4901)
* **@angular/cli:** don't add empty assets to karma ([#4952](https://github.com/angular/angular-cli/issues/4952)) ([958bee3](https://github.com/angular/angular-cli/commit/958bee3))
* **@angular/cli:** don't use config file version ([#4795](https://github.com/angular/angular-cli/issues/4795)) ([3c3f74c](https://github.com/angular/angular-cli/commit/3c3f74c))
* **@angular/cli:** hash loaded media by default ([#4878](https://github.com/angular/angular-cli/issues/4878)) ([1655e51](https://github.com/angular/angular-cli/commit/1655e51))
* **@angular/cli:** ng e2e defaults to random port ([#4753](https://github.com/angular/angular-cli/issues/4753)) ([d2bef98](https://github.com/angular/angular-cli/commit/d2bef98))
* **@angular/cli:** update ascii art to Angular CLI ([#4785](https://github.com/angular/angular-cli/issues/4785)) ([432c0a2](https://github.com/angular/angular-cli/commit/432c0a2))
* **@angular/cli:** use same webpack config for karma ([3bba4cb](https://github.com/angular/angular-cli/commit/3bba4cb)), closes [#4851](https://github.com/angular/angular-cli/issues/4851) [#3605](https://github.com/angular/angular-cli/issues/3605) [#4850](https://github.com/angular/angular-cli/issues/4850) [#4876](https://github.com/angular/angular-cli/issues/4876)
* **@angular/cli:** use separate tsconfigs ([69e6c71](https://github.com/angular/angular-cli/commit/69e6c71))
* **@ngtools/webpack:** allow to pass in overrides for compilerOptions ([6dff3b7](https://github.com/angular/angular-cli/commit/6dff3b7)), closes [#4851](https://github.com/angular/angular-cli/issues/4851)
* **generate:** add guard generation ([#4055](https://github.com/angular/angular-cli/issues/4055)) ([2c1e877](https://github.com/angular/angular-cli/commit/2c1e877))


### BREAKING CHANGES

* @angular/cli: dev builds will hash relative resources from CSS (images, etc).
* @angular/cli: `ng e2e` will use a random port for serving by default
instead of using 4200.



<a name="1.0.0-beta.32"></a>
# [1.0.0-beta.32](https://github.com/angular/angular-cli/compare/v1.0.0-beta.31...v1.0.0-beta.32) (2017-02-17)


### Bug Fixes

* **@angular/cli:** don't load old ember config ([98a3430](https://github.com/angular/angular-cli/commit/98a3430)), closes [#4057](https://github.com/angular/angular-cli/issues/4057)
* **@angular/cli:** don't rerun protractor on rebuild ([#4661](https://github.com/angular/angular-cli/issues/4661)) ([3a85ffc](https://github.com/angular/angular-cli/commit/3a85ffc))
* **@angular/cli:** fixing the help command ([#4726](https://github.com/angular/angular-cli/issues/4726)) ([121c390](https://github.com/angular/angular-cli/commit/121c390))
* **@angular/cli:** generate command now ignores duplicate component symbol ([#4446](https://github.com/angular/angular-cli/issues/4446)) ([9c25f74](https://github.com/angular/angular-cli/commit/9c25f74)), closes [#4323](https://github.com/angular/angular-cli/issues/4323)
* **@angular/cli:** include polyfills before scripts in ng test ([ca29eab](https://github.com/angular/angular-cli/commit/ca29eab)), closes [#4545](https://github.com/angular/angular-cli/issues/4545) [#4656](https://github.com/angular/angular-cli/issues/4656)
* **@angular/cli:** lint now works with excluded files. ([351f6b1](https://github.com/angular/angular-cli/commit/351f6b1))
* **@angular/cli:** remove component generation from module generation ([#4706](https://github.com/angular/angular-cli/issues/4706)) ([9db71d8](https://github.com/angular/angular-cli/commit/9db71d8)), closes [#4209](https://github.com/angular/angular-cli/issues/4209)
* **@angular/cli:** remove inexistent tslint override ([82b9715](https://github.com/angular/angular-cli/commit/82b9715)), closes [#4696](https://github.com/angular/angular-cli/issues/4696)
* **@angular/cli:** show blueprints in completion script ([26b1ee4](https://github.com/angular/angular-cli/commit/26b1ee4)), closes [#4571](https://github.com/angular/angular-cli/issues/4571)
* **@angular/cli:** use correct tslint rule args ([#4662](https://github.com/angular/angular-cli/issues/4662)) ([16bceee](https://github.com/angular/angular-cli/commit/16bceee)), closes [#4648](https://github.com/angular/angular-cli/issues/4648)
* **@angular/cli:** use default .map filename ([#4742](https://github.com/angular/angular-cli/issues/4742)) ([78313b3](https://github.com/angular/angular-cli/commit/78313b3)), closes [#4741](https://github.com/angular/angular-cli/issues/4741)
* **@ngtools/webpack:** fix error with object spread ([#4642](https://github.com/angular/angular-cli/issues/4642)) ([8b3e300](https://github.com/angular/angular-cli/commit/8b3e300)), closes [#4600](https://github.com/angular/angular-cli/issues/4600)


### Code Refactoring

* **@angular/cli:** remove ng init & ng update ([#4628](https://github.com/angular/angular-cli/issues/4628)) ([a127cad](https://github.com/angular/angular-cli/commit/a127cad))
* **@angular/cli:** rename config file from angular-cli.json to .angular-cli.json ([#4681](https://github.com/angular/angular-cli/issues/4681)) ([809340a](https://github.com/angular/angular-cli/commit/809340a))
* **@angular/cli:** remove compression plugin



### Features

* **@angular/cli:** add --stats-json flag to build ([#4189](https://github.com/angular/angular-cli/issues/4189)) ([469ca91](https://github.com/angular/angular-cli/commit/469ca91)), closes [#3179](https://github.com/angular/angular-cli/issues/3179)
* **@angular/cli:** add in-browser development error overlay ([7ea8013](https://github.com/angular/angular-cli/commit/7ea8013)), closes [#4513](https://github.com/angular/angular-cli/issues/4513)
* **@angular/cli:** add watch flag to serve/e2e ([#4749](https://github.com/angular/angular-cli/issues/4749)) ([9d29cbc](https://github.com/angular/angular-cli/commit/9d29cbc))
* **@angular/cli:** added *.sublime-workspace to gitignore blueprint ([#4698](https://github.com/angular/angular-cli/issues/4698)) ([f8b5c94](https://github.com/angular/angular-cli/commit/f8b5c94))
* **@angular/cli:** added argument for karma configuration file ([#4564](https://github.com/angular/angular-cli/issues/4564)) ([b9295e0](https://github.com/angular/angular-cli/commit/b9295e0)), closes [#183](https://github.com/angular/angular-cli/issues/183)
* **@angular/cli:** allow assets from outside of app root. ([9e91d86](https://github.com/angular/angular-cli/commit/9e91d86)), closes [#3555](https://github.com/angular/angular-cli/issues/3555) [#4691](https://github.com/angular/angular-cli/issues/4691)
* **@angular/cli:** allow component css imports ([#4667](https://github.com/angular/angular-cli/issues/4667)) ([e55cb82](https://github.com/angular/angular-cli/commit/e55cb82)), closes [#4285](https://github.com/angular/angular-cli/issues/4285)
* **@angular/cli:** disable invalid commands on ejected apps ([6402a27](https://github.com/angular/angular-cli/commit/6402a27)), closes [#4680](https://github.com/angular/angular-cli/issues/4680)
* **@angular/cli:** eject command ([7ac0d05](https://github.com/angular/angular-cli/commit/7ac0d05))
* **@angular/cli:** extend karma.conf.js w/ kjhtml reporter ([4543be9](https://github.com/angular/angular-cli/commit/4543be9)), closes [#4567](https://github.com/angular/angular-cli/issues/4567)
* **@angular/cli:** use environmentSource key for environments ([#4705](https://github.com/angular/angular-cli/issues/4705)) ([16bfdf0](https://github.com/angular/angular-cli/commit/16bfdf0)), closes [#3857](https://github.com/angular/angular-cli/issues/3857)
* **@angular/cli:** version shows ejected app or not ([6b53cd0](https://github.com/angular/angular-cli/commit/6b53cd0))
* **@ngtools/webpack:** add an option to redirect files ([e0edccf](https://github.com/angular/angular-cli/commit/e0edccf))
* **build:** add `--poll` option to build/serve/test commands ([57ef508](https://github.com/angular/angular-cli/commit/57ef508)), closes [#4268](https://github.com/angular/angular-cli/issues/4268) [#4715](https://github.com/angular/angular-cli/issues/4715)
* **new:** read GIT_AUTHOR_NAME/_EMAIL from process.ENV for initial commit message ([fd4cf47](https://github.com/angular/angular-cli/commit/fd4cf47)), closes [#4012](https://github.com/angular/angular-cli/issues/4012)


### BREAKING CHANGES

* @angular/cli: compressed output (.gz) is no longer generated on production builds.
* @angular/cli: sourcemaps now are always [filename].map (e.g `main.bundle.js.map` instead of `main.bundle.map`).
* @angular/cli: The configuration file `angular-cli.json` has been renamed to `.angular-cli.json`.
  
  Rename the file in your project, and update the file reference in `karma.conf.js`.
* @angular/cli: Generating a module with routing will no longer generate an associated component.
* @angular/cli: 'assets' as a string in angular-cli.json is no longer allowed.
  
  Use an array instead.
* @angular/cli: Removing the `ng init` & `ng update` commands because their current implementation causes more problems than it solves. Once RC is released, we won't need to use those to update anymore as the step will be as simple as installing the latest version of the CLI.
  
  Use this section for updating to newer versions of the CLI, along with the [update documentation](https://github.com/angular/angular-cli#updating-angular-cli).
* @angular/cli: A new environmentSource entry replaces the previous source entry inside environments.
	
  To migrate the code follow the example below:

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



<a name="1.0.0-beta.31"></a>
# [1.0.0-beta.31](https://github.com/angular/angular-cli/compare/v1.0.0-beta.30...v1.0.0-beta.31) (2017-02-09)

Special thanks to: [Andrew Seguin](https://github.com/andrewseguin), [Bram Borggreve](https://github.com/beeman) and [Carlo Dapor](https://github.com/catull) for helping debugging issue [#4453](https://github.com/angular/angular-cli/issues/4453).

**PLEASE TAKE NOTE OF THE BREAKING CHANGES BELOW**

### Bug Fixes

* **.nvmrc:** change Node.js version from 4 to 6 ([#4399](https://github.com/angular/angular-cli/issues/4399)) ([e6422e9](https://github.com/angular/angular-cli/commit/e6422e9))
* **@angular/cli:** add a dependency to RXJS ([#4465](https://github.com/angular/angular-cli/issues/4465)) ([39fa206](https://github.com/angular/angular-cli/commit/39fa206))
* **@angular/cli:** add environment file to compilerHost ([#4475](https://github.com/angular/angular-cli/issues/4475)) ([2797a89](https://github.com/angular/angular-cli/commit/2797a89)), closes [#4375](https://github.com/angular/angular-cli/issues/4375)
* **@angular/cli:** Bail out if output path is the root folder ([#4490](https://github.com/angular/angular-cli/issues/4490)) ([22f4bea](https://github.com/angular/angular-cli/commit/22f4bea))
* **@angular/cli:** Bail out if output path is the root folder pt2 ([#4518](https://github.com/angular/angular-cli/issues/4518)) ([488185b](https://github.com/angular/angular-cli/commit/488185b))
* **@angular/cli:** create app.component.styl for Stylus. ([#4540](https://github.com/angular/angular-cli/issues/4540)) ([0f7a35f](https://github.com/angular/angular-cli/commit/0f7a35f))
* **@angular/cli:** don't override base-href if not directly specified ([#4489](https://github.com/angular/angular-cli/issues/4489)) ([6bab5ec](https://github.com/angular/angular-cli/commit/6bab5ec))
* **@angular/cli:** GlobCopyWebpackPlugin should wait until assets are added before completing ([849155c](https://github.com/angular/angular-cli/commit/849155c))
* **@angular/cli:** improve bootstrapping time ([#4537](https://github.com/angular/angular-cli/issues/4537)) ([6b26f91](https://github.com/angular/angular-cli/commit/6b26f91))
* **@angular/cli:** remove unneeded dependencies ([#4473](https://github.com/angular/angular-cli/issues/4473)) ([d8f36df](https://github.com/angular/angular-cli/commit/d8f36df))
* **@angular/cli:** update dependency to remove install warning ([#4562](https://github.com/angular/angular-cli/issues/4562)) ([4e06612](https://github.com/angular/angular-cli/commit/4e06612))
* **@ngtools/json-schema:** enum values properly handle defaults and null. ([#4387](https://github.com/angular/angular-cli/issues/4387)) ([ea9f334](https://github.com/angular/angular-cli/commit/ea9f334))
* **@ngtools/json-schema:** support enums in d.ts ([#4426](https://github.com/angular/angular-cli/issues/4426)) ([6ff0f80](https://github.com/angular/angular-cli/commit/6ff0f80))
* **@ngtools/webpack:** better ctor parameters in AOT ([#4428](https://github.com/angular/angular-cli/issues/4428)) ([7f25548](https://github.com/angular/angular-cli/commit/7f25548)), closes [#4427](https://github.com/angular/angular-cli/issues/4427)
* **@ngtools/webpack:** invalidate all the files changed ([#4542](https://github.com/angular/angular-cli/issues/4542)) ([9548d90](https://github.com/angular/angular-cli/commit/9548d90))
* **@ngtools/webpack:** resolve file name before invalidating cached files ([#4384](https://github.com/angular/angular-cli/issues/4384)) ([9fcf10a](https://github.com/angular/angular-cli/commit/9fcf10a)), closes [#4422](https://github.com/angular/angular-cli/issues/4422) [#4345](https://github.com/angular/angular-cli/issues/4345) [#4338](https://github.com/angular/angular-cli/issues/4338)
* **command options:** allow to use camelCase for options. ([#3787](https://github.com/angular/angular-cli/issues/3787)) ([496e13a](https://github.com/angular/angular-cli/commit/496e13a)), closes [#3625](https://github.com/angular/angular-cli/issues/3625)
* **config:** tsconfig should support other formats too ([#4469](https://github.com/angular/angular-cli/issues/4469)) ([aa87de7](https://github.com/angular/angular-cli/commit/aa87de7))
* **readme:** point npm badges to [@angular](https://github.com/angular)/cli instead of angular-cli ([#4395](https://github.com/angular/angular-cli/issues/4395)) ([4ad406f](https://github.com/angular/angular-cli/commit/4ad406f))
* **webpack:** remove usage of fallbackLoader and loader ([#4435](https://github.com/angular/angular-cli/issues/4435)) ([73d5628](https://github.com/angular/angular-cli/commit/73d5628))


### Code Refactoring

* **@angular/cli:** removed the github pages deploy command ([#4385](https://github.com/angular/angular-cli/issues/4385)) ([0f8689b](https://github.com/angular/angular-cli/commit/0f8689b))


### Features

* **@angular/cli:** add ability to exclude files and directories ([#4437](https://github.com/angular/angular-cli/issues/4437)) ([6e3186d](https://github.com/angular/angular-cli/commit/6e3186d)), closes [#4350](https://github.com/angular/angular-cli/issues/4350)
* **@angular/cli:** add ng4 option to ng new ([#4507](https://github.com/angular/angular-cli/issues/4507)) ([c096afb](https://github.com/angular/angular-cli/commit/c096afb))
* **@angular/cli:** Add options for third party package manager ([#4321](https://github.com/angular/angular-cli/issues/4321)) ([d2849c7](https://github.com/angular/angular-cli/commit/d2849c7))
* **@angular/cli:** add schema to the config ([#4504](https://github.com/angular/angular-cli/issues/4504)) ([186d50d](https://github.com/angular/angular-cli/commit/186d50d))
* **@angular/cli:** Generate completion.sh automatically. ([d2f8ca7](https://github.com/angular/angular-cli/commit/d2f8ca7)), closes [#3981](https://github.com/angular/angular-cli/issues/3981)
* **@angular/cli:** provide '--sourcemaps' alias for build ([#4462](https://github.com/angular/angular-cli/issues/4462)) ([e0fb87c](https://github.com/angular/angular-cli/commit/e0fb87c))
* **@angular/cli:** show detailed help for blueprints. ([#4267](https://github.com/angular/angular-cli/issues/4267)) ([b20d87e](https://github.com/angular/angular-cli/commit/b20d87e))
* **e2e:** use protractor api ([#4527](https://github.com/angular/angular-cli/issues/4527)) ([8d2d93a](https://github.com/angular/angular-cli/commit/8d2d93a)), closes [#4256](https://github.com/angular/angular-cli/issues/4256) [#4478](https://github.com/angular/angular-cli/issues/4478)
* add support for [@angular](https://github.com/angular)/service-worker and manifest generation ([cb2e418](https://github.com/angular/angular-cli/commit/cb2e418)), closes [#4544](https://github.com/angular/angular-cli/issues/4544)
* support TS 2.1 ([#4572](https://github.com/angular/angular-cli/issues/4572)) ([c617c21](https://github.com/angular/angular-cli/commit/c617c21))


### BREAKING CHANGES

* e2e: `ng e2e` no longer needs `ng serve` to be running.
* @angular/cli: `--skip-npm` flag is now named `--skip-install`
* @angular/cli: The deploy command is being removed from the core of the CLI.
There are several options for deploying CLI-based applications outside the scope of this project.
One of which being https://github.com/angular-buch/angular-cli-ghpages
* @angular/cli: The default LCOV file is now `coverage/lcov.info` instead of `coverage/coverage.lcov`.
* @angular/cli:`ng test --code-coverage` now uses `karma-coverage-istanbul-reporter` instead of `karma-remap-istanbul`.

To update follow these steps in your project:
- `npm uninstall karma-remap-istanbul --save-dev`
- `npm install karma-coverage-istanbul-reporter --save-dev`

Then copy `karma.conf.js` from a new project, or update it manually:
- replace `require('karma-remap-istanbul'),` with `require('karma-coverage-istanbul-reporter'),`
- replace `['progress', 'karma-remap-istanbul']` with `['progress', 'coverage-istanbul']`
- replace
```
    remapIstanbulReporter: {
      reports: {
        html: 'coverage',
        lcovonly: './coverage/coverage.lcov'
      }
    },
```
with
```
    coverageIstanbulReporter: {
      reports: [ 'html', 'lcovonly' ],
      fixWebpackSourcePaths: true
    },
```



<a name="1.0.0-beta.30"></a>
# [1.0.0-beta.30](https://github.com/angular/angular-cli/compare/v1.0.0-beta.28...v1.0.0-beta.30) (2017-02-03)


### Bug Fixes

* **@angular/cli:** Backwards warning that global CLI is greater version than local CLI [#4341](https://github.com/angular/angular-cli/issues/4341) ([cc2651c](https://github.com/angular/angular-cli/commit/cc2651c))
* **@angular/cli:** properly check the project status ([#4381](https://github.com/angular/angular-cli/issues/4381)) ([1dd5399](https://github.com/angular/angular-cli/commit/1dd5399)), closes [#4379](https://github.com/angular/angular-cli/issues/4379)
* **@ngtools/webpack:** change of CSS no longer breaks rebuild ([#4334](https://github.com/angular/angular-cli/issues/4334)) ([9afaa3a](https://github.com/angular/angular-cli/commit/9afaa3a)), closes [#4326](https://github.com/angular/angular-cli/issues/4326) [#4329](https://github.com/angular/angular-cli/issues/4329)
* **@ngtools/webpack:** only diagnose each resource once ([#4374](https://github.com/angular/angular-cli/issues/4374)) ([b0c1551](https://github.com/angular/angular-cli/commit/b0c1551))
* **@ngtools/webpack:** prevent emitting of sourcemaps ([#4221](https://github.com/angular/angular-cli/issues/4221)) ([a6b1bdd](https://github.com/angular/angular-cli/commit/a6b1bdd))


<a name="1.0.0-beta.29"></a>
# [1.0.0-beta.29](https://github.com/angular/angular-cli/compare/v1.0.0-beta.28...v1.0.0-beta.29) (2017-02-03)

### Features

* **@angular/cli:** move angular-cli to @angular/cli ([#4328](https://github.com/angular/angular-cli/issues/4328)) ([601f9b3](https://github.com/angular/angular-cli/commit/601f9b3))


<a name="1.0.0-beta.28"></a>
# [1.0.0-beta.28](https://github.com/angular/angular-cli/compare/v1.0.0-beta.26...v1.0.0-beta.28) (2017-02-01)


### Bug Fixes

* **@ngtools/json-schema:** values of non-existent objects should return undefined ([#4300](https://github.com/angular/angular-cli/issues/4300)) ([95f28fd](https://github.com/angular/angular-cli/commit/95f28fd))
* **@ngtools/webpack:** don't override context module deps ([#4153](https://github.com/angular/angular-cli/issues/4153)) ([4b9af62](https://github.com/angular/angular-cli/commit/4b9af62)), closes [#2496](https://github.com/angular/angular-cli/issues/2496)
* **@ngtools/webpack:** skip null files ([#4168](https://github.com/angular/angular-cli/issues/4168)) ([43c6861](https://github.com/angular/angular-cli/commit/43c6861)), closes [#4165](https://github.com/angular/angular-cli/issues/4165)
* **build:** don't leave dist folder on fail ([#4047](https://github.com/angular/angular-cli/issues/4047)) ([790dda6](https://github.com/angular/angular-cli/commit/790dda6))
* **build:** ExtractTextWebpack 2.0.0-rc.1 and remove unsupported prop ([#4265](https://github.com/angular/angular-cli/issues/4265)) ([1bbd12d](https://github.com/angular/angular-cli/commit/1bbd12d)), closes [#4264](https://github.com/angular/angular-cli/issues/4264)
* **css:** emit css sourcemaps only when extracting ([#4280](https://github.com/angular/angular-cli/issues/4280)) ([3aa55d7](https://github.com/angular/angular-cli/commit/3aa55d7))
* **deps:** pin lodash types ([#4260](https://github.com/angular/angular-cli/issues/4260)) ([5f6a7f2](https://github.com/angular/angular-cli/commit/5f6a7f2))
* **deps:** update mocha dev dependency ([#4291](https://github.com/angular/angular-cli/issues/4291)) ([49d15b3](https://github.com/angular/angular-cli/commit/49d15b3))
* **docs:** remove mention to code formatting ([c079ccf](https://github.com/angular/angular-cli/commit/c079ccf)), closes [#4144](https://github.com/angular/angular-cli/issues/4144)
* **lint:** fix new linting errors ([#4241](https://github.com/angular/angular-cli/issues/4241)) ([76f8827](https://github.com/angular/angular-cli/commit/76f8827))
* **polyfills:** move polyfills to own entry point ([#3812](https://github.com/angular/angular-cli/issues/3812)) ([08bb738](https://github.com/angular/angular-cli/commit/08bb738)), closes [#2752](https://github.com/angular/angular-cli/issues/2752) [#3309](https://github.com/angular/angular-cli/issues/3309) [#4140](https://github.com/angular/angular-cli/issues/4140)
* **scripts:** allow using same lib inside app ([#3814](https://github.com/angular/angular-cli/issues/3814)) ([a2ea05e](https://github.com/angular/angular-cli/commit/a2ea05e)), closes [#2141](https://github.com/angular/angular-cli/issues/2141)
* **serve:** delete dist on serve ([#4293](https://github.com/angular/angular-cli/issues/4293)) ([8e82d17](https://github.com/angular/angular-cli/commit/8e82d17))
* **serve:** improve error message when port is in use ([#4167](https://github.com/angular/angular-cli/issues/4167)) ([75e83a4](https://github.com/angular/angular-cli/commit/75e83a4))
* **styles:** correctly output sourcemaps ([#4222](https://github.com/angular/angular-cli/issues/4222)) ([c29ed53](https://github.com/angular/angular-cli/commit/c29ed53)), closes [#2020](https://github.com/angular/angular-cli/issues/2020)


### Code Refactoring

* **build:** consolidate build options ([#4105](https://github.com/angular/angular-cli/issues/4105)) ([e15433e](https://github.com/angular/angular-cli/commit/e15433e))
* **lint:** use tslint api for linting ([#4248](https://github.com/angular/angular-cli/issues/4248)) ([0664beb](https://github.com/angular/angular-cli/commit/0664beb)), closes [#867](https://github.com/angular/angular-cli/issues/867) [#3993](https://github.com/angular/angular-cli/issues/3993)
* **test:** remove lint option from test command ([#4261](https://github.com/angular/angular-cli/issues/4261)) ([645c870](https://github.com/angular/angular-cli/commit/645c870))


### Features

* **@ngtools/webpack:** remove annotations ([#4301](https://github.com/angular/angular-cli/issues/4301)) ([439dcd7](https://github.com/angular/angular-cli/commit/439dcd7))
* **angular-cli:** Add a postinstall warning for Node 4 deprecation. ([#4309](https://github.com/angular/angular-cli/issues/4309)) ([916e9bd](https://github.com/angular/angular-cli/commit/916e9bd))
* **build:** minify/optimize component stylesheets ([#4259](https://github.com/angular/angular-cli/issues/4259)) ([499ef2f](https://github.com/angular/angular-cli/commit/499ef2f))
* **serve:** Persist serve options in angular-cli.json ([#3908](https://github.com/angular/angular-cli/issues/3908)) ([da255b0](https://github.com/angular/angular-cli/commit/da255b0)), closes [#1156](https://github.com/angular/angular-cli/issues/1156)
* **update:** add ng update as alias of ng init ([#4142](https://github.com/angular/angular-cli/issues/4142)) ([2211172](https://github.com/angular/angular-cli/commit/2211172)), closes [#4007](https://github.com/angular/angular-cli/issues/4007)


### Performance Improvements

* **@ngtools/webpack:** Improve rebuild performance ([#4145](https://github.com/angular/angular-cli/issues/4145)) ([9d033e7](https://github.com/angular/angular-cli/commit/9d033e7))
* **@ngtools/webpack:** improve rebuild performance ([#4188](https://github.com/angular/angular-cli/issues/4188)) ([7edac2b](https://github.com/angular/angular-cli/commit/7edac2b))
* **@ngtools/webpack:** reduce rebuild performance by typechecking more ([#4258](https://github.com/angular/angular-cli/issues/4258)) ([29b134d](https://github.com/angular/angular-cli/commit/29b134d))


### BREAKING CHANGES

* angular-cli: Node < 6.9 will be deprecated soon, and this will show a warning to users. Moving forward, that warning will be moved to an error with the next release.
* test: ng test no longer has the --lint flag available.
* lint: In order to use the updated `ng lint` command, the following section will have to be added to the project's `angular-cli.json` at the root level of the json object.

  ```json
  "lint": [
    {
      "files": "src/**/*.ts",
      "project": "src/tsconfig.json"
    },
    {
      "files": "e2e/**/*.ts",
      "project": "e2e/tsconfig.json"
    }
  ],
  ```

Alternatively, you can run `ng update`.
* build: - `--extractCss` defaults to `false` on all `--dev` (`ng build` with no flags uses `--dev`)
-  `--aot` defaults to true in `--prod`
- the alias for `--output-path` is now `-op` instead of `-o`



<a name="1.0.0-beta.26"></a>
# [1.0.0-beta.26](https://github.com/angular/angular-cli/compare/v1.0.0-beta.25...v1.0.0-beta.26) (2017-01-19)


### Bug Fixes

* **@ngtools/json-schema:** serialize object properties better. ([#4103](https://github.com/angular/angular-cli/issues/4103)) ([48d1e44](https://github.com/angular/angular-cli/commit/48d1e44)), closes [#4044](https://github.com/angular/angular-cli/issues/4044)
* **@ngtools/webpack:** dont error on non-identifier properties. ([#4078](https://github.com/angular/angular-cli/issues/4078)) ([e91552f](https://github.com/angular/angular-cli/commit/e91552f))
* **@ngtools/webpack:** honor tsconfig#angularCompilerOptions.entryModule before trying to resolveEntryModuleFromMain() ([#4013](https://github.com/angular/angular-cli/issues/4013)) ([c9ac263](https://github.com/angular/angular-cli/commit/c9ac263))
* **build:** override publicPath for ExtractTextPlugin and add extract-css test ([#4036](https://github.com/angular/angular-cli/issues/4036)) ([c1f1e0c](https://github.com/angular/angular-cli/commit/c1f1e0c))
* **generate:** correct component path when module is generated in subfolder, and parent folder is not a module too ([#3916](https://github.com/angular/angular-cli/issues/3916)) ([f70feae](https://github.com/angular/angular-cli/commit/f70feae)), closes [#3255](https://github.com/angular/angular-cli/issues/3255)
* **generate:** normalize pwd before using it ([#4065](https://github.com/angular/angular-cli/issues/4065)) ([09e1eb3](https://github.com/angular/angular-cli/commit/09e1eb3)), closes [#1639](https://github.com/angular/angular-cli/issues/1639)
* **get/set:** Add support for global configuration. ([#4074](https://github.com/angular/angular-cli/issues/4074)) ([088ebf0](https://github.com/angular/angular-cli/commit/088ebf0))
* **help:** remove ember references in console output ([#4026](https://github.com/angular/angular-cli/issues/4026)) ([394aa05](https://github.com/angular/angular-cli/commit/394aa05))
* **help:** remove match of *.run.ts files ([#3982](https://github.com/angular/angular-cli/issues/3982)) ([7b47753](https://github.com/angular/angular-cli/commit/7b47753))
* **new:** improve error message when project name does not match regex ([bf23b13](https://github.com/angular/angular-cli/commit/bf23b13)), closes [#3816](https://github.com/angular/angular-cli/issues/3816) [#3902](https://github.com/angular/angular-cli/issues/3902)
* **test:** remove webpack size limit warning ([#3974](https://github.com/angular/angular-cli/issues/3974)) ([5df4799](https://github.com/angular/angular-cli/commit/5df4799))


### Features

* **@ngtools/json-schema:** add support for enums. ([c034a44](https://github.com/angular/angular-cli/commit/c034a44)), closes [#4082](https://github.com/angular/angular-cli/issues/4082)
* **build:** add style paths ([#4003](https://github.com/angular/angular-cli/issues/4003)) ([e5ef996](https://github.com/angular/angular-cli/commit/e5ef996)), closes [#1791](https://github.com/angular/angular-cli/issues/1791)
* **build:** use NamedModulesPlugin with HMR ([c5b2244](https://github.com/angular/angular-cli/commit/c5b2244)), closes [#3679](https://github.com/angular/angular-cli/issues/3679) [#4037](https://github.com/angular/angular-cli/issues/4037)
* **deploy:** add custom-domain support for gh-pages deployment ([#1781](https://github.com/angular/angular-cli/issues/1781)) ([#3392](https://github.com/angular/angular-cli/issues/3392)) ([a54bc16](https://github.com/angular/angular-cli/commit/a54bc16))
* **generate:** add option to auto-export declarations ([#3876](https://github.com/angular/angular-cli/issues/3876)) ([6d63bb4](https://github.com/angular/angular-cli/commit/6d63bb4)), closes [#3778](https://github.com/angular/angular-cli/issues/3778)
* **generate:** create parent directories required for blueprints if they do not exist ([76380a6](https://github.com/angular/angular-cli/commit/76380a6)), closes [#3307](https://github.com/angular/angular-cli/issues/3307) [#3912](https://github.com/angular/angular-cli/issues/3912)
* **gh-pages:deploy:** add aot and vendor-chunk options for gh-pages:deploy ([#4073](https://github.com/angular/angular-cli/issues/4073)) ([71445c3](https://github.com/angular/angular-cli/commit/71445c3))



<a name="1.0.0-beta.25"></a>
# [1.0.0-beta.25](https://github.com/angular/angular-cli/compare/v1.0.0-beta.24...v1.0.0-beta.25) (2017-01-12)


### Bug Fixes

* **@ngtools/webpack:** fix tsconfig paths resolver ([#3831](https://github.com/angular/angular-cli/issues/3831)) ([c6d1c99](https://github.com/angular/angular-cli/commit/c6d1c99)), closes [#3586](https://github.com/angular/angular-cli/issues/3586)
* **@ngtools/webpack:** search recursively for entry module ([#3708](https://github.com/angular/angular-cli/issues/3708)) ([bb748f2](https://github.com/angular/angular-cli/commit/bb748f2))
* **build:** close tags in index.html ([#3743](https://github.com/angular/angular-cli/issues/3743)) ([aaca100](https://github.com/angular/angular-cli/commit/aaca100)), closes [#3217](https://github.com/angular/angular-cli/issues/3217)
* **build:** disable performance hints ([#3808](https://github.com/angular/angular-cli/issues/3808)) ([2a513ca](https://github.com/angular/angular-cli/commit/2a513ca))
* **build:** fix path error when appConfig has no main ([#3867](https://github.com/angular/angular-cli/issues/3867)) ([7bd165b](https://github.com/angular/angular-cli/commit/7bd165b))
* **build/serve:** correct check against angular v2.3.1 ([#3785](https://github.com/angular/angular-cli/issues/3785)) ([d0224a5](https://github.com/angular/angular-cli/commit/d0224a5)), closes [#3720](https://github.com/angular/angular-cli/issues/3720) [#3729](https://github.com/angular/angular-cli/issues/3729)
* **config:** allow minimal config for build/serve ([#3835](https://github.com/angular/angular-cli/issues/3835)) ([f616158](https://github.com/angular/angular-cli/commit/f616158))
* **lint:** remove tslint rule that requires type info ([#3818](https://github.com/angular/angular-cli/issues/3818)) ([1555c2b](https://github.com/angular/angular-cli/commit/1555c2b))
* **lint:** use noUnusedParameters and noUnusedLocals instead of no-unused-variable ([#3945](https://github.com/angular/angular-cli/issues/3945)) ([dd378fe](https://github.com/angular/angular-cli/commit/dd378fe))
* **serve:** communicate that ng serve is not secure. ([#3646](https://github.com/angular/angular-cli/issues/3646)) ([766394d](https://github.com/angular/angular-cli/commit/766394d))
* **serve:** fallback to config.app[0].index ([#3813](https://github.com/angular/angular-cli/issues/3813)) ([45e2985](https://github.com/angular/angular-cli/commit/45e2985)), closes [#3748](https://github.com/angular/angular-cli/issues/3748)
* **test:** remove webpack size limit warning ([#3974](https://github.com/angular/angular-cli/issues/3974)) ([b25b97d](https://github.com/angular/angular-cli/commit/b25b97d))
* **tests:** add global scripts in karma plugin ([#3543](https://github.com/angular/angular-cli/issues/3543)) ([1153c92](https://github.com/angular/angular-cli/commit/1153c92)), closes [#2897](https://github.com/angular/angular-cli/issues/2897)


### Features

* **@ngtools/json-schema:** Introduce a separate package for JSON schema. ([#3927](https://github.com/angular/angular-cli/issues/3927)) ([74f7cdd](https://github.com/angular/angular-cli/commit/74f7cdd))
* **@ngtools/logger:** Implement a reactive logger. ([#3774](https://github.com/angular/angular-cli/issues/3774)) ([e3b48da](https://github.com/angular/angular-cli/commit/e3b48da))
* **@ngtools/webpack:** convert dashless resource urls ([#3842](https://github.com/angular/angular-cli/issues/3842)) ([4e7b397](https://github.com/angular/angular-cli/commit/4e7b397))
* **build:** add --extract-css flag ([#3943](https://github.com/angular/angular-cli/issues/3943)) ([87536c8](https://github.com/angular/angular-cli/commit/87536c8))
* **build:** add publicPath support via command and angular-cli.json ([#3285](https://github.com/angular/angular-cli/issues/3285)) ([0ce64a4](https://github.com/angular/angular-cli/commit/0ce64a4)), closes [#3136](https://github.com/angular/angular-cli/issues/3136) [#2960](https://github.com/angular/angular-cli/issues/2960) [#2276](https://github.com/angular/angular-cli/issues/2276) [#2241](https://github.com/angular/angular-cli/issues/2241) [#3344](https://github.com/angular/angular-cli/issues/3344)
* **build:** allow output hashing to be configured ([#3885](https://github.com/angular/angular-cli/issues/3885)) ([b82fe41](https://github.com/angular/angular-cli/commit/b82fe41))
* **build:** disable sourcemaps for production ([#3963](https://github.com/angular/angular-cli/issues/3963)) ([da1c197](https://github.com/angular/angular-cli/commit/da1c197))
* **commands:** lazy load commands ([#3805](https://github.com/angular/angular-cli/issues/3805)) ([59e9e8f](https://github.com/angular/angular-cli/commit/59e9e8f))
* **deploy:github-pages:** support usage of gh-token for deployment from external env ([#3121](https://github.com/angular/angular-cli/issues/3121)) ([3c82b77](https://github.com/angular/angular-cli/commit/3c82b77))
* **generate:** add ability to specify module for import ([#3811](https://github.com/angular/angular-cli/issues/3811)) ([e2b051f](https://github.com/angular/angular-cli/commit/e2b051f)), closes [#3806](https://github.com/angular/angular-cli/issues/3806)
* **lint:** now lint e2e ts files as well ([#3941](https://github.com/angular/angular-cli/issues/3941)) ([f84e220](https://github.com/angular/angular-cli/commit/f84e220))
* **new:** add --skip-tests flag to ng new/init to skip creating spec files ([#3825](https://github.com/angular/angular-cli/issues/3825)) ([4c2f06a](https://github.com/angular/angular-cli/commit/4c2f06a))
* **new:** add flag to prevent initial git commit ([#3712](https://github.com/angular/angular-cli/issues/3712)) ([2e2377d](https://github.com/angular/angular-cli/commit/2e2377d))
* **new:** show name of created project in output ([#3795](https://github.com/angular/angular-cli/issues/3795)) ([888beb7](https://github.com/angular/angular-cli/commit/888beb7))
* **version:** compare local and global version and warn users. ([#3693](https://github.com/angular/angular-cli/issues/3693)) ([8b47a90](https://github.com/angular/angular-cli/commit/8b47a90))



<a name="1.0.0-beta.24"></a>
# [1.0.0-beta.24](https://github.com/angular/angular-cli/compare/v1.0.0-beta.23...v1.0.0-beta.24) (2016-12-20)


### Bug Fixes

* **@ngtools/webpack:** report errors during codegen ([#3608](https://github.com/angular/angular-cli/issues/3608)) ([0f604ac](https://github.com/angular/angular-cli/commit/0f604ac))
* **build:** hashes in prod builds now changes when ID change. ([#3609](https://github.com/angular/angular-cli/issues/3609)) ([8e9abf9](https://github.com/angular/angular-cli/commit/8e9abf9))
* **test:** exclude non spec files from test.ts ([#3538](https://github.com/angular/angular-cli/issues/3538)) ([bcb324f](https://github.com/angular/angular-cli/commit/bcb324f))
* **tests:** serve `assets` files from `ng test` ([#3628](https://github.com/angular/angular-cli/issues/3628)) ([3459300](https://github.com/angular/angular-cli/commit/3459300))
* **webpack:** correctly load component stylesheets ([#3511](https://github.com/angular/angular-cli/issues/3511)) ([d4da7bd](https://github.com/angular/angular-cli/commit/d4da7bd))


### Features

* **generate:** Show files updated when generating ([#3642](https://github.com/angular/angular-cli/issues/3642)) ([c011b04](https://github.com/angular/angular-cli/commit/c011b04)), closes [#3624](https://github.com/angular/angular-cli/issues/3624)
* **version:** display versions of [@angular](https://github.com/angular)/* and [@ngtools](https://github.com/ngtools)/* ([#3592](https://github.com/angular/angular-cli/issues/3592)) ([123f74d](https://github.com/angular/angular-cli/commit/123f74d)), closes [#3589](https://github.com/angular/angular-cli/issues/3589)



<a name="1.0.0-beta.23"></a>
# [1.0.0-beta.23](https://github.com/angular/angular-cli/compare/v1.0.0-beta.22-1...v1.0.0-beta.23) (2016-12-15)

This beta was abandoned and unpublished due to a breaking bug.

### Bug Fixes

* **@ngtools/webpack:** keep the decorators in. ([#3583](https://github.com/angular/angular-cli/issues/3583)) ([db25183](https://github.com/angular/angular-cli/commit/db25183))
* **@ngtools/webpack:** use tsconfig declaration flag to report decl errors ([#3499](https://github.com/angular/angular-cli/issues/3499)) ([c46de15](https://github.com/angular/angular-cli/commit/c46de15))
* **blueprints:** remove app root barrel ([#3530](https://github.com/angular/angular-cli/issues/3530)) ([3329d46](https://github.com/angular/angular-cli/commit/3329d46)), closes [#3369](https://github.com/angular/angular-cli/issues/3369)
* **build:** added autoprefixer to prod ([1648d51](https://github.com/angular/angular-cli/commit/1648d51)), closes [#3156](https://github.com/angular/angular-cli/issues/3156) [#3164](https://github.com/angular/angular-cli/issues/3164)
* **build:** pin [@types](https://github.com/types)/lodash ([#3465](https://github.com/angular/angular-cli/issues/3465)) ([9b65481](https://github.com/angular/angular-cli/commit/9b65481))
* **completion:** Update with the new help command ([#3479](https://github.com/angular/angular-cli/issues/3479)) ([0b5dc74](https://github.com/angular/angular-cli/commit/0b5dc74))
* **dependencies:** reduce the dependencies further. ([#3488](https://github.com/angular/angular-cli/issues/3488)) ([901a64f](https://github.com/angular/angular-cli/commit/901a64f))
* **deploy:** gh-pages checkout initial branch on error ([#3378](https://github.com/angular/angular-cli/issues/3378)) ([c5cd095](https://github.com/angular/angular-cli/commit/c5cd095)), closes [#3030](https://github.com/angular/angular-cli/issues/3030) [#2663](https://github.com/angular/angular-cli/issues/2663) [#1259](https://github.com/angular/angular-cli/issues/1259)
* **deploy:** gh-pages deploy fail after repo create ([#3386](https://github.com/angular/angular-cli/issues/3386)) ([0a68cc5](https://github.com/angular/angular-cli/commit/0a68cc5)), closes [#3385](https://github.com/angular/angular-cli/issues/3385)
* **gitignore:** No longer ignore VSCode settings ([#3477](https://github.com/angular/angular-cli/issues/3477)) ([8d88446](https://github.com/angular/angular-cli/commit/8d88446))
* **help:** fix `ng help <command>` ([#3442](https://github.com/angular/angular-cli/issues/3442)) ([51659b9](https://github.com/angular/angular-cli/commit/51659b9))
* **new:** Make sure the project name is valid. ([#3478](https://github.com/angular/angular-cli/issues/3478)) ([e836f92](https://github.com/angular/angular-cli/commit/e836f92))
* **webpack:** fix some problems with errors not reported. ([#3444](https://github.com/angular/angular-cli/issues/3444)) ([09f9aa9](https://github.com/angular/angular-cli/commit/09f9aa9))
* **webpack:** remove usage of __dirname from the config. ([#3422](https://github.com/angular/angular-cli/issues/3422)) ([8597786](https://github.com/angular/angular-cli/commit/8597786))


### Features

* Make CLI available without install ([761e86f](https://github.com/angular/angular-cli/commit/761e86f)), closes [#3126](https://github.com/angular/angular-cli/issues/3126)
* **build:** add lazy styles/scripts ([#3402](https://github.com/angular/angular-cli/issues/3402)) ([20bb864](https://github.com/angular/angular-cli/commit/20bb864)), closes [#3401](https://github.com/angular/angular-cli/issues/3401) [#3400](https://github.com/angular/angular-cli/issues/3400)
* **deps:** Unblock the version of Angular to >= 2.3 ([#3569](https://github.com/angular/angular-cli/issues/3569)) ([bd03100](https://github.com/angular/angular-cli/commit/bd03100))
* **generate:** change generate --prefix option type from Boolean to string ([#3457](https://github.com/angular/angular-cli/issues/3457)) ([8d5a915](https://github.com/angular/angular-cli/commit/8d5a915))
* **i18n:** add i18n command line options ([#3098](https://github.com/angular/angular-cli/issues/3098)) ([2a0a42d](https://github.com/angular/angular-cli/commit/2a0a42d))
* **module:** component optional when generating module ([#3389](https://github.com/angular/angular-cli/issues/3389)) ([2fb2d13](https://github.com/angular/angular-cli/commit/2fb2d13))
* **serve:** Add support to open with ssl. ([#3432](https://github.com/angular/angular-cli/issues/3432)) ([83dfc96](https://github.com/angular/angular-cli/commit/83dfc96))


### Performance Improvements

* **install time:** Remove dependency to zopfli. ([#3414](https://github.com/angular/angular-cli/issues/3414)) ([e6364a9](https://github.com/angular/angular-cli/commit/e6364a9))


### BREAKING CHANGES

* blueprints: The app root module and component must now be imported directly. (e.g., use `import { AppModule } from './app/app.module';` instead of `import { AppModule } from './app/';`)



<a name="1.0.0-beta.22-1"></a>
# [1.0.0-beta.22-1](https://github.com/angular/angular-cli/compare/v1.0.0-beta.22...v1.0.0-beta.22-1) (2016-12-05)


### Bug Fixes

* **@ngtools/webpack:** performance improvement. ([#3360](https://github.com/angular/angular-cli/issues/3360)) ([4dcfe27](https://github.com/angular/angular-cli/commit/4dcfe27))
* **deploy:** clean up gh-pages obsolete files ([#3081](https://github.com/angular/angular-cli/issues/3081)) ([#3333](https://github.com/angular/angular-cli/issues/3333)) ([51869fb](https://github.com/angular/angular-cli/commit/51869fb))
* change apiFilter querystring to query in ng doc([#3383](https://github.com/angular/angular-cli/issues/3383)) ([5b2a0fb](https://github.com/angular/angular-cli/commit/5b2a0fb)), closes [#3363](https://github.com/angular/angular-cli/issues/3363)



<a name="1.0.0-beta.22"></a>
# [1.0.0-beta.22](https://github.com/angular/angular-cli/compare/v1.0.0-beta.21...v1.0.0-beta.22) (2016-12-02)


### Bug Fixes

* **@ngtools/webpack:** fixed path resolution for entry modules and lazy routes ([#3332](https://github.com/angular/angular-cli/issues/3332)) ([45d5154](https://github.com/angular/angular-cli/commit/45d5154))
* **build:** don't inline sourcemaps ([#3262](https://github.com/angular/angular-cli/issues/3262)) ([859d905](https://github.com/angular/angular-cli/commit/859d905))
* **build:** use custom index value when copying to 404.html during github deploy ([#3201](https://github.com/angular/angular-cli/issues/3201)) ([b1cbf17](https://github.com/angular/angular-cli/commit/b1cbf17))
* **ngtools/webpack:** move the generate directory to a separate dir ([#3256](https://github.com/angular/angular-cli/issues/3256)) ([d1037df](https://github.com/angular/angular-cli/commit/d1037df))
* **version:** bump ast-tools and webpack versions to correct mismatch with published packages ([54ef738](https://github.com/angular/angular-cli/commit/54ef738))


### Features

* **angular:** Update Angular2 version to 2.2.3 ([#3295](https://github.com/angular/angular-cli/issues/3295)) ([ed305a2](https://github.com/angular/angular-cli/commit/ed305a2))
* **build:** add --verbose and --progress flags ([#2858](https://github.com/angular/angular-cli/issues/2858)) ([f6f24e7](https://github.com/angular/angular-cli/commit/f6f24e7)), closes [#1836](https://github.com/angular/angular-cli/issues/1836) [#2012](https://github.com/angular/angular-cli/issues/2012)
* **build:** auto generate vendor chunk ([#3117](https://github.com/angular/angular-cli/issues/3117)) ([bf9c8f1](https://github.com/angular/angular-cli/commit/bf9c8f1))
* **new:** include routing in spec and inline template when called with `--routing` ([#3252](https://github.com/angular/angular-cli/issues/3252)) ([53ab4df](https://github.com/angular/angular-cli/commit/53ab4df))
* **serve:** add --hmr flag for HotModuleReplacement support ([#3330](https://github.com/angular/angular-cli/issues/3330)) ([46efa9e](https://github.com/angular/angular-cli/commit/46efa9e))


### BREAKING CHANGES

* build: `ng build/serve` now generates `vendor.bundle.js` by
default.



<a name="1.0.0-beta.21"></a>
# [1.0.0-beta.21](https://github.com/angular/angular-cli/compare/v1.0.0-beta.20-1...v1.0.0-beta.21) (2016-11-23)


### Bug Fixes

* **angular-cli:** add necessary dependencies. ([#3152](https://github.com/angular/angular-cli/issues/3152)) ([8f574e4](https://github.com/angular/angular-cli/commit/8f574e4)), closes [#3148](https://github.com/angular/angular-cli/issues/3148)
* **angular-cli:** add necessary dependency. ([f7704b0](https://github.com/angular/angular-cli/commit/f7704b0))
* **angular-cli:** change version of webpack plugin. ([07e96ea](https://github.com/angular/angular-cli/commit/07e96ea))
* **aot:** lock the angular version to 2.2.1. ([#3242](https://github.com/angular/angular-cli/issues/3242)) ([6e8a848](https://github.com/angular/angular-cli/commit/6e8a848))
* **editorconfig:** use off instead of 0 for max line length ([#3186](https://github.com/angular/angular-cli/issues/3186)) ([f833d25](https://github.com/angular/angular-cli/commit/f833d25))
* **generate:** revert change to component dir in generate module, as it caused component declaration to go to parent module ([#3158](https://github.com/angular/angular-cli/issues/3158)) ([71bf855](https://github.com/angular/angular-cli/commit/71bf855))
* **github-pages-deploy:** Show more accurate url ([#3160](https://github.com/angular/angular-cli/issues/3160)) ([a431389](https://github.com/angular/angular-cli/commit/a431389))


### Features

* **build:** add sourcemap option ([#3113](https://github.com/angular/angular-cli/issues/3113)) ([6f9d2c1](https://github.com/angular/angular-cli/commit/6f9d2c1))



<a name="1.0.0-beta.20"></a>
# [1.0.0-beta.20](https://github.com/angular/angular-cli/compare/v1.0.0-beta.19...v1.0.0-beta.20-1) (2016-11-16)


### Bug Fixes

* **@ngtools/webpack:** fixed relative path for AoT. ([#3114](https://github.com/angular/angular-cli/issues/3114)) ([27a034d](https://github.com/angular/angular-cli/commit/27a034d))
* **aot:** exclude spec files from aot ([#2758](https://github.com/angular/angular-cli/issues/2758)) ([215e555](https://github.com/angular/angular-cli/commit/215e555))
* **aot:** output the sources in the sourcemap. ([#3107](https://github.com/angular/angular-cli/issues/3107)) ([7127dba](https://github.com/angular/angular-cli/commit/7127dba))
* **aot:** remove the genDir plugin option. ([0e91dfe](https://github.com/angular/angular-cli/commit/0e91dfe)), closes [#2849](https://github.com/angular/angular-cli/issues/2849) [#2876](https://github.com/angular/angular-cli/issues/2876)
* **aot:** Use the proper path when statically analyzing lazy routes. ([#2992](https://github.com/angular/angular-cli/issues/2992)) ([88131a0](https://github.com/angular/angular-cli/commit/88131a0)), closes [#2452](https://github.com/angular/angular-cli/issues/2452) [#2735](https://github.com/angular/angular-cli/issues/2735) [#2900](https://github.com/angular/angular-cli/issues/2900)
* **build:** correct forkChecker option for ATS. ([#3011](https://github.com/angular/angular-cli/issues/3011)) ([a987cf5](https://github.com/angular/angular-cli/commit/a987cf5))
* **build:** enable chunkhash in inline.js ([30cc482](https://github.com/angular/angular-cli/commit/30cc482)), closes [#2899](https://github.com/angular/angular-cli/issues/2899)
* **build:** show full error stats ([#2879](https://github.com/angular/angular-cli/issues/2879)) ([d59fa1f](https://github.com/angular/angular-cli/commit/d59fa1f))
* **deps:** explicitely add portfinder ([#2831](https://github.com/angular/angular-cli/issues/2831)) ([2d8f162](https://github.com/angular/angular-cli/commit/2d8f162)), closes [#2755](https://github.com/angular/angular-cli/issues/2755) [#2769](https://github.com/angular/angular-cli/issues/2769)
* **e2e:** fix broken test pipeline ([#2999](https://github.com/angular/angular-cli/issues/2999)) ([37a1225](https://github.com/angular/angular-cli/commit/37a1225))
* **generate:** fix module component path if module is created in child folder ([#3066](https://github.com/angular/angular-cli/issues/3066)) ([38d5f2c](https://github.com/angular/angular-cli/commit/38d5f2c)), closes [#3063](https://github.com/angular/angular-cli/issues/3063)
* **generate:** stop default browser error from ng new --routing ([a45a1f2](https://github.com/angular/angular-cli/commit/a45a1f2)), closes [#2794](https://github.com/angular/angular-cli/issues/2794)
* **package:** add some more metadata to webpack package.json ([c2dbf88](https://github.com/angular/angular-cli/commit/c2dbf88)), closes [#2854](https://github.com/angular/angular-cli/issues/2854)
* **serve:** added accept html headers option to webpack-dev-server ([#2990](https://github.com/angular/angular-cli/issues/2990)) ([86f2a1b](https://github.com/angular/angular-cli/commit/86f2a1b)), closes [#2989](https://github.com/angular/angular-cli/issues/2989)
* **test:** catches module loading errors ([f09439c](https://github.com/angular/angular-cli/commit/f09439c)), closes [#2640](https://github.com/angular/angular-cli/issues/2640) [#2785](https://github.com/angular/angular-cli/issues/2785)
* **version:** update version of [@angular](https://github.com/angular) packages. ([#3145](https://github.com/angular/angular-cli/issues/3145)) ([a2f0a1a](https://github.com/angular/angular-cli/commit/a2f0a1a))
* bypass Watchman check ([#2846](https://github.com/angular/angular-cli/issues/2846)) ([9aa1099](https://github.com/angular/angular-cli/commit/9aa1099)), closes [#2791](https://github.com/angular/angular-cli/issues/2791)


### Features

* **build:** add loaders for fonts ([3497373](https://github.com/angular/angular-cli/commit/3497373)), closes [#1765](https://github.com/angular/angular-cli/issues/1765)
* **build:** use appConfig.index to set output index file ([d3fd8b0](https://github.com/angular/angular-cli/commit/d3fd8b0)), closes [#2241](https://github.com/angular/angular-cli/issues/2241) [#2767](https://github.com/angular/angular-cli/issues/2767)
* **build:** use static files for css ([a6415cc](https://github.com/angular/angular-cli/commit/a6415cc)), closes [#2148](https://github.com/angular/angular-cli/issues/2148) [#2020](https://github.com/angular/angular-cli/issues/2020) [#2826](https://github.com/angular/angular-cli/issues/2826) [#2646](https://github.com/angular/angular-cli/issues/2646)
* **serve:** allow CORS access while running ng serve ([#2872](https://github.com/angular/angular-cli/issues/2872)) ([#3009](https://github.com/angular/angular-cli/issues/3009)) ([7c834a8](https://github.com/angular/angular-cli/commit/7c834a8))


### BREAKING CHANGES

* aot: Using relative paths might lead to path clashing. We
now properly output an error in this case.



<a name="1.0.0-beta.19"></a>
# [1.0.0-beta.19](https://github.com/angular/angular-cli/compare/v1.0.0-beta.18...v1.0.0-beta.19) (2016-10-28)


### Bug Fixes

* **appveyor:** add workaround for webdriver bug ([#2862](https://github.com/angular/angular-cli/issues/2862)) ([2b17b46](https://github.com/angular/angular-cli/commit/2b17b46))
* **compiler:** update codegen API ([#2919](https://github.com/angular/angular-cli/issues/2919)) ([b50c121](https://github.com/angular/angular-cli/commit/b50c121)), closes [#2917](https://github.com/angular/angular-cli/issues/2917)
* **e2e:** fix travis e2e ([#2914](https://github.com/angular/angular-cli/issues/2914)) ([b62b996](https://github.com/angular/angular-cli/commit/b62b996))


### Features

* **test:** make code coverage and lint optional ([#2840](https://github.com/angular/angular-cli/issues/2840)) ([8944d04](https://github.com/angular/angular-cli/commit/8944d04)), closes [#1799](https://github.com/angular/angular-cli/issues/1799)



<a name="1.0.0-beta.18"></a>
# [1.0.0-beta.18](https://github.com/angular/angular-cli/compare/v1.0.0-beta.17...v1.0.0-beta.18) (2016-10-20)


### Bug Fixes

* **#1875:** Support npm linked libraries ([#2291](https://github.com/angular/angular-cli/issues/2291)) ([8bf69d9](https://github.com/angular/angular-cli/commit/8bf69d9))
* **aot-tools:** add missing tsc-wrapped dep ([1587c1b](https://github.com/angular/angular-cli/commit/1587c1b)), closes [#2498](https://github.com/angular/angular-cli/issues/2498) [#2598](https://github.com/angular/angular-cli/issues/2598)
* **build:** add react minification support ([e23e0fe](https://github.com/angular/angular-cli/commit/e23e0fe)), closes [#2110](https://github.com/angular/angular-cli/issues/2110) [#2754](https://github.com/angular/angular-cli/issues/2754)
* **build:** fix sourcemap in prod ([d292eac](https://github.com/angular/angular-cli/commit/d292eac)), closes [#2533](https://github.com/angular/angular-cli/issues/2533) [#2519](https://github.com/angular/angular-cli/issues/2519)
* **build:** set tls and net node builtins to empty ([7424795](https://github.com/angular/angular-cli/commit/7424795)), closes [#1696](https://github.com/angular/angular-cli/issues/1696) [#2626](https://github.com/angular/angular-cli/issues/2626)
* **build:** use outputPath from config ([ec0cdb5](https://github.com/angular/angular-cli/commit/ec0cdb5)), closes [#2511](https://github.com/angular/angular-cli/issues/2511) [#2611](https://github.com/angular/angular-cli/issues/2611)
* **doc:** update invalid link ([e17d4a8](https://github.com/angular/angular-cli/commit/e17d4a8)), closes [#2553](https://github.com/angular/angular-cli/issues/2553)
* **docs:** Correct the usage of redirecting the output from `ng completion`. ([2225027](https://github.com/angular/angular-cli/commit/2225027)), closes [#2635](https://github.com/angular/angular-cli/issues/2635)
* **generate:** show error when no name is specified ([249ccf7](https://github.com/angular/angular-cli/commit/249ccf7)), closes [#2684](https://github.com/angular/angular-cli/issues/2684)
* **init:** ignore favicon ([699ebba](https://github.com/angular/angular-cli/commit/699ebba)), closes [#2274](https://github.com/angular/angular-cli/issues/2274) [#2617](https://github.com/angular/angular-cli/issues/2617)
* override ui write level ([4608445](https://github.com/angular/angular-cli/commit/4608445)), closes [#2540](https://github.com/angular/angular-cli/issues/2540) [#2627](https://github.com/angular/angular-cli/issues/2627)
* **init:** throw when called with mobile flag ([#2753](https://github.com/angular/angular-cli/issues/2753)) ([9b1c3e0](https://github.com/angular/angular-cli/commit/9b1c3e0)), closes [#2679](https://github.com/angular/angular-cli/issues/2679)
* **karma:** Add cli config poll option to karma default config ([#2486](https://github.com/angular/angular-cli/issues/2486)) ([63023ae](https://github.com/angular/angular-cli/commit/63023ae))
* **new:** add prefix to spec name ([1307dc8](https://github.com/angular/angular-cli/commit/1307dc8)), closes [/github.com/angular/angular-cli/commit/06976f4f07a6d6065124a819b95634bddaac4598#commitcomment-19241601](https://github.com//github.com/angular/angular-cli/commit/06976f4f07a6d6065124a819b95634bddaac4598/issues/commitcomment-19241601) [#2595](https://github.com/angular/angular-cli/issues/2595)
* **new:** fix relativeRootPath for typeRoots ([eb2f939](https://github.com/angular/angular-cli/commit/eb2f939)), closes [#2206](https://github.com/angular/angular-cli/issues/2206) [#2597](https://github.com/angular/angular-cli/issues/2597)
* **serve:** enable routes with dots ([#2535](https://github.com/angular/angular-cli/issues/2535)) ([6f8b1b5](https://github.com/angular/angular-cli/commit/6f8b1b5)), closes [#2168](https://github.com/angular/angular-cli/issues/2168)
* **set:** output value for additional props ([f7bf0aa](https://github.com/angular/angular-cli/commit/f7bf0aa)), closes [#1900](https://github.com/angular/angular-cli/issues/1900) [#2614](https://github.com/angular/angular-cli/issues/2614)


### Features

* **build:** add gzip to serve --prod ([7c13cc5](https://github.com/angular/angular-cli/commit/7c13cc5)), closes [#2028](https://github.com/angular/angular-cli/issues/2028) [#2621](https://github.com/angular/angular-cli/issues/2621)
* **build:** add support for assets array ([#2570](https://github.com/angular/angular-cli/issues/2570)) ([de3c275](https://github.com/angular/angular-cli/commit/de3c275))
* **build:** added postcss-discard-comments ([883fe46](https://github.com/angular/angular-cli/commit/883fe46)), closes [#2593](https://github.com/angular/angular-cli/issues/2593)
* **generate:** specify class type via dot notation ([#2707](https://github.com/angular/angular-cli/issues/2707)) ([c2dd94c](https://github.com/angular/angular-cli/commit/c2dd94c)), closes [#2155](https://github.com/angular/angular-cli/issues/2155)
* **serve:** implement open browser option ([8bddabe](https://github.com/angular/angular-cli/commit/8bddabe)), closes [#1081](https://github.com/angular/angular-cli/issues/1081) [#2489](https://github.com/angular/angular-cli/issues/2489)
* **ssl:** add support for the ssl options of the ng serve task: --ssl, --ssl-cert, and --ssl-key ([#2792](https://github.com/angular/angular-cli/issues/2792)) ([ba414ab](https://github.com/angular/angular-cli/commit/ba414ab))


### BREAKING CHANGES

* generate: The ability to specify a class type via an additional arg has been replaced by combining the name and type args separated by a dot



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
* **mobile:** partially fix dep problem (#1151) ([4b638c8](https://github.com/angular/angular-cli/commit/4b638c8)), closes [#1151](https://github.com/angular/angular-cli/issues/1151)

### Features

* add file system utilities for 'upgrade' process ([327f649](https://github.com/angular/angular-cli/commit/327f649))



<a name="1.0.0-beta.6"></a>
# 1.0.0-beta.6 (2016-06-15)


### Bug Fixes

* **admin:** added support for non Administrator CLI user ([0bc3d94](https://github.com/angular/angular-cli/commit/0bc3d94)), closes [#905](https://github.com/angular/angular-cli/issues/905) [#886](https://github.com/angular/angular-cli/issues/886) [#370](https://github.com/angular/angular-cli/issues/370)
* **barrel:** alphabetized barrel exports ([67b577d](https://github.com/angular/angular-cli/commit/67b577d)), closes [#582](https://github.com/angular/angular-cli/issues/582)
* **deploy:** Fix base href for user pages (#965) ([424cff2](https://github.com/angular/angular-cli/commit/424cff2)), closes [#965](https://github.com/angular/angular-cli/issues/965)
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

* **build:** fix broken sourcemaps (#839) ([234de2b](https://github.com/angular/angular-cli/commit/234de2b)), closes [#839](https://github.com/angular/angular-cli/issues/839)

### Features

* **blueprint:** add blueprint for generating interfaces (#757) ([482aa74](https://github.com/angular/angular-cli/commit/482aa74)), closes [#729](https://github.com/angular/angular-cli/issues/729)
* **test:** use link-cli option on e2e (#841) ([85d1400](https://github.com/angular/angular-cli/commit/85d1400))

### Performance Improvements

* **ng new:** command to link to `angular-cli` (#778) ([9b8334f](https://github.com/angular/angular-cli/commit/9b8334f))



<a name="1.0.0-beta.4"></a>
# 1.0.0-beta.4 (2016-05-18)


### Bug Fixes

* **build:** fix infinite loop on ng serve (#775) ([285db13](https://github.com/angular/angular-cli/commit/285db13)), closes [#775](https://github.com/angular/angular-cli/issues/775)
* **deploy:** fix file copy, index tag rewrite (#772) ([a34aca8](https://github.com/angular/angular-cli/commit/a34aca8)), closes [#772](https://github.com/angular/angular-cli/issues/772)
* **index:** fix live reload file path (#774) ([be718cb](https://github.com/angular/angular-cli/commit/be718cb)), closes [#774](https://github.com/angular/angular-cli/issues/774)
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

