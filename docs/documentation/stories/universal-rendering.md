# Universal bundles

Angular CLI supports generation of a Universal build for your application. This is a CommonJS-formatted bundle which can be `require()`'d into a Node application (for example, an Express server) and used with `@angular/platform-server`'s APIs to prerender your application.

This story will show you how to set up Universal bundling for an existing `@angular/cli` project in 4 steps.

## Step 0: Install `@angular/platform-server`

Install `@angular/platform-server` into your project. Make sure you use the same version as the other `@angular` packages in your project.

```bash
$ npm install --save-dev @angular/platform-server
```
or
```bash
$ yarn add @angular/platform-server --dev
```


## Step 1: Prepare your app for Universal rendering

The first thing you need to do is make your `AppModule` compatible with Universal by addding `.withServerTransition()` and an application ID to your `BrowserModule` import:


### src/app/app.module.ts:

```javascript
@NgModule({
  bootstrap: [AppComponent],
  imports: [
    // Add .withServerTransition() to support Universal rendering.
    // The application ID can be any identifier which is unique on
    // the page.
    BrowserModule.withServerTransition({appId: 'my-app'}),
    ...
  ],

})
export class AppModule {}
```

Next, create a module specifically for your application when running on the server. It's recommended to call this module `AppServerModule`.

This example places it alongside `app.module.ts` in a file named `app.server.module.ts`:


### src/app/app.server.module.ts:

```javascript
import {NgModule} from '@angular/core';
import {ServerModule} from '@angular/platform-server';

import {AppModule} from './app.module';
import {AppComponent} from './app.component';

@NgModule({
  imports: [
    // The AppServerModule should import your AppModule followed
    // by the ServerModule from @angular/platform-server.
    AppModule,
    ServerModule,
  ],
  // Since the bootstrapped component is not inherited from your
  // imported AppModule, it needs to be repeated here.
  bootstrap: [AppComponent],
})
export class AppServerModule {}
```

## Step 2: Create a server main file and tsconfig to build it

Create a main file for your Universal bundle. This file only needs to export your `AppServerModule`. It can go in `src`. This example calls this file `main.server.ts`:

### src/main.server.ts:

```javascript
export {AppServerModule} from './app/app.server.module';
```

Copy `tsconfig.app.json` to `tsconfig.server.json` and change it to build with a `"module"` target of `"commonjs"`.

Add a section for `"angularCompilerOptions"` and set `"entryModule"` to your `AppServerModule`, specified as a path to the import with a hash (`#`) containing the symbol name. In this example, this would be `app/app.server.module#AppServerModule`.

### src/tsconfig.server.json:

```javascript
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "../out-tsc/app",
    "baseUrl": "./",
    // Set the module format to "commonjs":
    "module": "commonjs",
    "types": []
  },
  "exclude": [
    "test.ts",
    "**/*.spec.ts"
  ],
  // Add "angularCompilerOptions" with the AppServerModule you wrote
  // set as the "entryModule".
  "angularCompilerOptions": {
    "entryModule": "app/app.server.module#AppServerModule"
  }
}
```

## Step 3: Create a new project in `.angular-cli.json`

In `.angular-cli.json` there is an array under the key `"apps"`. Copy the configuration for your client application there, and paste it as a new entry in the array, with an additional key `"platform"` set to `"server"`.

Then, remove the `"polyfills"` key - those aren't needed on the server, and adjust `"main"`, and `"tsconfig"` to point to the files you wrote in step 2. Finally, adjust `"outDir"` to a new location (this example uses `dist-server`).

### .angular-cli.json:

```javascript
{
  ...
  "apps": [
    {
      // Keep your original application config intact here.
      // It will be app 0.
    },
    {
      // This is your server app. It is app 1.
      "platform": "server",
      "root": "src",
      // Build to dist-server instead of dist. This prevents
      // client and server builds from overwriting each other.
      "outDir": "dist-server",
      "assets": [
        "assets",
        "favicon.ico"
      ],
      "index": "index.html",
      // Change the main file to point to your server main.
      "main": "main.server.ts",
      // Remove polyfills.
      // "polyfills": "polyfills.ts",
      "test": "test.ts",
      // Change the tsconfig to point to your server config.
      "tsconfig": "tsconfig.server.json",
      "testTsconfig": "tsconfig.spec.json",
      "prefix": "app",
      "styles": [
        "styles.css"
      ],
      "scripts": [],
      "environmentSource": "environments/environment.ts",
      "environments": {
        "dev": "environments/environment.ts",
        "prod": "environments/environment.prod.ts"
      }
    }
  ],
  ...
}

```

## Building the bundle

With these steps complete, you should be able to build a server bundle for your application, using the `--app` flag to tell the CLI to build the server bundle, referencing its index of `1` in the `"apps"` array in `.angular-cli.json`:

```bash
# This builds the client application in dist/
$ ng build --prod
...
# This builds the server bundle in dist-server/
$ ng build --prod --app 1
Date: 2017-07-24T22:42:09.739Z
Hash: 9cac7d8e9434007fd8da
Time: 4933ms
chunk {0} main.988d7a161bd984b7eb54.bundle.js (main) 9.49 kB [entry] [rendered]
chunk {1} styles.d41d8cd98f00b204e980.bundle.css (styles) 0 bytes [entry] [rendered]
```

## Testing the bundle

With this bundle built, you can use `renderModuleFactory` from `@angular/platform-server` to test it out.

```javascript
// Load zone.js for the server.
require('zone.js/dist/zone-node');

// Import renderModuleFactory from @angular/platform-server.
var renderModuleFactory = require('@angular/platform-server').renderModuleFactory;

// Import the AOT compiled factory for your AppServerModule.
// This import will change with the hash of your built server bundle.
var AppServerModuleNgFactory = require('./dist-server/main.988d7a161bd984b7eb54.bundle').AppServerModuleNgFactory;

// Load the index.html file.
var index = require('fs').readFileSync('./src/index.html', 'utf8');

// Render to HTML and log it to the console.
renderModuleFactory(AppServerModuleNgFactory, {document: index, url: '/'}).then(html => console.log(html));
```

## Caveats

* Lazy loading is not yet supported, but coming very soon. Currently lazy loaded routes aren't available for prerendering, and you will get a `System is not defined` error.
* The bundle produced has a hash in the filename from webpack. When deploying this to a production server, you will need to ensure the correct bundle is required, either by renaming the file or passing the bundle name as an argument to your server.