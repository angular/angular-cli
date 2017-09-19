## Angular CLI: Bazel Branch
### CLI for Angular applications based on the [ember-cli](http://www.ember-cli.com/) project.

<!-- Badges section here. -->
[![Build Status](https://img.shields.io/travis/angular/angular-cli/master.svg?label=travis)][travis-badge-url]
[![CircleCI branch](https://img.shields.io/circleci/project/github/RedSparr0w/node-csgo-parser/master.svg?label=circleci)](https://circleci.com/gh/angular/angular-cli)
[![Dependency Status][david-badge]][david-badge-url]
[![devDependency Status][david-dev-badge]][david-dev-badge-url]

[![npm](https://img.shields.io/npm/v/%40angular/cli.svg)][npm-badge-url]
[![npm](https://img.shields.io/npm/v/%40angular/cli/next.svg)][npm-badge-url]
[![npm](https://img.shields.io/npm/l/@angular/cli.svg)][npm-badge-url]
[![npm](https://img.shields.io/npm/dm/@angular/cli.svg)][npm-badge-url]

[![Join the chat at https://gitter.im/angular/angular-cli](https://img.shields.io/gitter/room/nwjs/nw.js.svg)](https://gitter.im/angular/angular-cli?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Caretaker](https://img.shields.io/badge/caretaker-hansl-blue.svg)](https://github.com/hansl)

[![GitHub forks](https://img.shields.io/github/forks/angular/angular-cli.svg?style=social&label=Fork)](https://github.com/angular/angular-cli/fork)
[![GitHub stars](https://img.shields.io/github/stars/angular/angular-cli.svg?style=social&label=Star)](https://github.com/angular/angular-cli)


## EXPERIMENTAL

**This is an EXPERIMENTAL early version of the bazel support. **

Read more about bazel here: [Building Angular apps at scale](https://medium.com/@Jakeherringbone/building-angular-apps-at-scale-813ef42add04).

Before submitting new issues, have a look at [issues marked with the `type: faq` label](https://github.com/angular/angular-cli/issues?utf8=%E2%9C%93&q=is%3Aissue%20label%3A%22type%3A%20faq%22%20).




## Prerequisites

Both the CLI and generated project have dependencies that require Node 6.9.0 or higher, together
with NPM 3 or higher.

### Bazel and iBazel

* Make sure you have [Bazel](https://bazel.build/) installed.
* Make sure you have [Bazel Watcher](https://github.com/bazelbuild/bazel-watcher) compiled and installed.

## Table of Contents

* [Installation](#installation)
* [Usage](#usage)
* [License](#license)

## Installation

**BEFORE YOU INSTALL:** please read the [prerequisites](#prerequisites)
```bash
npm install -g @angular/cli
npm install -g @nrwl/bazel
```

### @Nrwl/Bazel?

THe bazel support is a collaboration of the Angular team at Google and the [Nrwl](http://nrwl.io) team. At the moment, some code lives under `@nrwl`, but it will move under `@angular` once it stabilizes.



## [Usage](#usage)

### Generate an Angular Workspace

```bash
ng new PROJECT-NAME --collection=@nrwl/bazel
cd PROJECT-NAME
```

This is an empty Angular workspace.




### Three Types of Projects

You can generate three types of projects inside a workspace:

* `lib`-a typescript library
* `nglib`-an Angular library exporting an NgModule
* `app`-an Angular application that can be built, served, and shipped to the user

Most of the code in a workspace will be in libs and nglibs. Apps should merely assemble a few nglibs and add some environment-specific parameters.




### Generate an Angular Library

```bash
ng generate nglib shared
```

Open `libs/shared` to find an empty NgModule.




### Generate a Component in an NgLibrary

```bash
ng generate component logo --lib=shared --module=shared.module.ts --export
```

This will create `LogoComponent` declared and exported from the `SharedModule`.

### Build a Library

We can build the library by running the following command:

```bash
ng build shared
```

### Test a Library

We can also test it by running:

```bash
ng test shared
```




### Generate an Angular Application

```bash
ng generate app main
```

Open `libs/shared` to find an empty application.

First, let's add a dependency to the shared library.

Open `apps/main/BUILD.bazel` and add `//libs/shared` to the list of deps, like this:

```bash
ng_module(
  name = "module",
  srcs = glob(["**/*.ts"], exclude = ["e2e/**/*.ts"]),
  deps = [
    '//libs/shared:module'
  ],
  tsconfig = "//:tsconfig.json"
)
```

This tells `Bazel` that if `shared` changes, the `main` application should be rebuilt.


Next, open `app.module.ts` and change it to imports `SharedModule`, like this:

```typescript
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { BrowserModule } from '@angular/platform-browser';
import { SharedModule } from 'shared';

@NgModule({
  imports: [
    BrowserModule,
    SharedModule
  ],
  declarations: [AppComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

Note that we can use the `shared` library name to import the module. In other words, use relative imports within a library or an application, and absolute imports to import libraries.

Finally, open `app.component.html` and change it to look like this:

```html
App:
<app-logo></app-logo>
```




### Serve an Angular Application

```bash
ng serve main
```

Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.



### Build an Application

The following command will build the main application.

```bash
ng build main
```

### Test an Application

The following command will build the main application.

```bash
ng test main
```



## Extra Notes

* Read [Building Angular apps at scale](https://medium.com/@Jakeherringbone/building-angular-apps-at-scale-813ef42add04) to understand the advantages of using Bazel.
* In this branch everything is always built in the AOT mode to make production and dev builds as close as possible.


## License

MIT


[travis-badge]: https://travis-ci.org/angular/angular-cli.svg?branch=master
[travis-badge-url]: https://travis-ci.org/angular/angular-cli
[david-badge]: https://david-dm.org/angular/angular-cli.svg
[david-badge-url]: https://david-dm.org/angular/angular-cli
[david-dev-badge]: https://david-dm.org/angular/angular-cli/dev-status.svg
[david-dev-badge-url]: https://david-dm.org/angular/angular-cli?type=dev
[npm-badge]: https://img.shields.io/npm/v/@angular/cli.svg
[npm-badge-url]: https://www.npmjs.com/package/@angular/cli
