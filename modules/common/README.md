# Angular Universal Common Module

This is the common Angular Universal module that is common across server-side rendering app
irrespective of the rendering engine.

The package can be installed using:

`npm install @nguniversal/common --save`

## TransferHttpCacheModule

`TransferHttpCacheModule` installs a Http interceptor that avoids duplicate `HttpClient` requests
on the client, for requests that were already made when the application was rendered on the server
side.

When the module is installed in the application `NgModule`, it will intercept `HttpClient` requests
on the server and store the response in the `TransferState` key-value store. This is transferred to the client, which then uses it to respond to the same `HttpClient` requests on the client.

### Usage

To use the `TransferHttpCacheModule` just install it as part of the top-level App module.

That's it!

```ts
import {TransferHttpCacheModule} from ‘@nguniversal/common’;

@NgModule({
  imports: [
    BrowserModule.withServerTransition({appId: ‘my-app’}),
    TransferHttpCacheModule,
  ],
  bootstrap: [MyApp]
})
export class AppBrowserModule() {}
```
