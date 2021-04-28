# Webpack Builder for Architect

This package allows you to run Webpack and Webpack Dev Server using Architect.

To use it on your Angular CLI app, follow these steps:

- run `npm install @angular-devkit/build-webpack`.
- create a webpack configuration.
- add the following targets inside `angular.json`.

```
  "projects": {
    "app": {
      // ...
      "architect": {
        // ...
        "build-webpack": {
          "builder": "@angular-devkit/build-webpack:webpack",
          "options": {
            "webpackConfig": "webpack.config.js"
          }
        },
        "serve-webpack": {
          "builder": "@angular-devkit/build-webpack:webpack-dev-server",
          "options": {
            "webpackConfig": "webpack.config.js"
          }
        }
      }
```

- run `ng run app:build-webpack` to build, and `ng run app:serve-webpack` to serve.

All options, including `watch` and `stats`, are looked up inside the webpack configuration.
