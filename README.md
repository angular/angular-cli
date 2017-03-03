## Angular CLI

[![Join the chat at https://gitter.im/angular/angular-cli](https://badges.gitter.im/angular/angular-cli.svg)](https://gitter.im/angular/angular-cli?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Build Status][travis-badge]][travis-badge-url]
[![Dependency Status][david-badge]][david-badge-url]
[![devDependency Status][david-dev-badge]][david-dev-badge-url]
[![npm][npm-badge]][npm-badge-url]

CLI for Angular applications based on the [ember-cli](http://www.ember-cli.com/) project.

## Note

The CLI is now in Release Candidate (RC).
If you are updating from a beta version, check out our [RC Update Guide]
(https://github.com/angular/angular-cli/wiki/stories-rc-update).

If you wish to collaborate, check out [our issue list](https://github.com/angular/angular-cli/issues).

Before submitting new issues, have a look at [issues marked with the `type: faq` label](https://github.com/angular/angular-cli/issues?utf8=%E2%9C%93&q=is%3Aissue%20label%3A%22type%3A%20faq%22%20).

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


angular-cli will add reference to `components`, `directives` and `pipes` automatically in the `app.module.ts`. If you need to add this references to another custom module, follow this steps:

1. `ng g module newModule` to create a new module
2.  call `ng g component new-module/newComponent`

This should add the new `component`, `directive` or `pipe` reference to the `newModule` you've created.

### Generating a route

Generating routes in the CLI has been disabled for the time being. A new router and new route generation blueprints are coming.

You can read the official documentation for the new Router here: https://angular.io/docs/ts/latest/guide/router.html. Please note that even though route generation is disabled, building your projects with routing is still fully supported.

### Creating a build

```bash
ng build
```

The build artifacts will be stored in the `dist/` directory.

### Build Targets and Environment Files

`ng build` can specify both a build target (`--target=production` or `--target=development`) and an
environment file to be used with that build (`--environment=dev` or `--environment=prod`).
By default, the development build target and environment are used.

The mapping used to determine which environment file is used can be found in `angular-cli.json`:

```json
"environments": {
  "source": "environments/environment.ts",
  "dev": "environments/environment.ts",
  "prod": "environments/environment.prod.ts"
}
```

These options also apply to the serve command. If you do not pass a value for `environment`,
it will default to `dev` for `development` and `prod` for `production`.

```bash
# these are equivalent
ng build --target=production --environment=prod
ng build --prod --env=prod
ng build --prod
# and so are these
ng build --target=development --environment=dev
ng build --dev --e=dev
ng build --dev
ng build
```

You can also add your own env files other than `dev` and `prod` by doing the following:
- create a `src/environments/environment.NAME.ts`
- add `{ "NAME": 'src/environments/environment.NAME.ts' }` to the the `apps[0].environments` object in `angular-cli.json`
- use them via the `--env=NAME` flag on the build/serve commands.

### Base tag handling in index.html

When building you can modify base tag (`<base href="/">`) in your index.html with `--base-href your-url` option.

```bash
# Sets base tag href to /myUrl/ in your index.html
ng build --base-href /myUrl/
ng build --bh /myUrl/
```

### Bundling

All builds make use of bundling, and using the `--prod` flag in  `ng build --prod`
or `ng serve --prod` will also make use of uglifying and tree-shaking functionality.

### Running unit tests

```bash
ng test
```

Tests will execute after a build is executed via [Karma](http://karma-runner.github.io/0.13/index.html), and it will automatically watch your files for changes. You can run tests a single time via `--watch=false` or `--single-run`.

### Running end-to-end tests

```bash
ng e2e
```

Before running the tests make sure you are serving the app via `ng serve`.

End-to-end tests are run via [Protractor](https://angular.github.io/protractor/).

### Proxy To Backend
Using the proxying support in webpack's dev server we can highjack certain urls and send them to a backend server.
We do this by passing a file to `--proxy-config`

Say we have a server running on `http://localhost:3000/api` and we want all calls to `http://localhost:4200/api` to go to that server.

We create a file next to projects `package.json` called `proxy.conf.json`
with the content

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false
  }
}
```

You can read more about what options are available here [webpack-dev-server proxy settings](https://webpack.github.io/docs/webpack-dev-server.html#proxy)

and then we edit the `package.json` file's start script to be

```json
"start": "ng serve --proxy-config proxy.conf.json",
```

now run it with `npm start`

### Deploying the app via GitHub Pages

You can deploy your apps quickly via:

```bash
ng github-pages:deploy --message "Optional commit message"
```

This will do the following:

- creates GitHub repo for the current project if one doesn't exist
- rebuilds the app in production mode at the current `HEAD`
- creates a local `gh-pages` branch if one doesn't exist
- moves your app to the `gh-pages` branch and creates a commit
- edit the base tag in index.html to support github pages
- pushes the `gh-pages` branch to github
- returns back to the original `HEAD`

Creating the repo requires a token from github, and the remaining functionality
relies on ssh authentication for all git operations that communicate with github.com.
To simplify the authentication, be sure to [setup your ssh keys](https://help.github.com/articles/generating-ssh-keys/).

If you are deploying a [user or organization page](https://help.github.com/articles/user-organization-and-project-pages/), you can instead use the following command:

```bash
ng github-pages:deploy --user-page --message "Optional commit message"
```

This command pushes the app to the `master` branch on the github repo instead
of pushing to `gh-pages`, since user and organization pages require this.


### Linting and formatting code

You can lint your app code by running `ng lint`.
This will use the `lint` npm script that in generated projects uses `tslint`.

You can modify the these scripts in `package.json` to run whatever tool you prefer.

### Support for offline applications

**The `--mobile` flag has been disabled temporarily. Sorry for the inconvenience.**

~~Angular-CLI includes support for offline applications via the `--` flag on `ng new`. Support is experimental, please see the angular/mobile-toolkit project and https://mobile.angular.io/ for documentation on how to make use of this functionality.~~

### Commands autocompletion

To turn on auto completion use the following commands:

For bash:
```bash
ng completion 1>> ~/.bashrc 2>>&1
source ~/.bashrc
```

For zsh:
```bash
ng completion 1>> ~/.zshrc 2>>&1
source ~/.zshrc
```

Windows users using gitbash:
```bash
ng completion 1>> ~/.bash_profile 2>>&1
source ~/.bash_profile
```

### Project assets

You use the `assets` array in `angular-cli.json` to list files or folders you want to copy as-is when building your project:
```json
"assets": [
  "assets",
  "favicon.ico"
]
```

### Global styles

The `styles.css` file allows users to add global styles and supports
[CSS imports](https://developer.mozilla.org/en/docs/Web/CSS/@import).

If the project is created with the `--style=sass` option, this will be a `.sass`
file instead, and the same applies to `scss/less/styl`.

You can add more global styles via the `apps[0].styles` property in `angular-cli.json`.

### CSS Preprocessor integration

Angular-CLI supports all major CSS preprocessors:
- sass/scss ([http://sass-lang.com/](http://sass-lang.com/))
- less ([http://lesscss.org/](http://lesscss.org/))
- stylus ([http://stylus-lang.com/](http://stylus-lang.com/))

To use these prepocessors simply add the file to your component's `styleUrls`:

```javascript
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  title = 'app works!';
}
```

When generating a new project you can also define which extension you want for
style files:

```bash
ng new sassy-project --style=sass
```

Or set the default style on an existing project:

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
