<a name="13.0.0-rc.0"></a>

# 13.0.0-rc.0 (2021-10-14)

## Breaking Changes

### @nguniversal/common

- Inlining of critical CSS is no longer enable by default. Users already on Angular version 12 and have not opted-out from using this feature are encouraged to opt-in using the `inlineCriticalCss` option.

The motivation behind this change is that the package used to parse the CSS has a number of defects which can lead to unactionable error messages when updating to Angular 13 from versions priors to 12. Such errors can be seen in the following issue https://github.com/angular/angular-cli/issues/20760.

### @nguniversal/builders

| Commit                                                                                           | Type | Description                                  |
| ------------------------------------------------------------------------------------------------ | ---- | -------------------------------------------- |
| [6ba411cd](https://github.com/angular/universal/commit/6ba411cd8c8c18d2f334d7182fee65402a118d42) | fix  | index.original.html should be used if exists |

### @nguniversal/common

| Commit                                                                                           | Type | Description                                              |
| ------------------------------------------------------------------------------------------------ | ---- | -------------------------------------------------------- |
| [357411dd](https://github.com/angular/universal/commit/357411ddb344c030455937f9b0c8ba62c4eafae4) | feat | disable critical CSS inlining by default                 |
| [838e478e](https://github.com/angular/universal/commit/838e478e5421b918cd51f7bfbb7ba51be1cb7604) | feat | officially support Node.js v16                           |
| [b94bcd11](https://github.com/angular/universal/commit/b94bcd118eb489abf9822ed49c1a725e8b1c8fb8) | fix  | inlineCriticalCssProcessor `outputPath` fallback to `''` |

## Special Thanks

Alan Agius, Doug Parker, Douglas Parker, Javier Infante and ikeq

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
