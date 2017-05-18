<a name="1.0.4"></a>
## [1.0.4](https://github.com/angular/angular-cli/compare/v1.0.3...v1.0.4) (2017-05-18)


### Bug Fixes

* **@angular/cli:** adds language to index.html for accessibility ([1d99472](https://github.com/angular/angular-cli/commit/1d99472))
* **@angular/cli:** allow e2e multi capabilities ([8a7f6dd](https://github.com/angular/angular-cli/commit/8a7f6dd)), closes [#975](https://github.com/angular/angular-cli/issues/975)
* **@angular/cli:** enable full node module resolution for project deps ([#6276](https://github.com/angular/angular-cli/issues/6276)) ([1659b74](https://github.com/angular/angular-cli/commit/1659b74))
* **@angular/cli:** if user pass a full path, use the path ([#6341](https://github.com/angular/angular-cli/issues/6341)) ([013a3ea](https://github.com/angular/angular-cli/commit/013a3ea))
* **@angular/cli:** prefix `historyApiFallback.index` with `deployUrl` ([#6279](https://github.com/angular/angular-cli/issues/6279)) ([26ecebf](https://github.com/angular/angular-cli/commit/26ecebf))
* **@angular/cli:** proper generation when the target dir exists ([#5929](https://github.com/angular/angular-cli/issues/5929)) ([895b759](https://github.com/angular/angular-cli/commit/895b759))
* **@angular/cli:** put vendor ngfactory in vendor chunk ([afa3ac5](https://github.com/angular/angular-cli/commit/afa3ac5))
* **@angular/cli:** supress module file modification when generating guard with dry-run flag ([114ee50](https://github.com/angular/angular-cli/commit/114ee50))



a name="1.0.3"></a>
## [1.0.3](https://github.com/angular/angular-cli/compare/v1.0.2...v1.0.3) (2017-05-09)


### Bug Fixes

* **@angular/cli:** add error message when missing config env variable ([#5980](https://github.com/angular/angular-cli/issues/5980)) ([29a9513](https://github.com/angular/angular-cli/commit/29a9513))
* **@angular/cli:** fix text descriptions ([40ecc30](https://github.com/angular/angular-cli/commit/40ecc30)), closes [#5501](https://github.com/angular/angular-cli/issues/5501)
* **@angular/cli:** fixing component blueprint indent ([47a76b8](https://github.com/angular/angular-cli/commit/47a76b8))
* **@angular/cli:** format files according to tslint ([960bd48](https://github.com/angular/angular-cli/commit/960bd48)), closes [#5751](https://github.com/angular/angular-cli/issues/5751)
* **@angular/cli:** import at least one locale-data with intl ([#6190](https://github.com/angular/angular-cli/issues/6190)) ([a9baddf](https://github.com/angular/angular-cli/commit/a9baddf))
* **@angular/cli:** install webpack at ejection ([#5745](https://github.com/angular/angular-cli/issues/5745)) ([2c23cda](https://github.com/angular/angular-cli/commit/2c23cda))
* correctly generate changelog ([5090e3b](https://github.com/angular/angular-cli/commit/5090e3b))
* **@angular/cli:** ng get: return whole config root when no path provided. ([c2d9e70](https://github.com/angular/angular-cli/commit/c2d9e70)), closes [#5887](https://github.com/angular/angular-cli/issues/5887)
* **@angular/cli:** open option in serve command should open localhost when host is 0.0.0.0 ([035c094](https://github.com/angular/angular-cli/commit/035c094)), closes [#5743](https://github.com/angular/angular-cli/issues/5743)
* **@angular/cli:** properly support CSS url()'s with whitespace ([b6db02f](https://github.com/angular/angular-cli/commit/b6db02f))
* **@angular/cli:** remove default for test runners ([9da5495](https://github.com/angular/angular-cli/commit/9da5495))
* **@angular/cli:** removes redundant rules from tslint.json ([#5783](https://github.com/angular/angular-cli/issues/5783)) ([1c22a94](https://github.com/angular/angular-cli/commit/1c22a94)), closes [#5755](https://github.com/angular/angular-cli/issues/5755)
* **@angular/cli:** simplify import path if possible ([#6184](https://github.com/angular/angular-cli/issues/6184)) ([c0c03f9](https://github.com/angular/angular-cli/commit/c0c03f9)), closes [#6183](https://github.com/angular/angular-cli/issues/6183)
* **@angular/cli:** Throw error when no key provided for ng get ([cd6db0a](https://github.com/angular/angular-cli/commit/cd6db0a)), closes [#5887](https://github.com/angular/angular-cli/issues/5887)
* **@angular/cli:** Update README.md project generation text. ([#5958](https://github.com/angular/angular-cli/issues/5958)) ([f502bd9](https://github.com/angular/angular-cli/commit/f502bd9))
* **@ngtools/logger:** add typings and other information to logger package.json ([3a5668c](https://github.com/angular/angular-cli/commit/3a5668c))



<a name="1.0.2"></a>
## [1.0.2](https://github.com/angular/angular-cli/compare/v1.0.1...v1.0.2) (2017-05-03)


### Bug Fixes

* **@angular/cli:** explicitly disable warning overlays ([f73a9e4](https://github.com/angular/angular-cli/commit/f73a9e4))
* **@angular/cli:** Improve error message for create component with -m option ([b11d560](https://github.com/angular/angular-cli/commit/b11d560))
* **@angular/cli:** removing skip e2e test ([fb96871](https://github.com/angular/angular-cli/commit/fb96871))
* **@angular/cli:** use quiet flag only in case of npm ([9805010](https://github.com/angular/angular-cli/commit/9805010))
* **@angular/cli:** use safer stylesheet minification settings ([806447e](https://github.com/angular/angular-cli/commit/806447e))



<a name="1.0.1"></a>
## [1.0.1](https://github.com/angular/angular-cli/compare/v1.0.0...1.0.1) (2017-04-25)


### Bug Fixes

* **@angular/cli:** allow tslint to find the appropriate config ([#5792](https://github.com/angular/angular-cli/issues/5792)) ([7377f66](https://github.com/angular/angular-cli/commit/7377f66)), closes [#5770](https://github.com/angular/angular-cli/issues/5770)
* **@angular/cli:** correctly build completion with blueprints and options ([dfe5990](https://github.com/angular/angular-cli/commit/dfe5990))
* **@angular/cli:** enable dev server history fallback in ejected config ([2a903d2](https://github.com/angular/angular-cli/commit/2a903d2))
* **@angular/cli:** ensure only in-memory output is served ([1bc174b](https://github.com/angular/angular-cli/commit/1bc174b))
* **@angular/cli:** fix baseUrl when running e2e with no-serve ([81403e8](https://github.com/angular/angular-cli/commit/81403e8))
* **@angular/cli:** fix empty space issue when setting `angular-cli.json` values ([204d312](https://github.com/angular/angular-cli/commit/204d312)), closes [#5716](https://github.com/angular/angular-cli/issues/5716)
* **@angular/cli:** fix generated Module Spec ([a8f498b](https://github.com/angular/angular-cli/commit/a8f498b)), closes [#5715](https://github.com/angular/angular-cli/issues/5715)
* **@angular/cli:** fix skip e2e ([4aa17b2](https://github.com/angular/angular-cli/commit/4aa17b2))
* **@angular/cli:** fix sourcemap toggle in ng test ([16171b9](https://github.com/angular/angular-cli/commit/16171b9)), closes [#5666](https://github.com/angular/angular-cli/issues/5666) [#5668](https://github.com/angular/angular-cli/issues/5668)
* **@angular/cli:** fix typo in version check ([7de9ab1](https://github.com/angular/angular-cli/commit/7de9ab1)), closes [#5702](https://github.com/angular/angular-cli/issues/5702)
* **@angular/cli:** fixing new help issue ([39aef95](https://github.com/angular/angular-cli/commit/39aef95)), closes [#5694](https://github.com/angular/angular-cli/issues/5694)
* **@angular/cli:** generating service dry run fix ([be7c9b1](https://github.com/angular/angular-cli/commit/be7c9b1)), closes [#5862](https://github.com/angular/angular-cli/issues/5862)
* **@angular/cli:** set sass precision to bootstrap required value ([f82da18](https://github.com/angular/angular-cli/commit/f82da18))
* **@angular/cli:** update completion suggestion for .bashrc and .zshrc ([1ef8de5](https://github.com/angular/angular-cli/commit/1ef8de5))
* **@angular/cli:** update e2e config in 1.0 update guide ([86722fd](https://github.com/angular/angular-cli/commit/86722fd)), closes [#5635](https://github.com/angular/angular-cli/issues/5635)
* **@angular/cli:** updating yarn file ([091fa6e](https://github.com/angular/angular-cli/commit/091fa6e))
* **@angular/cli:** Use appropriate packageManager for linking ([f6ca2d7](https://github.com/angular/angular-cli/commit/f6ca2d7)), closes [#5524](https://github.com/angular/angular-cli/issues/5524)
* **@angular/cli:** use zone.js 0.8.6 in [@angular](https://github.com/angular)/cli ([55a4e62](https://github.com/angular/angular-cli/commit/55a4e62))
* **@ngtools/webpack:** allow comments in tsconfig files ([df3847f](https://github.com/angular/angular-cli/commit/df3847f)), closes [#5216](https://github.com/angular/angular-cli/issues/5216) [#5230](https://github.com/angular/angular-cli/issues/5230)
* **@ngtools/webpack:** diagnose typescript warnings as warnings ([c55b5dc](https://github.com/angular/angular-cli/commit/c55b5dc)), closes [#5623](https://github.com/angular/angular-cli/issues/5623)
* **@ngtools/webpack:** resolve path windows ([43429ea](https://github.com/angular/angular-cli/commit/43429ea))



<a name="1.0.0"></a>
# [1.0.0](https://github.com/angular/angular-cli/compare/v1.0.0-rc.4...v1.0.0) (2017-03-24)


### Notes

* The Angular CLI v1.0 release is here!
* You can find the documentation on our [Github wiki](https://github.com/angular/angular-cli/wiki)!
* If you are updating from a beta or RC version, check out our [1.0 Update Guide](https://github.com/angular/angular-cli/wiki/stories-1.0-update).
* By default, now that Angular 4 is final, we will generate an Angular 4.0 project with `ng new`.
* We fixed a problem with AOT and templates where errors were not always reported. Now they should be. This may surface previously hidden bugs that existed in your codebase.
* We really hope to make your life easier.
* Be excellent to each other.


### Special Thanks

* The CLI team: @hansl, @brocco, @filipesilva, @sumitarora.
* Our team of first responders who've been really helpful through the whole process: @delasteve, @clydin, @beeman, @intellix, @meligy, @grizzm0, @catull, @deebloo, @ricardovaranda, @born2net, and all the others.
* On behalf of the Angular CLI team, thank you to all the contributors, issue reporters, PR commenters and everyone else who has helped in some way to make this release happen. It is with your continued support that this tool has come together the way it has. We hope to bring you more features in the near future. Stay tuned! ❤️


> If you want to go fast, go alone. If you want to go far, go together.
>
> - African Proverb

### Bug Fixes

* **@angular/cli:** adding deployUrl description ([7298000](https://github.com/angular/angular-cli/commit/7298000))
* **@angular/cli:** adding documentation for schema doc ([446dc65](https://github.com/angular/angular-cli/commit/446dc65))
* **@angular/cli:** adding link documentation on home page ([a3d2e44](https://github.com/angular/angular-cli/commit/a3d2e44))
* **@angular/cli:** allow the use of a base-href with scheme ([36b8c9b](https://github.com/angular/angular-cli/commit/36b8c9b))
* **@angular/cli:** allow ts 2.2 ([5a461f1](https://github.com/angular/angular-cli/commit/5a461f1))
* **@angular/cli:** do not error when apps is missing from the config ([d2b28dd](https://github.com/angular/angular-cli/commit/d2b28dd))
* **@angular/cli:** fix default app index ([430cb55](https://github.com/angular/angular-cli/commit/430cb55))
* **@angular/cli:** fixing empty prefix issue when creating new app ([#5597](https://github.com/angular/angular-cli/issues/5597)) ([b25aef2](https://github.com/angular/angular-cli/commit/b25aef2))
* **@angular/cli:** Fixing global path issue ([1fe921d](https://github.com/angular/angular-cli/commit/1fe921d))
* **@angular/cli:** fixing lint error issue added flag `--type-check` ([bab9a56](https://github.com/angular/angular-cli/commit/bab9a56))
* **@angular/cli:** fixing type and adding link to documentation ([47f50e8](https://github.com/angular/angular-cli/commit/47f50e8))
* **@angular/cli:** remove mention of 'ng update' from lint warning ([be0762b](https://github.com/angular/angular-cli/commit/be0762b))
* **@angular/cli:** update version of zone.js to support Angular 4.0.0-rc.5 ([b918603](https://github.com/angular/angular-cli/commit/b918603)), closes [#5480](https://github.com/angular/angular-cli/issues/5480)
* **@angular/cli:** always use ng4 in ng new ([baf0c7d](https://github.com/angular/angular-cli/commit/baf0c7d)), closes [#5566](https://github.com/angular/angular-cli/issues/5566)
* **@ngtools/webpack:** add template/styles as dependencies ([7cdf56b](https://github.com/angular/angular-cli/commit/7cdf56b))
* **@ngtools/webpack:** diagnose generated files and resolve sourcemaps ([5acf10b](https://github.com/angular/angular-cli/commit/5acf10b)), closes [#5264](https://github.com/angular/angular-cli/issues/5264) [#4538](https://github.com/angular/angular-cli/issues/4538)



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


----

CHANGELOG for Betas and before can still be found on github: https://github.com/angular/angular-cli/blob/ed5f47dc22d5eb4a5d4b4ae2c8f7cb0ec1a999f3/CHANGELOG.md
<a name="1.0.2"></a>
## [1.0.2](https://github.com/angular/angular-cli/compare/v1.0.1...v1.0.2) (2017-05-03)


### Bug Fixes

* add support for branch-only commit message types. ([646c1b0](https://github.com/angular/angular-cli/commit/646c1b0))
* **@angular/cli:** explicitly disable warning overlays ([f73a9e4](https://github.com/angular/angular-cli/commit/f73a9e4))
* **@angular/cli:** Improve error message for create component with -m option ([b11d560](https://github.com/angular/angular-cli/commit/b11d560))
* **@angular/cli:** removing skip e2e test ([fb96871](https://github.com/angular/angular-cli/commit/fb96871))
* **@angular/cli:** use quiet flag only in case of npm ([9805010](https://github.com/angular/angular-cli/commit/9805010))
* **@angular/cli:** use safer stylesheet minification settings ([806447e](https://github.com/angular/angular-cli/commit/806447e))



