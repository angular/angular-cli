# Upgrading from Angular2-Universal (2.x) to Angular v4 / platform-server

In general, you're going to want to make sure you remove all references of `angular2-universal` from your project. If you're using `isBrowser / isNode`, use instead `isPlatformBrowser()` which you'll find information on [here](#universal-gotchas).

Install platform-server into your application (and its dependency `@angular/animations` (this is due to NoOpAnimationsModule being needed for the Server))

```bash
npm i --S @angular/platform-server @angular/animations
```

As for your individual root files, there actually aren't many changes you'll need to do!

## Server.ts 

When it comes the underlying express-engine, things will remain fairly similar except that now, you're going to be instead doing `import { ngExpressEngine } from '@nguniversal/express-engine';` [More detailed information on the express-engine here](https://github.com/angular/universal/tree/master/modules/express-engine)

Make sure you remove `angular2-universal-polyfills` and any `__workaround.ts` files you may have been using (if you were using Universal with Angular > 2.1+). As for polyfills on the server, you'll instead need the following:

```typescript
import 'zone.js/dist/zone-node';
import 'reflect-metadata';
```

As for your main NgModule's, one major thing you'll notice is that we no longer use `UniversalModule`.

## Browser-app.module.ts
So UniversalModule has now been replaced with `BrowserModule`, and notice we pass in an `appId` that we want to make sure is the same name as the one included on the app.server.ts file.

```typescript
import { BrowserModule } from '@angular/platform-browser';

@NgModule({
	bootstrap: [ AppComponent ],
	imports: [
    BrowserModule.withServerTransition({ 
      appId: 'my-app-id' // <-- 
    }),
    AppModule
	]
})
export class BrowserAppModule {}
```

## Server-app.module.ts
Notice here we import not only a BrowserModule, but a ServerModule as well.

```typescript
import { BrowserModule } from '@angular/platform-browser';
import { ServerModule } from '@angular/platform-server';

@NgModule({
  bootstrap: [AppComponent],
  imports: [
    BrowserModule.withServerTransition({
      appId: 'my-app-id' // <-- same name
    }),
    ServerModule, // <--
    AppModule
  ]
})
export class ServerAppModule { }
```

## Angular 4 / platform-server example

An official starter can be found at [angular/universal-starter](https://github.com/angular/universal-starter)
