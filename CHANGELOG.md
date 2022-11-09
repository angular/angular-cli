<a name="15.0.0-rc.0"></a>

# 15.0.0-rc.0 (2022-11-09)

### @nguniversal/common

| Commit                                                                                           | Type | Description                                         |
| ------------------------------------------------------------------------------------------------ | ---- | --------------------------------------------------- |
| [fb904948](https://github.com/angular/universal/commit/fb904948e996e9d7ea96915d6480248c999afd94) | fix  | mark `bootstrap` in `RenderOptions` as non required |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.2"></a>

# 14.2.2 (2022-11-09)

### @nguniversal/common

| Commit                                                                                           | Type | Description                                         |
| ------------------------------------------------------------------------------------------------ | ---- | --------------------------------------------------- |
| [7f2ce670](https://github.com/angular/universal/commit/7f2ce670714c466a7ea6d747f7f22504a9fbd618) | fix  | mark `bootstrap` in `RenderOptions` as non required |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.0.0-next.1"></a>

# 15.0.0-next.1 (2022-11-03)

### @nguniversal/builders

| Commit                                                                                           | Type | Description                                                                 |
| ------------------------------------------------------------------------------------------------ | ---- | --------------------------------------------------------------------------- |
| [b7dbc25c](https://github.com/angular/universal/commit/b7dbc25c3fc7ab23c5046b07ed02fd4a7d7ca0eb) | fix  | address method Promise.prototype.then called on incompatible receiver error |
| [654c23c8](https://github.com/angular/universal/commit/654c23c88c05bb1350411b89b2d9dcb2f65a26ca) | fix  | import `zone.js` in worker during prerendering                              |

### @nguniversal/express-engine

| Commit                                                                                           | Type | Description            |
| ------------------------------------------------------------------------------------------------ | ---- | ---------------------- |
| [98b508ed](https://github.com/angular/universal/commit/98b508edda4e60253047289cd9ccdb2574a632bb) | fix  | replace zone.js import |

## Special Thanks

Alan Agius, Carlos Torrecillas and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.1"></a>

# 14.2.1 (2022-11-03)

### @nguniversal/builders

| Commit                                                                                           | Type | Description                                                                 |
| ------------------------------------------------------------------------------------------------ | ---- | --------------------------------------------------------------------------- |
| [8f47c59e](https://github.com/angular/universal/commit/8f47c59e40da9e431967a32258a41bb5b22630fb) | fix  | address method Promise.prototype.then called on incompatible receiver error |

### @nguniversal/express-engine

| Commit                                                                                           | Type | Description            |
| ------------------------------------------------------------------------------------------------ | ---- | ---------------------- |
| [eab35cff](https://github.com/angular/universal/commit/eab35cffa9dc2529146c8783e58a2aae651158b4) | fix  | replace zone.js import |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="15.0.0-next.0"></a>

# 15.0.0-next.0 (2022-10-13)

## Breaking Changes

### @nguniversal/common

- Angular universal no longer supports Node.js versions `14.[15-19].x` and `16.[10-12].x`. Current supported versions of Node.js are `14.20.x`, `16.13.x` and `18.10.x`.

### @nguniversal/express-engine

- deprecated `appDir` option was removed from the express-engine ng add schematic. This option was previously unused.

### @nguniversal/express-engine

| Commit                                                                                           | Type     | Description                     |
| ------------------------------------------------------------------------------------------------ | -------- | ------------------------------- |
| [905c0ae1](https://github.com/angular/universal/commit/905c0ae141b4fb1523550de5847b0115aa9417cb) | refactor | remove deprecated appDir option |

### @nguniversal/builders

| Commit                                                                                           | Type | Description                                  |
| ------------------------------------------------------------------------------------------------ | ---- | -------------------------------------------- |
| [fef00f90](https://github.com/angular/universal/commit/fef00f90a2196440d316549967258f3d64180539) | feat | add `ng-server-context` for SSG pages        |
| [08979337](https://github.com/angular/universal/commit/0897933727ce6cb78134be2b98581c096bfb409f) | feat | add sourcemap mapping support for dev-server |

### @nguniversal/common

| Commit                                                                                           | Type | Description                           |
| ------------------------------------------------------------------------------------------------ | ---- | ------------------------------------- |
| [a62d3d3b](https://github.com/angular/universal/commit/a62d3d3be86a9d2b6eef9856fbd2734a721f252d) | feat | add `ng-server-context` for SSR pages |
| [78cf7b7f](https://github.com/angular/universal/commit/78cf7b7f97b3afae49ad7787a7319e5ec09cbc51) | feat | add support for Node.js version 18    |

## Special Thanks

Alan Agius, Greg Magolan and angular-robot[bot]

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.2.0"></a>

# 14.2.0 (2022-09-07)

### @nguniversal/common

| Commit                                                                                           | Type | Description                                  |
| ------------------------------------------------------------------------------------------------ | ---- | -------------------------------------------- |
| [6dcce858](https://github.com/angular/universal/commit/6dcce858ee4dae07268f26835f27136a354d227c) | fix  | handle cookies with localhost domain as path |

### @nguniversal/express-engine

| Commit                                                                                           | Type | Description                             |
| ------------------------------------------------------------------------------------------------ | ---- | --------------------------------------- |
| [d9a13469](https://github.com/angular/universal/commit/d9a13469a039bfca94939ecac6201973990b7b96) | fix  | remove default value of `appDir` option |

## Special Thanks

Alan Agius, Charles Lyding and angular-robot[bot]

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.1.0"></a>

# 14.1.0 (2022-08-17)

### @nguniversal/common

| Commit                                                                                           | Type | Description                                                         |
| ------------------------------------------------------------------------------------------------ | ---- | ------------------------------------------------------------------- |
| [26f2aa57](https://github.com/angular/universal/commit/26f2aa576b7a0be25aebf8f8f9f75fb57c23be28) | feat | add support for `blob` and `arraybuffer` in TransferHttpCacheModule |

## Special Thanks

Alan Agius, Charles Lyding, Doug Parker, Joey Perrott and renovate[bot]

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.3"></a>

# 14.0.3 (2022-07-06)

### @nguniversal/common

| Commit                                                                                           | Type | Description                  |
| ------------------------------------------------------------------------------------------------ | ---- | ---------------------------- |
| [b68cc08a](https://github.com/angular/universal/commit/b68cc08a065d4a657d8d4f374aaa605e9ff9098a) | fix  | handle `ngDevMode` correctly |

## Special Thanks

Alan Agius, Paul Gschwendtner and arturovt

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.2"></a>

# 14.0.2 (2022-06-23)

### @nguniversal/builders

| Commit                                                                                           | Type | Description                                     |
| ------------------------------------------------------------------------------------------------ | ---- | ----------------------------------------------- |
| [ddffd973](https://github.com/angular/universal/commit/ddffd97309fa7cddc20e6b5ea4735b2f5fc429a9) | fix  | correctly handle path normalizations on Windows |

## Special Thanks

Alan Agius and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.1"></a>

# 14.0.1 (2022-06-15)

### @nguniversal/common

| Commit                                                                                           | Type | Description                                  |
| ------------------------------------------------------------------------------------------------ | ---- | -------------------------------------------- |
| [baff49b3](https://github.com/angular/universal/commit/baff49b353111e1f183b023ad94643fc4cb7bbf2) | fix  | correctly handle headers for jsdom in Clover |

## Special Thanks

Alan Agius and hiepxanh

<!-- CHANGELOG SPLIT MARKER -->

<a name="14.0.0"></a>

# 14.0.0 (2022-06-02)

## Breaking Changes

### @nguniversal/common

- Support for Node.js v12 has been removed as it will become EOL on 2022-04-30. Please use Node.js v14.15 or later.

###

- Deprecated `@nguniversal/aspnetcore-engine`, `@nguniversal/hapi-engine` and `@nguniversal/socket-engine` has been removed in favor of `@nguniversal/common`.

### @nguniversal/common

| Commit                                                                                           | Type | Description                 |
| ------------------------------------------------------------------------------------------------ | ---- | --------------------------- |
| [46caf56c](https://github.com/angular/universal/commit/46caf56c59e026935b8ed33bad780ce1fa8ac215) | feat | drop support for Node.js 12 |

###

| Commit                                                                                           | Type     | Description               |
| ------------------------------------------------------------------------------------------------ | -------- | ------------------------- |
| [2a84fe03](https://github.com/angular/universal/commit/2a84fe03cf7c9c3bae9593e213126c8cadfd3a92) | refactor | remove deprecated engines |

### express-engine

| Commit                                                                                           | Type | Description                                    |
| ------------------------------------------------------------------------------------------------ | ---- | ---------------------------------------------- |
| [ccc09c12](https://github.com/angular/universal/commit/ccc09c128569e9d555c6c86f7a19cce3757e0692) | fix  | construct req url instead of using originalUrl |

## Special Thanks

Adam Plumer, Alan Agius, Conrad Magnus Kirschner, Doug Parker and Paul Gschwendtner

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.1.1"></a>

# 13.1.1 (2022-05-04)

### @nguniversal/builders

| Commit                                                                                           | Type | Description                                |
| ------------------------------------------------------------------------------------------------ | ---- | ------------------------------------------ |
| [4762906c](https://github.com/angular/universal/commit/4762906cb9ef03a24fc174f5ac4728a8a90049b2) | fix  | address service worker generation failures |

## Special Thanks

Alan Agius

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.1.0"></a>

# 13.1.0 (2022-03-21)

### @nguniversal/common

| Commit                                                                                           | Type | Description                    |
| ------------------------------------------------------------------------------------------------ | ---- | ------------------------------ |
| [891cbbd6](https://github.com/angular/universal/commit/891cbbd65ab2339b560622a4cdc1e1ae131b42dd) | feat | add support for TypeScript 4.6 |

## Special Thanks

Alan Agius and Joey Perrott

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.1.0-next.1"></a>

# 13.1.0-next.1 (2022-01-18)

### @nguniversal/common

| Commit                                                                                           | Type | Description                                   |
| ------------------------------------------------------------------------------------------------ | ---- | --------------------------------------------- |
| [c38b739a](https://github.com/angular/universal/commit/c38b739aa226a723680c02d991b98078ac5b7242) | fix  | correctly handle lazy loaded routes in Clover |
| [03c8e6b2](https://github.com/angular/universal/commit/03c8e6b2431846a1d845921d8ccde550f3cd029e) | fix  | ensure CommonJS migrations can be accessed    |

### @nguniversal/express-engine

| Commit                                                                                           | Type | Description                                   |
| ------------------------------------------------------------------------------------------------ | ---- | --------------------------------------------- |
| [ce08aafd](https://github.com/angular/universal/commit/ce08aafdbbe90993ab432415fe56617f39c1674b) | fix  | initialNavigation should be 'enabledBlocking' |

## Special Thanks

Adam Plumer, Alan Agius, Doug Parker and Mike Huang

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.2"></a>

# 13.0.2 (2022-01-18)

### @nguniversal/common

| Commit                                                                                           | Type | Description                                |
| ------------------------------------------------------------------------------------------------ | ---- | ------------------------------------------ |
| [4f682fbd](https://github.com/angular/universal/commit/4f682fbd41657297ea1f69152f48f525678e4aab) | fix  | ensure CommonJS migrations can be accessed |

## Special Thanks

Adam Plumer, Alan Agius and Doug Parker

<!-- CHANGELOG SPLIT MARKER -->

<a name="13.0.1"></a>

# 13.0.1 (2021-11-11)

### @nguniversal/common

| Commit                                                                                           | Type | Description                                   |
| ------------------------------------------------------------------------------------------------ | ---- | --------------------------------------------- |
| [71516ece](https://github.com/angular/universal/commit/71516ece7163ec88eedb58767093d50a76aa9f57) | fix  | correctly handle lazy loaded routes in Clover |

### @nguniversal/express-engine

| Commit                                                                                           | Type | Description                                   |
| ------------------------------------------------------------------------------------------------ | ---- | --------------------------------------------- |
| [fee929e2](https://github.com/angular/universal/commit/fee929e2a2e499404f4a5abc1b78ef0a6112a0da) | fix  | initialNavigation should be 'enabledBlocking' |

## Special Thanks

Alan Agius, Doug Parker and Mike Huang

<a name="13.1.0-next.0"></a>

# 13.1.0-next-0 (2021-11-03)

No changes since 13.0.0.

<a name="13.0.0"></a>

# 13.0.0 (2021-11-03)

### @nguniversal/common

| Commit                                                                                           | Type | Description                                              |
| ------------------------------------------------------------------------------------------------ | ---- | -------------------------------------------------------- |
| [838e478e](https://github.com/angular/universal/commit/838e478e5421b918cd51f7bfbb7ba51be1cb7604) | feat | officially support Node.js v16                           |
| [b94bcd11](https://github.com/angular/universal/commit/b94bcd118eb489abf9822ed49c1a725e8b1c8fb8) | fix  | inlineCriticalCssProcessor `outputPath` fallback to `''` |

## Special Thanks

Alan Agius, Doug Parker, Douglas Parker, HyperLifelll9, Keen Yee Liau and ikeq

<a name="12.1.3"></a>

# 12.1.3 (2021-10-27)

### @nguniversal/common

| Commit                                                                                           | Type | Description                           |
| ------------------------------------------------------------------------------------------------ | ---- | ------------------------------------- |
| [6819d0c3](https://github.com/angular/universal/commit/6819d0c32f755db80a1d34d15473cf47daf32bcf) | fix  | update `critters` to version `0.0.12` |

### @nguniversal/builders

| Commit                                                                                           | Type | Description                       |
| ------------------------------------------------------------------------------------------------ | ---- | --------------------------------- |
| [7adc8f9a](https://github.com/angular/universal/commit/7adc8f9a96e02eda415c3205012e06c0728b7651) | fix  | correctly handle multiple proxies |

### @nguniversal/express-engine

| Commit                                                                                           | Type | Description                                                           |
| ------------------------------------------------------------------------------------------------ | ---- | --------------------------------------------------------------------- |
| [cfe47ff0](https://github.com/angular/universal/commit/cfe47ff02e702a1758ea0d9ff170f815db929e1b) | fix  | update schematic to be `noPropertyAccessFromIndexSignature` compliant |

## Special Thanks

Alan Agius and Doug Parker

<a name="12.1.2"></a>

# 12.1.2 (2021-10-21)

Update critters to version 0.0.11

## Special Thanks

Alan Agius and Doug Parker

<a name="12.1.1"></a>

# 12.1.1 (2021-09-30)

### @nguniversal/builders

| Commit                                                                                           | Type | Description                                  |
| ------------------------------------------------------------------------------------------------ | ---- | -------------------------------------------- |
| [00cc596f](https://github.com/angular/universal/commit/00cc596fe83fb4f4206b00e6a21975862dfd60e5) | fix  | index.original.html should be used if exists |

## Special Thanks

Doug Parker, Javier Infante and ikeq

<!-- CHANGELOG SPLIT MARKER -->

<a name="12.1.0"></a>

# 12.1.0 (2021-06-26)

### @nguniversal/common

| Commit                                                                                           | Type | Description                         |
| ------------------------------------------------------------------------------------------------ | ---- | ----------------------------------- |
| [ecf9db17](https://github.com/angular/universal/commit/ecf9db17ca12e723d3e670ddc81a39c320d44cca) | fix  | correctly construct host string     |
| [635d61ec](https://github.com/angular/universal/commit/635d61ec944d276551a9081422f819fc32f9ca88) | fix  | add Window stubs to Engine (Clover) |

### @nguniversal/builders

| Commit                                                                                           | Type | Description                                |
| ------------------------------------------------------------------------------------------------ | ---- | ------------------------------------------ |
| [89821991](https://github.com/angular/universal/commit/89821991bd16923f251534744c7dfb3ebd3e40e7) | feat | spawn static server for build artifacts    |
| [b03a7789](https://github.com/angular/universal/commit/b03a7789b7326d123c13e4b9b465c52a186faf9c) | fix  | make prerender work with large route lists |

### @nguniversal/express-engine

| Commit                                                                                           | Type | Description                             |
| ------------------------------------------------------------------------------------------------ | ---- | --------------------------------------- |
| [a11df5a2](https://github.com/angular/universal/commit/a11df5a296cc86fb3b059ba96839e89631261ce5) | fix  | remove in-existing migrations reference |
| [ccc0fc1b](https://github.com/angular/universal/commit/ccc0fc1b07a37e81d6ece27390d0d423bc8f8694) | fix  | add `serverTarget` for prerender        |

## Special Thanks:

Alan Agius, Alex Sierkov, Aristeidis Bampakos, Doug Parker, Keen Yee Liau, Suguru Inatomi and hxrxchang
