# Module Map NgFactory Loader

This is a NgFactory Loader which uses a map of modules instead of resolving modules lazily.

This is useful when executing in node because lazy loading serves no purpose

## Usage with `@angular/cli`

`npm install @nguniversal/module-map-ngfactory-loader --save`

`@angular/cli` will generate `LAZY_MODULE_MAP` in its main output bundle if you put app.platform = 'server'.

```ts
const { provideModuleMap } = require('@nguniversal/module-map-ngfactory-loader');
const { AppModuleNgFactory, LAZY_MODULE_MAP } = require('main.bundle.js');

renderModuleFactory(AppModuleNgFactory, {
  document: '<app-root></app-root>',
  url: '/',
  extraProviders: [
    provideModuleMap(LAZY_MODULE_MAP)
  ]
})
```

Add `ModuleMapLoaderModule` to your server module

```ts
import {ModuleMapLoaderModule} from '@nguniversal/module-map-ngfactory-loader';

@NgModule({
  imports: [
    AppModule,
    ServerModule,
    ModuleMapLoaderModule
  ],
  bootstrap: [AppComponent],
})
export class AppServerModule {}
```