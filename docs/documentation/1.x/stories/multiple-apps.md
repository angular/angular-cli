# Multiple Apps integration

Angular CLI supports multiple applications within one project.
You use the `apps` array in `.angular-cli.json` to list files and folders you want to use for different apps.

By default one app is created when then new project is created and `apps` array looks like:
```
"apps": [
  {
    "root": "src",
    ...
    "main": "main.ts",
    "polyfills": "polyfills.ts",
    "test": "test.ts",
    "tsconfig": "tsconfig.app.json",
    "testTsconfig": "tsconfig.spec.json",
    "prefix": "app",
    ...
  }
],
```

To create another app you can copy the app object and then change the values for the options you want to change. eg. If I want to create another app with different `main`, `polyfills`, `test` and `prefix` and keep other configurations such as `assets`, `styles`, `environment` etc. same. I can add it to apps array as below.
```
"apps": [
  {
    "root": "src",
    ...
    "main": "main.ts",
    "polyfills": "polyfills.ts",
    "test": "test.ts",
    "tsconfig": "tsconfig.app.json",
    "testTsconfig": "tsconfig.spec.json",
    "prefix": "app",
    ...
  },
  {
    "root": "src",
    ...
    "main": "main2.ts",
    "polyfills": "polyfills2.ts",
    "test": "test2.ts",
    "tsconfig": "tsconfig.app.json",
    "testTsconfig": "tsconfig.spec.json",
    "prefix": "app2",
    ...
  }  
],
```
Now we can `serve`, `build` etc. both the apps by passing the app index with the commands. By default, it will pick the first app only.

To serve the first app: `ng serve --app=0` or `ng serve --app 0`

To serve the second app: `ng serve --app=1` or `ng serve --app 1`

You can also add the `name` property to the app object in `apps` array and then pass it to commands to distinguish between different applications.
```
"apps": [
  {
    "name": "app1",
    "root": "src",
    "outDir": "dist",
....
```
To serve application by name `ng serve --app=app1` or `ng serve --app app1`.

