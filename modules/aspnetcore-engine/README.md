# Angular & ASP.NET Core Engine

This is an ASP.NET Core Engine for running Angular Apps on the server for server side rendering.

---

## Installation

```bash
npm i --S @nguniversal/aspnetcore-engine
# or yarn install
```

## Example Application utilizing this Engine

#### [Asp.net Core & Angular advanced starter application](https://github.com/MarkPieszak/aspnetcore-angular2-universal)

# Usage

> Things have changed since the previous ASP.NET Core & Angular Universal useage. We're no longer using TagHelpers, but now invoking the **main.server** file from the **Home Controller** *itself*, and passing all the data down to .NET.

Within our main.server file, things haven't changed much, you still have your `createServerRenderer()` function that's being exported (this is what's called within the Node process) which is expecting a `Promise` to be returned.

Within that promise we simply call the ngAspnetCoreEngine itself, passing in our providers Array (here we give it the current `url` from the Server, and also our Root application, which in our case is just `<app></app>`).


```ts
// Polyfills
import 'es6-promise';
import 'es6-shim';
import 'reflect-metadata';
import 'zone.js';

import { enableProdMode } from '@angular/core';
import { INITIAL_CONFIG } from '@angular/platform-server';
import { createServerRenderer, RenderResult } from 'aspnet-prerendering';
// Grab the (Node) server-specific NgModule
import { AppServerModule } from './app/app.server.module';
// ***** The ASPNETCore Angular Engine *****
import { ngAspnetCoreEngine } from '@nguniversal/aspnetcore-engine';

enableProdMode(); // for faster server rendered builds

export default createServerRenderer(params => {

    /*
     * How can we access data we passed from .NET ?
     * you'd access it directly from `params.data` under the name you passed it
     * ie: params.data.WHATEVER_YOU_PASSED
     * -------
     * We'll show in the next section WHERE you pass this Data in on the .NET side
     */

    // Platform-server provider configuration
    const setupOptions: IEngineOptions = {
      appSelector: '<app></app>',
      ngModule: ServerAppModule,
      request: params,
      providers: [
        /* Other providers you want to pass into the App would go here
        *    { provide: CookieService, useClass: ServerCookieService }

        * ie: Just an example of Dependency injecting a Class for providing Cookies (that you passed down from the server)
          (Where on the browser you'd have a different class handling cookies normally)
        */
      ]
    };

    // ***** Pass in those Providers & your Server NgModule, and that's it!
    return ngAspnetCoreEngine(setupOptions).then(response => {

      // Want to transfer data from Server -> Client?

      // Add transferData to the response.globals Object, and call createTransferScript({}) passing in the Object key/values of data
      // createTransferScript() will JSON Stringify it and return it as a <script> window.TRANSFER_CACHE={}</script>
      // That your browser can pluck and grab the data from
      response.globals.transferData = createTransferScript({
        someData: 'Transfer this to the client on the window.TRANSFER_CACHE {} object',
        fromDotnet: params.data.thisCameFromDotNET // example of data coming from dotnet, in HomeController
      });

      return ({
        html: response.html,
        globals: response.globals
      });

    });
});

```

## Configuring the URL and Document

It is possible to override the default URL and document fetched when the rendering engine
is called. To do so, simply pass in a `url` and/or `document` string to the renderer as follows:

```ts
// Platform-server provider configuration
let url = 'http://someurl.com';
let doc = '<html><head><title>New doc</title></head></html>';
const setupOptions: IEngineOptions = {
  appSelector: '<app></app>',
  ngModule: ServerAppModule,
  request: params,
  providers: [
    /* Other providers you want to pass into the App would go here
    *    { provide: CookieService, useClass: ServerCookieService }

    * ie: Just an example of Dependency injecting a Class for providing Cookies (that you passed down from the server)
      (Where on the browser you'd have a different class handling cookies normally)
    */
  ],
  url,
  document: doc
};
```

# What about on the .NET side?

Previously, this was all done with TagHelpers and you passed in your main.server file to it: `<app asp-prerender-module="dist/main.server.js"></app>`, but this hindered us from getting the SEO benefits of prerendering.

Because .NET has control over the Html, using the ngAspnetCoreEngine, we're able to *pull out the important pieces*, and give them back to .NET to place them through out the View.

Below is how you can invoke the main.server file which gets everything started:

> Hopefully in the future this will be cleaned up and less code as well.

### HomeController.cs

```csharp
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

using Microsoft.AspNetCore.SpaServices.Prerendering;
using Microsoft.AspNetCore.NodeServices;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Features;

namespace WebApplicationBasic.Controllers
{
    public class HomeController : Controller
    {
        public async Task<IActionResult> Index()
        {
            var nodeServices = Request.HttpContext.RequestServices.GetRequiredService<INodeServices>();
            var hostEnv = Request.HttpContext.RequestServices.GetRequiredService<IHostingEnvironment>();

            var applicationBasePath = hostEnv.ContentRootPath;
            var requestFeature = Request.HttpContext.Features.Get<IHttpRequestFeature>();
            var unencodedPathAndQuery = requestFeature.RawTarget;
            var unencodedAbsoluteUrl = $"{Request.Scheme}://{Request.Host}{unencodedPathAndQuery}";

            // *********************************
            // This parameter is where you'd pass in an Object of data you want passed down to Angular 
            // to be used in the Server-rendering

            // ** TransferData concept **
            // Here we can pass any Custom Data we want !

            // By default we're passing down the REQUEST Object (Cookies, Headers, Host) from the Request object here
            TransferData transferData = new TransferData();
            transferData.request = AbstractHttpContextRequestInfo(Request); // You can automatically grab things from the REQUEST object in Angular because of this
            transferData.thisCameFromDotNET = "Hi Angular it's asp.net :)";
            // Add more customData here, add it to the TransferData class

            // Prerender / Serialize application (with Universal)
            var prerenderResult = await Prerenderer.RenderToString(
                "/", // baseURL
                nodeServices,
                new JavaScriptModuleExport(applicationBasePath + "/ClientApp/dist/main-server"),
                unencodedAbsoluteUrl,
                unencodedPathAndQuery,
                // Our Transfer data here will be passed down to Angular (within the main.server file)
                // Available there via `params.data.yourData`
                transferData, 
                30000, // timeout duration
                Request.PathBase.ToString()
            );

            // This is where everything is now spliced out, and given to .NET in pieces
            ViewData["SpaHtml"] = prerenderResult.Html;
            ViewData["Title"] = prerenderResult.Globals["title"];
            ViewData["Styles"] = prerenderResult.Globals["styles"];
            ViewData["Meta"] = prerenderResult.Globals["meta"];
            ViewData["Links"] = prerenderResult.Globals["links"];
            ViewData["TransferData"] = prerenderResult.Globals["transferData"]; // our transfer data set to window.TRANSFER_CACHE = {};

            // Let's render that Home/Index view
            return View();
        }

        private IRequest AbstractHttpContextRequestInfo(HttpRequest request)
        {

            IRequest requestSimplified = new IRequest();
            requestSimplified.cookies = request.Cookies;
            requestSimplified.headers = request.Headers;
            requestSimplified.host = request.Host;

            return requestSimplified;
        }
        
    }

    public class IRequest
    {
        public object cookies { get; set; }
        public object headers { get; set; }
        public object host { get; set; }
    }

    public class TransferData
    {
        // By default we're expecting the REQUEST Object (in the aspnet engine), so leave this one here
        public dynamic request { get; set; } 

        // Your data here ?
        public object thisCameFromDotNET { get; set; }
    }
}
```

### Startup.cs : Make sure you add NodeServices to ConfigureServices:

```csharp
public void ConfigureServices(IServiceCollection services)
{
    // ... other things ...

    services.AddNodeServices(); // <--
}
```

# What updates do our Views need now?

Now we have a whole assortment of SEO goodness we can spread around our .NET application. Not only do we have our serialized Application in a String...

We also have `<title>`, `<meta>`, `<link>'s`, and our applications `<styles>`

In our _layout.cshtml, we're going to want to pass in our different `ViewData` pieces and place these where they needed to be.

> Notice `ViewData[]` sprinkled through out. These came from our Angular application, but it returned an entire HTML document, we want to build up our document ourselves so .NET handles it!

```html
<!DOCTYPE html>
<html>
    <head>
        <base href="/" />
        <!-- Title will be the one you set in your Angular application -->
        <title>@ViewData["Title"]</title>

        @Html.Raw(ViewData["Meta"]) <!-- <meta /> tags -->
        @Html.Raw(ViewData["Links"]) <!-- <link /> tags -->
        @Html.Raw(ViewData["Styles"]) <!-- <styles /> tags -->

    </head>
    <body>
        <!-- Our Home view will be rendered here -->
        @RenderBody() 

        <!-- Here we're passing down any data to be used by grabbed and parsed by Angular -->
        @Html.Raw(ViewData["TransferData"])

        @RenderSection("scripts", required: false)
    </body>
</html>
```

---

# Your Home View - where the App gets displayed:

You may have seen or used a TagHelper here in the past (that's where it used to invoke the Node process and everything), but now since we're doing everything 
in the **Controller**, we only need to grab our `ViewData["SpaHtml"]` and inject it!

This `SpaHtml` was set in our HomeController, and it's just a serialized string of your Angular application, but **only** the `<app>/* inside is all serialized */</app>` part, not the entire Html, since we split that up, and let .NET build out our Document.

```html
@Html.Raw(ViewData["SpaHtml"]) <!-- magic -->

<!-- here you probably have your webpack vendor & main files as well -->
<script src="~/dist/vendor.js" asp-append-version="true"></script>
@section scripts {
    <script src="~/dist/main-client.js" asp-append-version="true"></script>
}
```

---

# What happens after the App gets server rendered?

Well now, your Client-side Angular will take over, and you'll have a fully functioning SPA. (With all these great SEO benefits of being server-rendered) !

:sparkles:

--- 

## Bootstrap

The engine also calls the ngOnBootstrap lifecycle hook of the module being bootstrapped, this is how the TransferData gets taken.
Check [https://github.com/MarkPieszak/aspnetcore-angular2-universal/tree/master/Client/modules](https://github.com/MarkPieszak/aspnetcore-angular2-universal/tree/master/Client/modules) to see how to setup your Transfer classes.

```ts
@NgModule({
  bootstrap: [AppComponent]
})
export class ServerAppModule {
  // Make sure to define this an arrow function to keep the lexical scope
  ngOnBootstrap = () => {
      console.log('bootstrapped');
    }
}
```

# Tokens

Along with the engine doing serializing and separating out the chunks of your Application (so we can let .NET handle it), you may have noticed we passed in the HttpRequest object from .NET into it as well.

This was done so that we could take a few things from it, and using dependency injection, "provide" a few things to the Angular application.

```typescript
ORIGIN_URL
// and
REQUEST

// imported 
import { ORIGIN_URL, REQUEST } from '@nguniversal/aspnetcore-engine';
```

Make sure in your BrowserModule you provide these tokens as well, if you're going to use them!

```typescript
@NgModule({
    ...,
    providers: [
        {
            // We need this for our Http calls since they'll be using an ORIGIN_URL provided in main.server
            // (Also remember the Server requires Absolute URLs)
            provide: ORIGIN_URL,
            useFactory: (getOriginUrl)
        }, {
            // The server provides these in main.server
            provide: REQUEST,
            useFactory: (getRequest)
        }
    ]
} export class BrowserAppModule() {}
```

Don't forget that the server needs Absolute URLs for paths when doing Http requests! So if your server api is at the same location as this Angular app, you can't just do `http.get('/api/whatever')` so use the ORIGIN_URL Injection Token.

```typescript
  import { ORIGIN_URL } from '@nguniversal/aspnetcore-engine';

  constructor(@Inject(ORIGIN_URL) private originUrl: string, private http: Http) {
    this.http.get(`${this.originUrl}/api/whatever`)
  }
```

As for the REQUEST object, you'll find Cookies, Headers, and Host (from .NET that we passed down in our HomeController. They'll all be accessible from that Injection Token as well.

```typescript
  import { REQUEST } from '@nguniversal/aspnetcore-engine/tokens';

  constructor(@Inject(REQUEST) private request) {
    // this.request.cookies
    // this.request.headers
    // etc
  }

```



