**HMR is a webpack feature that is not officially supported by Angular. Community contributors can submit PRs against this page to add corrections, new information, or advice.**.

# Configure Hot Module Replacement

Hot Module Replacement (HMR) is a [webpack](https://webpack.js.org) feature to update code in a running app without rebuilding it.
This results in faster updates and fewer full page-reloads.

You can read more about HMR by visiting [this page](https://webpack.js.org/guides/hot-module-replacement/).

In order to get HMR working with Angular CLI we first need to add a new environment and enable it.

Next we need to update the bootstrap process of our app to enable the
[@angularclass/hmr](https://github.com/gdi2290/angular-hmr) module.

### Add environment for HMR

Create a file called `src/environments/environment.hmr.ts` with the following contents:

```typescript

export const environment = {
 production: false,
 hmr: true
};
```

Update `src/environments/environment.prod.ts` and add the `hmr: false` flag to the environment:

```typescript
export const environment = {
 production: true,
 hmr: false
};
```

Update `src/environments/environment.ts` and add the `hmr: false` flag to the environment:

```typescript
export const environment = {
 production: false,
 hmr: false
};
```


Update `angular.json` to include an hmr environment as explained [here](./application-environments)
and add configurations within build and serve to enable hmr. Note that `<project-name>` here
represents the name of the project you are adding this configuration to in `angular.json`.

```json
  "build": {
    "configurations": {
      ...
      "hmr": {
        "fileReplacements": [
          {
            "replace": "src/environments/environment.ts",
            "with": "src/environments/environment.hmr.ts"
          }
        ]
      }
    }
  },
  ...
  "serve": {
    "configurations": {
      ...
      "hmr": {
        "hmr": true,
        "browserTarget": "<project-name>:build:hmr"
      }
    }
  }
```

Add the necessary types to  `src/tsconfig.app.json`

```json
{
  ...
  "compilerOptions": {
    ...
    "types": ["node"]
  },
}
```

Run `ng serve` with the flag `--configuration hmr` to enable hmr and select the new environment:

```bash
ng serve --configuration hmr
```

Create a shortcut for this by updating  `package.json` and adding an entry to the script object:

```json
"scripts": {
  ...
  "hmr": "ng serve --configuration hmr"
}
```


### Add dependency for @angularclass/hmr and configure app

In order to get HMR working we need to install the dependency and configure our app to use it.


Install the `@angularclass/hmr` module as a dev-dependency

```bash
$ npm install --save-dev @angularclass/hmr
```


Create a file called `src/hmr.ts` with the following content:

```typescript
import { NgModuleRef, ApplicationRef } from '@angular/core';
import { createNewHosts } from '@angularclass/hmr';

export const hmrBootstrap = (module: any, bootstrap: () => Promise<NgModuleRef<any>>) => {
  let ngModule: NgModuleRef<any>;
  module.hot.accept();
  bootstrap().then(mod => ngModule = mod);
  module.hot.dispose(() => {
    const appRef: ApplicationRef = ngModule.injector.get(ApplicationRef);
    const elements = appRef.components.map(c => c.location.nativeElement);
    const makeVisible = createNewHosts(elements);
    ngModule.destroy();
    makeVisible();
  });
};
```


Update `src/main.ts` to use the file we just created:

```typescript
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import { hmrBootstrap } from './hmr';

if (environment.production) {
  enableProdMode();
}

const bootstrap = () => platformBrowserDynamic().bootstrapModule(AppModule);

if (environment.hmr) {
  if (module[ 'hot' ]) {
    hmrBootstrap(module, bootstrap);
  } else {
    console.error('HMR is not enabled for webpack-dev-server!');
    console.log('Are you using the --hmr flag for ng serve?');
  }
} else {
  bootstrap().catch(err => console.log(err));
}
```


### Starting the development environment with HMR enabled

Now that everything is set up we can run the new configuration:

```bash
$ npm run hmr
```

When starting the server Webpack will tell you that it’s enabled:


    NOTICE Hot Module Replacement (HMR) is enabled for the dev server.


Now if you make changes to one of your components the changes should be visible automatically without a complete browser refresh.
