# @angular-devkit/build-angular

This package contains [Architect builders](/packages/angular_devkit/architect/README.md) used to build and test Angular applications and libraries.

##  Builders
Name | Description
-----|-------------
app-shell | Build an Angular [App shell](https://angular.io/guide/app-shell).
browser | Build an Angular application targeting a browser environment.
dev-server | A development server that provides live reloading.
extract-i18n | Extract i18n messages from an Angular application.
karma | Execute unit tests using [Karma](https://github.com/karma-runner/karma) test runner.
ng-packagr | Build and package an Angular library in [Angular Package Format (APF)](https://docs.google.com/document/d/1CZC2rcpxffTDfRDs6p1cfbmKNLA6x5O-NtkJglDaBVs/preview) format using [ng-packagr](https://github.com/ng-packagr/ng-packagr).
server | Build an Angular application targeting a [Node.js](https://nodejs.org) environment.
protractor | Run end-to-end tests using [Protractor](https://www.protractortest.org/) framework.
tslint | **Deprecated** - Statically analyze [TypeScript](https://www.typescriptlang.org/) files using [TSLint](https://palantir.github.io/tslint/). 

## Disclaimer

While the builders when executed via the Angular CLI and their associated options are considered stable, the programmatic APIs are not considered officially supported and are not subject to the breaking change guarantees of SemVer.