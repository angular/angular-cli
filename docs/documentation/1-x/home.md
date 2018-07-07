<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# Angular CLI

NOTE: this documentation is for Angular CLI 1.x. For Angular CLI 6 go [here](home) instead.

### Overview
The Angular CLI is a tool to initialize, develop, scaffold  and maintain [Angular](https://angular.io) applications

### Getting Started
To install the Angular CLI:
```
npm install -g @angular/cli
```

Generating and serving an Angular project via a development server
[Create](1-x/new) and [run](1-x/serve) a new project:
```
ng new my-project
cd my-project
ng serve
```
Navigate to http://localhost:4200/. The app will automatically reload if you change any of the source files.

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
End-to-end tests are run via [Protractor](http://www.protractortest.org/).

### Additional Commands
* [ng new](1-x/new)
* [ng serve](1-x/serve)
* [ng generate](1-x/generate)
* [ng lint](1-x/lint)
* [ng test](1-x/test)
* [ng e2e](1-x/e2e)
* [ng build](1-x/build)
* [ng get/ng set](1-x/config)
* [ng doc](1-x/doc)
* [ng eject](1-x/eject)
* [ng xi18n](1-x/xi18n)
* [ng update](1-x/update)

## Angular CLI Config Schema
* [Config Schema](1-x/angular-cli)

### Additional Information
There are several [stories](1-x/stories) which will walk you through setting up
additional aspects of Angular applications.
