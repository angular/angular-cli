# Angular CLI

### Overview
The Angular CLI is a tool to initialize, develop, scaffold  and maintain [Angular](https://angular.io) applications

### Getting Started
To install the angular-cli:
```
npm install -g angular-cli
```

Generating and serving an Angular project via a development server
[Create](new) and [run](serve) a new project:
```
ng new my-project
cd new-project
ng serve
```
Navigate to http://localhost:4200/. The app will automatically reload if you change any of the source files.

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

### Global styles

The `styles.css` file allows users to add global styles and supports
[CSS imports](https://developer.mozilla.org/en/docs/Web/CSS/@import).

If the project is created with the `--style=sass` option, this will be a `.sass`
file instead, and the same applies to `scss/less/styl`.

You can add more global styles via the `apps[0].styles` property in `angular-cli.json`.

### Global Library Installation

Some javascript libraries need to be added to the global scope, and loaded as if
they were in a script tag. We can do this using the `apps[0].scripts` and
`apps[0].styles` properties of `angular-cli.json`.

As an example, to use [Bootstrap 4](http://v4-alpha.getbootstrap.com/) this is
what you need to do:

First install Bootstrap from `npm`:

```bash
npm install bootstrap@next
```

Then add the needed script files to `apps[0].scripts`:

```json
"scripts": [
  "../node_modules/jquery/dist/jquery.js",
  "../node_modules/tether/dist/js/tether.js",
  "../node_modules/bootstrap/dist/js/bootstrap.js"
],
```

Finally add the Bootstrap CSS to the `apps[0].styles` array:
```json
"styles": [
  "../node_modules/bootstrap/dist/css/bootstrap.css",
  "styles.css"
],
```

Restart `ng serve` if you're running it, and Bootstrap 4 should be working on
your app.

### Additional Commands
* [ng new](new)
* [ng init](init)
* [ng serve](serve)
* [ng generate](generate)
* [ng test](test)
* [ng e2e](e2e)
* [ng build](build)
* [ng get/ng set](config)
* [ng docs](docs)

### How to Guides
* Setup AngularFire _(coming soon)_
* Include bootstrap (CSS) _(coming soon)_
* Include Font Awesome _(coming soon)_
* Setup of global styles _(coming soon)_
* Setup bootstrap with SASS _(coming soon)_
* Setup Angular Material 2 _(coming soon)_
