# Version 8 Upgrade Guide

## Introduction

Angular Version 8 changes the way how lazy loaded chunks are included as part of the Router. The new syntax uses dynamic import
syntax directly to load lazy loaded chunks.

### Before

```ts
const routes: Routes = [
  { path: 'lazy', loadChildren: './lazy/lazy.module#LazyModule' },
  { path: '', component: HomeComponent },
];
```

### After

```ts
const routes: Routes = [
  { path: 'lazy', loadChildren: () => import('./lazy/lazy.module').then((m) => m.LazyModule) },
  { path: '', component: HomeComponent },
];
```

## Problem upgrading to version 8

`ng update` automatically converts all lazy loaded route configs to the dynamic import syntax. However if the project was
already in Angular Universal mode you would get the following error on the server when you navigate to a lazy loaded route.

```
ERROR { Error: Uncaught (in promise): TypeError: Cannot read property 'call' of undefined
TypeError: Cannot read property 'call' of undefined
    at __webpack_require__ (/home/viks/projects/v8-lazy/dist/server.js:136036:30)
    at Function.requireEnsure [as e] (/home/viks/projects/v8-lazy/dist/server.js:136055:25)
    at ɵ0 (/home/viks/projects/v8-lazy/dist/server.js:136187:38)
    at RouterConfigLoader.loadModuleFactory (/home/viks/projects/v8-lazy/dist/server.js:140497:39)
    at RouterConfigLoader.load (/home/viks/projects/v8-lazy/dist/server.js:140482:35)
    at MergeMapSubscriber.project (/home/viks/projects/v8-lazy/dist/server.js:139485:47)
    at MergeMapSubscriber._tryNext (/home/viks/projects/v8-lazy/dist/server.js:35919:27)
    at MergeMapSubscriber._next (/home/viks/projects/v8-lazy/dist/server.js:35909:18)
    at MergeMapSubscriber.Subscriber.next (/home/viks/projects/v8-lazy/dist/server.js:32468:18)
    at Observable._subscribe (/home/viks/projects/v8-lazy/dist/server.js:34480:24)
    at resolvePromise (/home/viks/projects/v8-lazy/dist/server.js:997:31)
    at resolvePromise (/home/viks/projects/v8-lazy/dist/server.js:954:17)
    at /home/viks/projects/v8-lazy/dist/server.js:1058:17
    at ZoneDelegate.invokeTask (/home/viks/projects/v8-lazy/dist/server.js:568:31)
    at Object.onInvokeTask (/home/viks/projects/v8-lazy/dist/server.js:27403:33)
    at ZoneDelegate.invokeTask (/home/viks/projects/v8-lazy/dist/server.js:567:60)
    at Zone.runTask (/home/viks/projects/v8-lazy/dist/server.js:340:47)
    at drainMicroTaskQueue (/home/viks/projects/v8-lazy/dist/server.js:746:35)
    at ZoneTask.invokeTask (/home/viks/projects/v8-lazy/dist/server.js:647:21)
    at Server.ZoneTask.invoke (/home/viks/projects/v8-lazy/dist/server.js:632:48)
```

## Fix

The following example commit shows the different steps required to fix the issue: [Commit](https://github.com/vikerman/v8-lazy/commit/515239be1b233946e4a1d15a8712a0bc9f5490cc)

The different changes required are:

1. Export `ngExpressEngine` (or `ngHapiEngine`) ([Link](https://github.com/vikerman/v8-lazy/blob/515239be1b233946e4a1d15a8712a0bc9f5490cc/src/main.server.ts#L12)),
   `provideModuleMap` from `src/main.server.ts` ([Link](https://github.com/vikerman/v8-lazy/blob/515239be1b233946e4a1d15a8712a0bc9f5490cc/src/main.server.ts#L15))
1. Change `server.ts` to remove all references to `@angular` and `@nguniversal` and use the rexport from `main` instead and remove `enableProdMode` ([Link](https://github.com/vikerman/v8-lazy/blob/515239be1b233946e4a1d15a8712a0bc9f5490cc/server.ts))
1. Change `webpack.server.config.js` to put `'./dist/server/main'` in `externals` ([Link](https://github.com/vikerman/v8-lazy/blob/515239be1b233946e4a1d15a8712a0bc9f5490cc/webpack.server.config.js#L13)) and don't parse the polyfills ([Link](https://github.com/vikerman/v8-lazy/blob/515239be1b233946e4a1d15a8712a0bc9f5490cc/webpack.server.config.js#L26))
1. (Optional) It is now possible use `bundleDependencies=all` when building the server bundle ([Link](https://github.com/vikerman/v8-lazy/blob/515239be1b233946e4a1d15a8712a0bc9f5490cc/package.json#L14))

**NOTE:** You will not encounter this problem if you did `ng add @nguniversal/express-engine` _after_ upgrading to version 8.
