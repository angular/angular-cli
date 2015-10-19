# Angular-CLI

Prototype of a CLI for Angular 2 applications.

## Note

This projects is very much still a work in progress.

We still have a long way before getting out of our alpha stage.
If you wish to collaborate while the project is still young, checkout [our list issues](https://github.com/angular/angular-cli/issues).

## Installation

```bash
npm install -g angular-cli
```

## Usage

```bash
ng --help
```

### Generating and serving an Angular2 project

```bash
ng new PROJECT_NAME
cd PROJECT_NAME
ng serve
```

## Development Hints

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
