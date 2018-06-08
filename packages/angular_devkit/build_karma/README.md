# Karma Builder for Architect

This package allows you to run Karma using Architect.

To use it on your Angular CLI app, follow these steps:

- run `npm install @angular-devkit/build-karma`.
- create a karma configuration.
- add the following targets inside `angular.json`.
```
  "projects": {
    "app": {
      // ...
      "architect": {
        // ...
        "test-karma": {
          "builder": "@angular-devkit/build-karma:karma",
          "options": {
            "karmaConfig": "karma.conf.js"
          }
        }
      }
```
- run `ng run app:test-karma` to test.

This builder also has the `singleRun` option, that overrides the corresponding Karma option.