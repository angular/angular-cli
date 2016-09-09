# Angular2 Universal Documentation

> Note this documentation is a living document (work in progress).

  - [How does Universal work?](#howdoesitwork)
    - [What is Preboot?](#preboot)
    - [The benefits of Universal](#universalbenefits)
  - [Setting up Universal](#setup)
    - [with NodeJS & Express](#express)
    - with NodeJS & Hapi (coming soon)
    - with ASP.NET-Core (coming soon)
  - [** Migration Guide **  (for Universal apps using Angular RC4 < or lower)](#coc)


---
---
---


# <a name="howdoesitwork"></a> How does Universal work?

**The elevator pitch:**

- Serialize your Angular2 application on the server-side to a String and pass it onto the browser.

The entire process is basically:

    [SERVER runs] 

      -> Universal gets passed an NgModule Root application 
      -> Universal is aware of Http calls / etc, let's the application fully "bootstrap" itself
      -> ... magic happens *shazam* ...
      -> We "Serialize" the application to an html String and pass it with the server response
           to the browser
        
    [BROWSER loads]

    ▼   -> Instantly gets the String as Html, and you get an Instantaneous PAINT of your Application
         (no need for seconds wasted with a ...Loading spinner...)
    G
    A   -> ... behind the scenes Angular is "really" bootstrapping itself (but to the Browser)
    P        (this is a Single Page Application after all)
        
    ▲   -> Angular finishes bootstrapping
           [ The user didn't notice a thing, but look how faster everything seemed]

Notice the GAP on the left side of the Browser section above. There's a period of time between that immediate Paint 
of our application to the browser and when it *truly* **bootstraps** itself. After all, Universal is in action when we either 
Refresh the browser, or that initial paint. (Or if you have JS disabled, and each link essentially causes a server-side hit to 
render that section).

**So during GAP events, what if the user starts typing in a textbox? Or clicks a link?**

Preboot to the rescue!

# <a name="preboot"></a> What is Preboot?

This is where Preboot comes in, it's an integral part of Universal in that it tracks & records all of the users events, 
and then *replays* them, once the Angular client has finished bootstrapping itself onto the browser.

** TODO: More info / links etc **

# <a name="universalbenefits"></a> What are the benefits of Universal?

** TODO: Benefits of universal **


---
---
---

# <a name="setup"></a> Setting up Universal

------

## <a name="express"></a> NodeJS & Express integration

With Universal it's important to understand that we need to separate our platform logic based on the Browser & Server. So what do we need to make this happen?

A typical non-Universal Angular application will have 2 main files (`app.module.ts` & `main.ts`). 

### `app.module.ts`

This creates your **Root** `NgModule`

### `main.ts` 
"bootstraps" your module to the Browser Platform, via `platformBrowserDynamic().bootstrapModule(YourNgModuleHere)`. 

> Let's clean-up the naming for the above files so it makes a little more sense for us!

Since these files both deal with the Browser, let's rename them:

    app.module.ts   =>  main.browser.ts
          main.ts   =>  client.ts

----

#### With Universal we're going to have 4 main files:

### `main.browser.ts`

> Previously "app.module.ts" - renamed.

This is where our Root "NgModule" (for the Browser) is located.

### `client.ts` 

> Previously "main.ts" - renamed.

This is where we "bootstrap" to the BrowserPlatform via:

    platformBrowserDynamic().bootstrapModule( RootModule );

### `main.node.ts`     

Here we're going to create a similar `NgModule` just as we do for the Browser, **but** we import a few different things. 
After all, we need to pass our **Universal configuration**, and Universal also needs to be aware of Nodes `http`, etc. 
These will get passed in as Modules themselves, we'll get to that shortly.

### `server.ts`        

This is similar to `client.ts`, except here we use the Node platform to "serialize" (as opposed to bootstrapping). 
We'll do this with Universals "**platformNodeDynamic()**" (similarity to *platformBrowserDynamic()*) 
and the **serializeModule()** method, which also accepts - your `NgModule` specific to the server

    platformNodeDynamic().serializeModule( RootModule );



To summarize what we just did, notice we renamed the normal files from above, so that we can easily spot the difference 
between them and the *similar* **server** files. Notice how each "main" file essentially deals with your Root "Module" (NgModule), 
and that both the `client.ts` & `server.ts` essentially "bootstrap || serializeModule" your application. 

> Extra credit: Both bootstrapModule & serializeModule return a Promise so you know when they're finished. 
> serializeModule also returns the serialized html string with it.

#### Let's dive into more detail about each of these files!

Our files so far:

  - [main.browser.ts](#mainbrowser-ts)
  - [client.ts](#client-ts)
  - [main.node.ts](#mainnode-ts)
  - [server.ts](#server-ts)
    
> Note: Of course you can merge main.browser & client if you'd like, as well as the server files. We're separating them to stick 
> to Angular's general separation of concerns.



---

### Example Application : Let's see what makes these files "Universal" 

### <a name="mainbrowser-ts"></a> `main.browser.ts`

> Notice this is how you'd normally create this file. **There isn't anything "Universal" here**.

One thing we need to notice here is all of these imported "modules" we're adding. Keep these in mind, 
because as even the first one suggests (**BrowserModule**), these are dependency injected modules that 
the "Browser" needs. Later, we're going to be doing a very similar thing for the server, except 
we'll be injected **different** modules for some of these things.

    BrowserModule, HttpModule, JsonpModule
    // ^ These are all modules related to the Browser

So here is an example browser NgModule file:

```
  // This is just an example

  // Angular Core Modules
  import { NgModule } from '@angular/core';
  import {
    UniversalModule,
    platformUniversalDynamic
  } from 'angular2-universal';
  import { FormsModule } from '@angular/forms';

  // Our Root Component
  import { AppComponent }             from './app';
  // Our Root routing & routingProviders
  import { routing, appRoutingProviders } from './app';

  // Browser Container (aka Module)
  @NgModule({
    bootstrap    : [ AppComponent ],
    declarations : [ AppComponent, /* etc etc */],
    imports : [

      // Standard imports

      UniversalModule,

      // Our routing import 
      routing

      /* etc etc */

    ],
    providers: [
      appRoutingProviders,
      /* etc etc */
    ]
  })
  export class MainModule { }

  export function main() {
    // Create our browser "platform"
    // & Bootstrap our NgModule/Container to it
    return platformUniversalDynamic().bootstrapModule(MainModule);
  }
```

To summarize: We created an NgModule, passed in our Browser related dependencies, and exported a `main()` function that returns a Promise from 
`platformUniversalDynamic().bootstrapModule(MainModule);`. Piece of cake right.

---

### <a name="client-ts"></a> `client.ts`

Notice the **import 'angular2-universal-polyfills/browser';** we're importing here. This is the only "Universal" 
thing we need on the browser-end. It's just a lot of imports Universal requires to do its job.

```
  // Important - We need to polyfill the browser with a few things Universal needs
  import 'angular2-universal-polyfills/browser';

  // Business as usual now...
  // ...

  import { enableProdMode } from '@angular/core';
  enableProdMode();

  import { main as ngApp }  from './main.browser';

  // ngApp is just the bootstrapModule function from main.browser.ts which 
  // returns a Promise when it's finished

  ngApp().then(() => {
    console.log('Our app is bootstrapped in the browser! Boo ya');
  });

```
Notice here we're also not doing anything special, we're just firing off that `main` function 
from main.browser.ts which bootstraps the applications root NgModule. 
(Like we were saying, you could just combine these 2 files if you really wanted. 
We're separating them to follow typical Angular separation of concerns here)

---

#### Now for our Server-side Node files:

### <a name="mainnode-ts"></a> `main.node.ts`

*TODO: Showcase express-engine method.*

Notice this looks very similar to the `main.browser.ts` we're used to.
We're just creating an NgModule and in this case "serializing" it (not boostrapping it)

In this example we're going to manually pass our "document" or index.html as a String from `server.ts` (shown below).


Notice these DIFFERENT modules we're importing now, we talked about this earlier. Instead of: 

    BrowserModule,  HttpModule,      JsonpModule
    // We now import from angular2-universal:
    UniversalModule
    
UniversalModule is passed a configuration inside of `UniversalModule.withConfig({ /* here */ })` 

UniversalModule in Node includes `NodeModule`, `NodeHttpModule`, `NodeJsonpModule`
UniversalModule in the Browser includes `BrowserModule`, `HttpModule`, `JsonpModule`

> NodeHttpModule & NodeJsonpModule patch Nodes (you guessed it) Http & Jsonp so that we are aware of 
> what's happening there on the Universal-side.

#### So let's take a look at the complete file:

```
  // Angular Core Modules
  import { NgModule } from '@angular/core';

  // *** Universal imports ***
  import {
    UniversalModule,         // Our Universal Configuration : NodeModule.withConfig({ /*here*/ })
    platformUniversalDynamic // Node "platform" for serializing (think "platformBrowserDynamic")
  } from 'angular2-universal';

  // Our Root Component
  import { AppComponent } from './app';

  // We want to export the entire main function to be called from Node
  export function main(document, config?: any) {

    // Universal Container (aka Module)
    @NgModule({
      // These are identical to the Browser NgModule (in main.browser.ts)
      bootstrap    : [ AppComponent ],
      declarations : [ AppComponent, /* etc etc */ ],

      // As opposed to the normal "BrowserModule, HttpModule, JsonpModule" imports
      // in our Browser NgModule (found in main.browser.ts)
      // Here we need to import Node specific modules for Universal
      imports: [

        /* Normal modules etc that you have from main.browser.ts */

        // UniversalModule from "angular2-universal" allows us to provide
        // a config object

        UniversalModule.withConfig({

          // Our "document" which we need to pass in from Node 
          // (first param of this main function)
          // server.ts is passing a string that's basically our index.html
          document: document,
          
          originUrl: 'http://localhost:3000',
          baseUrl: '/',
          requestUrl: '/',

          // Preboot [Transfer state between Server & Client]
          // More info can be found at: https://github.com/angular/preboot#options
          preboot: {
            appRoot : [ 'app' ], // selector(s) for app(s) on the page
            uglify  : true       // uglify preboot code
          }

        }),

        // Other important Modules for Universal 
        /* etc etc */

      ],

      providers: [
        /* whatever providers you normally would of provided */
      ]
    })
    class MainModule { }

    // -----------------------
    // On the browser:
    // platformUniversalDynamic().bootstrapModule(MainModule);
    // But in Node, we don't "bootstrap" our application, we want to Serialize it!

    return platformUniversalDynamic().serializeModule(MainModule);
    // serializeModule returns a promise 
    // (just like bootstrapModule on the browser does)
    
  };
```

**Important:** 

Within our NgModule's `imports : []` here, we pass in our Universals 
**Configuration** within 

```
imports : [
  ... other stuff ...
  UniversalModule.withConfig({ 
    /* Universal options/configuration here */
  }),

]
```

------

### <a name="server-ts"></a> `server.ts`

> Notice we have those polyfills again here, but this time for Node

This is a very basic example/implementation of an express server file for Node. 
In this case we're creating the "document" or index.html here, which we in turn pass to the function above 
that ends up adding it to `document : document` within our `UniversalModule.withConfig({ document : document })` Universal config 
imports.

*TODO: Add exppress-engine implementation details*

```
  // Universal polyfills required
  import 'angular2-universal-polyfills/node';

  // -----------
  // ** USUAL Express stuff** 

  // Express & Node imports
  import * as path from 'path';
  import * as express from 'express';

  // Angular 2
  import { enableProdMode } from '@angular/core';
  // enable prod for faster renders
  enableProdMode();

  const app = express();
  const ROOT = path.join(path.resolve(__dirname, '..'));

  // Serve static files
  app.use(express.static(ROOT, { index: false }));

  // ** END of Usual Express code

  // -----------

  // "main" contains the NgModule container/module for Universal
  // returns a serialized document string
  // We're simply renaming it here, name it whatever you'd like of course
  import { main as ngApp } from './main.node';

  // Routes with html5pushstate
  app.get('/', function (req, res, next) {

    // We're providing our initial documents html here
    // This can be done many ways (such as using express-engine to hijack .html files), this is just for an example
    var documentHtml = `<!doctype>
      <html lang="en">
      <head>
        <title>Angular 2 Universal Starter</title>
        <meta charset="UTF-8">
        <meta name="description" content="Angular 2 Universal">
        <meta name="keywords" content="Angular 2,Universal">
        <meta name="author" content="PatrickJS">

        <link rel="icon" href="data:;base64,iVBORw0KGgo=">

        <base href="/">
      <body>

        <!-- notice our main root app component here -->
        <app>
          Loading...
        </app>

        <!-- webpack browser bundle here - whatever you have it as -->
        <script src="dist/public/browser-bundle.js"></script>
      </body>
      </html>
    `;

    return ngApp(documentHtml).then(serializedHtmlApplication => {
      // "serializedHtmlApplication" is the serialized document string 
      // after being ran through Universal
      
      // Send the html as a response
      res.status(200).send(serializedHtmlApplication);
      next();
      return serializedHtmlApplication;
    });

  });

  // Spawn the server
  app.listen(3000, () => {
    console.log('Listening on: http://localhost:3000');
  });

```

There's a few things going on here, most are being done a little differently for examples sake.
But you can see that what we're doing is serializing the application through that exported 
"main" function within `main.node.ts` (which returns a Promise), the result of that promise is our 
serialize string Application that we can now serve to the browser.
    
------


** MORE TO COME **

...
...
...

...
...
...

    
# <a name="coc"></a> Migrating from Angular rc4 and prior

> Note: expressEngine is still in the works

Prior to rc5, there were no `NgModule`'s. You also passed a config object of type `ExpressEngineConfig` 
to `res.render('index', config /* <-- ExpressEngineConfig object */);` 

#### - OLD - `main.node.ts`

```
export function ngApp(req, res) {
  let baseUrl = '/';
  let url = req.originalUrl || '/';

  let config: ExpressEngineConfig = {
    directives: [
      App
    ],
    platformProviders: [
      {provide: ORIGIN_URL, useValue: 'http://localhost:3000'},
      {provide: APP_BASE_HREF, useValue: baseUrl},
    ],
    providers: [
      {provide: REQUEST_URL, useValue: url},
      NODE_HTTP_PROVIDERS,
      provideRouter(routes),
      NODE_LOCATION_PROVIDERS
    ],
    async: true,
    preboot: false // { appRoot: 'app' } // your top level app component selector
  };

  res.render('index', config);
}
```

As you may of seen [above](#express), we now can create our `NgModule({})` like normal for the 
server, but we have a new object we pass into the `imports: []` Array.

#### - NEW - `main.node.ts`

It might help to think of `withConfig({})` as the Object you used to pass for ExpressEngineConfig. These things have changed 
because of NgModule's and withConfig is a standardized way of passing a configuration object to an angular import/provider.

```

@NgModule({

  /* Other things part of NgModule */
  /* ... etc etc ... */

  imports: [

      /* Normal modules etc that you have from main.browser.ts */
      /* .... etc etc ..... */

      // UniversalModule from "angular2-universal" allows us to provide
      // the config object

      UniversalModule.withConfig({

        // Our "document" (index.html file) which we need to pass in from Node 
        document  : document,
        
        originUrl  : 'http://localhost:3000',
        baseUrl    : '/',
        requestUrl : '/',

        // Preboot [Transfer state between Server & Client]
        // More info can be found at: https://github.com/angular/preboot#options

        preboot    : {
          appRoot : ['app'],   // selector(s) for app(s) on the page
          uglify  : true       // uglify preboot code
        }

      }),

      // **** 
      // Other important Modules for Universal

      NodeHttpModule, // Universal Http 
      NodeJsonpModule // Universal JSONP 

      // ^^ These normally were just passed into `providers: []` Array
      // in the ExpressEngineConfig object previously but are now included

    ]
})
export class ServerModule {
  // Universal events can go here
  // TODO
}

```

This is one of the main differences between previous installments of Universal.
If you look above, you can see a more detailed example of how the rest of the root platform 
files should be arranged. `main.browser.ts` is completely normal, where `client.ts` simply has 
an import for the browser polyfills Universal requires.

Go to [Setting up Universal with NodeJS & Express](#express) for the complete details.

# ... More to come!
