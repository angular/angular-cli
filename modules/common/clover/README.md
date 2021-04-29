# Angular SSR project Clover

- What if Angular SSR didn't require the complex `@nguniversal` and `@angular/platform-server` packages for onboarding?
- What if we `Window is undefined` error was a thing of the past?
- What if you don't need multiple builds for an SSR/prerender application?
- What if an application shell can be generated without an extra build?

All of the above can be achieved by emulating the DOM on the server layer. In this implementation, [jsdom](https://github.com/jsdom/jsdom) is used.

## Supported features

- [x] Inline critical CSS
- [x] State transfer
- [x] Re-use component styles generated on the server
- [x] i18n
- [x] Hybrid rendering
- [x] Server side rendering

# Planned features

- [ ] App-shell
- [ ] Pre-rendering
- [ ] Schematics

## Try it out

### Install the dependencies

```
npm install @nguniversal/common express --save
```

### Include the module in the application

#### app/app.module.ts

```diff
  import { NgModule } from '@angular/core';
  import { BrowserModule } from '@angular/platform-browser';

  import { AppRoutingModule } from './app-routing.module';
  import { AppComponent } from './app.component';
  import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
+ import { RendererModule, TransferHttpCacheModule } from '@nguniversal/common/clover';

  @NgModule({
    declarations: [
      AppComponent
    ],
    imports: [
-     BrowserModule,
+     BrowserModule.withServerTransition({
+      appId: 'myapp',
+     }),
+     RendererModule.forRoot(),
+     TransferHttpCacheModule,
      AppRoutingModule,
      BrowserAnimationsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

#### server.js

```ts
const express = require('express');
const { Engine } = require('@nguniversal/common/clover/server');
const { join } = require('path');
const { format } = require('url');

const PORT = 8080;
const DIST = join(__dirname, 'dist');

const app = express();
app.set('views', DIST);

app.get(
  '*.*',
  express.static(DIST, {
    maxAge: '1y',
    fallthrough: false,
  }),
);

// Redirect to default locale
// app.get(/^(\/|\/favicon\.ico)$/, (req, res) => {
//   res.redirect(301, `/en-US${req.originalUrl}`);
// });

const ssr = new Engine();
app.get('*', (req, res, next) => {
  ssr
    .render({
      publicPath: DIST,
      url: format({
        protocol: req.protocol,
        host: `localhost:${PORT}`,
        pathname: req.path,
        query: req.query,
      }),
      headers: req.headers,
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

app.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});
```

### Running the application

```
ng build
node server.js
```
