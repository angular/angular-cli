## Angular-CLI

[![Join the chat at https://gitter.im/angular/angular-cli](https://badges.gitter.im/angular/angular-cli.svg)](https://gitter.im/angular/angular-cli?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Build Status][travis-badge]][travis-badge-url]
[![Dependency Status][david-badge]][david-badge-url]
[![devDependency Status][david-dev-badge]][david-dev-badge-url]
[![npm][npm-badge]][npm-badge-url]
 
Prototype of a CLI for Angular 2 applications based on the [ember-cli](http://www.ember-cli.com/) project.

## Note

This project is very much still a work in progress.

We still have a long way before getting out of our alpha stage.
If you wish to collaborate while the project is still young, check out [our issue list](https://github.com/angular/angular-cli/issues).

## Prerequisites

The generated project has dependencies that require **Node 4 or greater**.

## Installation

```bash
npm install -g angular-cli
```

## Usage

```bash
ng --help
```

### Generating and serving an Angular2 project via a development server

```bash
ng new PROJECT_NAME
cd PROJECT_NAME
ng serve
```
Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.


### Generating other scaffolds

You can use the `ng generate` (or just `ng g`) command to generate Angular components:

```bash
ng generate component my-new-component
ng g component my-new-component # using the alias
```
You can find all possible blueprints in the table below:

Scaffold  | Usage
---       | ---
Component | `ng g component my-new-component`
Directive | `ng g directive my-new-directive`
Pipe      | `ng g pipe my-new-pipe`
Service   | `ng g service my-new-service`


### Creating a build

```bash
ng build
```

The build artifacts will be stored in the `dist/` directory.


### Running tests

Before running the tests make sure that the project is built. To build the 
project once you can use:

```bash
ng build
```

With the project built in the `dist/` folder you can just run: `karma start`. 
Karma will run the tests and keep the browser open waiting to run again.

This will be easier when the command 
[ng test](https://github.com/angular/angular-cli/issues/70) is implemented.


### Deploying the app via GitHub Pages

The CLI currently comes bundled with [angular-cli-github-pages addon](https://github.com/IgorMinar/angular-cli-github-pages).

This means that you can deploy your apps quickly via:

```
git commit -a -m "final tweaks before deployment - what could go wrong?"
ng github-pages:deploy
```

Checkout [angular-cli-github-pages addon](https://github.com/IgorMinar/angular-cli-github-pages) docs for more info.


## Known issues

This project is currently a prototype so there are many known issues. Just to mention a few:

- All blueprints/scaffolds are in TypeScript only, in the future blueprints in all dialects officially supported by Angular will be available.
- On Windows you need to run the `build` and `serve` commands with Admin permissions, otherwise the performance is not good.
- [Protractor](https://angular.github.io/protractor/) integration is missing.
- The initial installation as well as `ng new` take too long because of lots of npm dependencies.
- "ember" branding leaks through many error messages and help text.
- Many existing ember addons are not compatible with Angular apps built via angular-cli.


## Development Hints for hacking on angular-cli

### Working with master

```bash
git clone https://github.com/angular/angular-cli.git
cd angular-cli
npm link
```

`npm link` is very similar to `npm install -g` except that instead of downloading the package
from the repo, the just cloned `angular-cli/` folder becomes the global package.
Any changes to the files in the `angular-cli/` folder will immediately affect the global `angular-cli` package,
allowing you to quickly test any changes you make to the cli project.

Now you can use `angular-cli` via the command line:

```bash
ng new foo
cd foo
npm link angular-cli
ng server
```

`npm link angular-cli` is needed because by default the globally installed `angular-cli` just loads
the local `angular-cli` from the project which was fetched remotely from npm.
`npm link angular-cli` symlinks the global `angular-cli` package to the local `angular-cli` package.
Now the `angular-cli` you cloned before is in three places:
The folder you cloned it into, npm's folder where it stores global packages and the `angular-cli` project you just created.

Please read the official [npm-link documentation](https://www.npmjs.org/doc/cli/npm-link.html)
and the [npm-link cheatsheet](http://browsenpm.org/help#linkinganynpmpackagelocally) for more information.


## License

MIT


[travis-badge]: https://travis-ci.org/angular/angular-cli.svg?branch=master
[travis-badge-url]: https://travis-ci.org/angular/angular-cli
[david-badge]: https://david-dm.org/angular/angular-cli.svg
[david-badge-url]: https://david-dm.org/angular/angular-cli
[david-dev-badge]: https://david-dm.org/angular/angular-cli/dev-status.svg
[david-dev-badge-url]: https://david-dm.org/angular/angular-cli#info=devDependencies
[npm-badge]: https://img.shields.io/npm/v/angular-cli.svg
[npm-badge-url]: https://www.npmjs.com/package/angular-cli
