<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# Angular CLI

### Overview
The Angular CLI is a tool to initialize, develop, scaffold  and maintain [Angular](https://angular.io) applications

### Getting Started
To install the Angular CLI:
```
npm install -g @angular/cli
```

Generating and serving an Angular project via a development server
[Create](new) and [run](serve) a new project:
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
End-to-end tests are run via [Protractor](https://angular.github.io/protractor/).

### Additional Commands
* [ng new](new)
* [ng serve](serve)
* [ng generate](generate)
* [ng lint](lint)
* [ng test](test)
* [ng e2e](e2e)
* [ng build](build)
* [ng get/ng set](config)
* [ng doc](doc)
* [ng eject](eject)
* [ng xi18n](xi18n)

## Angular CLI Config Schema
* [Config Schema](angular-cli)

### Additional Information
There are several [stories](stories) which will walk you through setting up
additional aspects of Angular applications.
