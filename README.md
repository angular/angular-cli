## Angular CLI

[![Join the chat at https://gitter.im/angular/angular-cli](https://badges.gitter.im/angular/angular-cli.svg)](https://gitter.im/angular/angular-cli?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Build Status][travis-badge]][travis-badge-url]
[![Dependency Status][david-badge]][david-badge-url]
[![devDependency Status][david-dev-badge]][david-dev-badge-url]
[![npm][npm-badge]][npm-badge-url]

Prototype of a CLI for Angular applications based on the [ember-cli](http://www.ember-cli.com/) project.

## Note

This project is very much still a work in progress.

The CLI is now in beta.
If you wish to collaborate while the project is still young, check out [our issue list](https://github.com/angular/angular-cli/issues).

Before submitting new issues, have a look at [issues marked with the `type: faq` label](https://github.com/angular/angular-cli/issues?utf8=%E2%9C%93&q=is%3Aissue%20label%3A%22type%3A%20faq%22%20).

## Webpack update

We changed the build system between beta.10 and beta.14, from SystemJS to Webpack.
And with it comes a lot of benefits.
To take advantage of these, your app built with the old beta will need to migrate.

You can update your `beta.10` projects to `beta.14` by following [these instructions](https://github.com/angular/angular-cli/wiki/Upgrading-from-Beta.10-to-Beta.14).

## Prerequisites

Both the CLI and generated project have dependencies that require Node 6.9.0 or higher, together
with NPM 3 or higher.

## Table of Contents

* [Installation](#installation)
* [Usage](#usage)
* [Generating a New Project](#generating-and-serving-an-angular-project-via-a-development-server)
* [Generating Components, Directives, Pipes and Services](#generating-components-directives-pipes-and-services)
* [Updating Angular CLI](#updating-angular-cli)
* [Development Hints for hacking on Angular CLI](#development-hints-for-hacking-on-angular-cli)
* [Documentation](#documentation)
* [License](#license)

## Installation

**BEFORE YOU INSTALL:** please read the [prerequisites](#prerequisites)
```bash
npm install -g @angular/cli
```

## Usage

```bash
ng help
```

### Generating and serving an Angular project via a development server

```bash
ng new PROJECT_NAME
cd PROJECT_NAME
ng serve
```
Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

You can configure the default HTTP port and the one used by the LiveReload server with two command-line options :

```bash
ng serve --host 0.0.0.0 --port 4201 --live-reload-port 49153
```

### Generating Components, Directives, Pipes and Services

You can use the `ng generate` (or just `ng g`) command to generate Angular components:

```bash
ng generate component my-new-component
ng g component my-new-component # using the alias

# components support relative path generation
# if in the directory src/app/feature/ and you run
ng g component new-cmp
# your component will be generated in src/app/feature/new-cmp
# but if you were to run
ng g component ../newer-cmp
# your component will be generated in src/app/newer-cmp
```
You can find all possible blueprints in the table below:

Scaffold  | Usage
---       | ---
Component | `ng g component my-new-component`
Directive | `ng g directive my-new-directive`
Pipe      | `ng g pipe my-new-pipe`
Service   | `ng g service my-new-service`
Class     | `ng g class my-new-class`
Interface | `ng g interface my-new-interface`
Enum      | `ng g enum my-new-enum`
Module    | `ng g module my-module`

### Updating Angular CLI

If you're using Angular CLI `beta.28` or less, you need to uninstall `angular-cli` package. It should be done due to changing of package's name and scope from `angular-cli` to `@angular/cli`:
```bash
npm uninstall -g angular-cli
npm uninstall --save-dev angular-cli
```

To update Angular CLI to a new version, you must update both the global package and your project's local package.

Global package:
```bash
npm uninstall -g @angular/cli
npm cache clean
npm install -g @angular/cli@latest
```

Local project package:
```bash
rm -rf node_modules dist # use rmdir on Windows
npm install --save-dev @angular/cli@latest
npm install
```

You can find more details about changes between versions in [CHANGELOG.md](https://github.com/angular/angular-cli/blob/master/CHANGELOG.md).


## Development Hints for hacking on Angular CLI

### Working with master

```bash
git clone https://github.com/angular/angular-cli.git
cd angular-cli
npm link
```

`npm link` is very similar to `npm install -g` except that instead of downloading the package
from the repo, the just cloned `angular-cli/` folder becomes the global package.
Any changes to the files in the `angular-cli/` folder will immediately affect the global `@angular/cli` package,
allowing you to quickly test any changes you make to the cli project.

Now you can use `@angular/cli` via the command line:

```bash
ng new foo
cd foo
npm link @angular/cli
ng serve
```

`npm link @angular/cli` is needed because by default the globally installed `@angular/cli` just loads
the local `@angular/cli` from the project which was fetched remotely from npm.
`npm link @angular/cli` symlinks the global `@angular/cli` package to the local `@angular/cli` package.
Now the `angular-cli` you cloned before is in three places:
The folder you cloned it into, npm's folder where it stores global packages and the Angular CLI project you just created.

You can also use `ng new foo --link-cli` to automatically link the `@angular/cli` package.

Please read the official [npm-link documentation](https://www.npmjs.org/doc/cli/npm-link.html)
and the [npm-link cheatsheet](http://browsenpm.org/help#linkinganynpmpackagelocally) for more information.


## Documentation

The documentation for the Angular CLI is located in this repo's [wiki](https://github.com/angular/angular-cli/wiki).

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
