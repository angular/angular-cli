# Angular2 Universal Documentation

> Note this doc is temporary. We will be moving everything to universal.angular.io soon.

  - [Overview](#overview)
    - [Why Universal?](#why)
    - [How does it work?](#how)
    - [What about caching?](#caching)
  - [Installation](#installation)
    - [Prerequisites](#prereq)
    - [with NodeJS & Express](#express)
    - with ASP.NET-Core (coming soon)
    - with Java (coming soon)
  - [Top 4 Key Concepts](#concepts)
    - [Polyfills](#polyfills)
    - [Bootstrapping](#bootstrapping)
    - [Server Context](#servercontext)
    - [DI Swapping](#diswap)
  - Universal CLI (coming soon)

---
---
---


# <a name="overview"></a> Overview

Angular Universal is a library that can be used to render an Angular 2 app on the server.

## <a name="why"></a> Why Universal?

There are four primary reasons why you would want to use Angular Universal:

1. Better Perceived Performance - First time users of your application will 
instantly see a server rendered view which greatly improves perceived performance 
and the overall user experience. According to [research at Google](http://googleresearch.blogspot.com/2009/06/speed-matters.html), 
the difference of just 200 milliseconds in page load performance has an impact on user behavior.
2. Optimized for Search Engines - Although [Googlebot crawls and renders most dynamic sites](https://webmasters.googleblog.com/2015/10/deprecating-our-ajax-crawling-scheme.html), 
many search engines expect plain HTML. Server-side pre-rendering is a reliable, flexible and efficient way to ensure that all search engines can access your content.
3. Site Preview - Ensure that Facebook, Twitter and all other social media apps correctly display a preview image of your app.
4. Graceful Degradation - An IE6 user likely will have issues with your
client side Angular 2 web app, but as a fall back you can have those users
only see the server rendered page.

In essence, this means that Universal is extremely important if you have a 
public web app with anonymous content 
(i.e. an anonymous user on the internet can browse to a particular page.  

## <a name="how"></a> How does it work?

At a high level, there are two primary pieces of Angular Universal:

1. **Server** - Rendering HTML and [inline Preboot code](#preboot) on the server for a given URL request. There are two variations of this:
    * pre-render - Generate static HTML at build time that you can deploy to a CDN or static web host
    * re-render - Run application code on the server with each request to generate the server view on the fly
2. **Browser** - Transitioning from the server generated view to the client generated view in the browser. This is where preboot comes in:
    * Browser receives initial payload from server
    * User sees server view
    * Preboot creates hidden div that will be used for client bootstrap and starts recording events
    * Browser makes async requests for additional assets (i.e. images, JS, CSS, etc.)
    * Once external resources loaded, Angular client bootstrapping begins
    * Client view rendered to the hidden div created by Preboot
    * Bootstrap complete, so Angular client calls preboot.done()
    * Preboot events replayed in order to adjust the application state to reflect changes made by the user before Angular bootstrapped (i.e. typing in textbox, clicking button, etc.)
    * Preboot switches the hidden client view div for the visible server view div
    * Finally, Preboot performs some cleanup on the visible client view including setting focus

## <a name="caching"></a> What about caching?

When you are dealing with server rendering, caching at many different levels is extremely important. In fact,
it is our recommendation that your first option should be using Angular Universal pre-rendering to
generate static HTML files so you don't need any dynamic rendering at run time and everything can
be cached on a CDN. This, however, is only appropriate for certain use cases.

When dynamic server rendering is needed, you can leverage the following types of caching:

* Page caching - Use a service like CloudFlare or Akamai to cache the dynamically generated page for short periods of time
* Object caching - Angular's AoT compiler for Universal enables you to generate artifacts from your application code that can be reused among many server requests
* Data caching - Your Universal app on the server side will pull data from your API and it is possible to share that data with the browser client app so that the client doesn't have to pull the data again. 

Currently, only object caching is handled by Angular Universal out of the box. We will be adding features in the future
to make data caching easier, but the basic gist is:

1. On the server side put data into the generated html (i.e. `<script>var myData = {}</script>`)
2. On the client side have your state management system first check that global data object before pulling data again.

If you do this and your data contains user-specific data, however, just be aware that you will not be able to do any
 page-level caching since you should not share user-specific data across different users.

# <a name="installation"></a> Installation

Angular Universal will eventually be compatible with many different types of back end technologies (i.e. Java, PHP, etc.),
but for right now it only works with a JavaScript back end (i.e. node.js) and .NET (via ASP.NET core). 

Please note that while the instructions below detail how to install and use Angular Universal from scratch, there are 
two other viable ways to get started:

1. [The Angular Universal Starter](https://github.com/angular/universal-starter)
2. The Angular Universal CLI (coming soon)

## <a name="prereq"></a> Prerequisites

Before getting started, make sure you have the following installed:

* Node 4 or higher
* Git (only required if using starter repo)

## <a name="express"></a> NodeJS & Express integration

Angular Universal can be integrated with any server side framework of even just plain JavaScript. This guide focuses
on the most popular node.js server-side framework, Express. You should be able to easily adapt this to Hapi or other
variations of node.js based servers, however, we will publish more guides soon.

* `mkdir universalapp` create a new directory for your app (replace universalapp with the name of your app)
* `cd universalapp`
* `npm init` Just accept defaults when prompted
* Copy the following files from the Universal Starter into your app root directory:
  * [webpack.config](https://github.com/angular/universal-starter/blob/master/webpack.config.ts)
  * [tsconfig.json](https://github.com/angular/universal-starter/blob/master/tsconfig.json)
* Copy the scripts, dependencies and devDependencies from the 
[Universal Starter package.json](https://github.com/angular/universal-starter/blob/master/package.json) into your local package.json file
* `npm install`
* Create a new file src/server.ts. You can use the 
[starter repo server.ts](https://github.com/angular/universal-starter/blob/master/src/server.ts) for reference,
but there are really just two key parts to be aware of:

```JavaScript

// polyfills have to be first
import 'angular2-universal-polyfills';
import { createEngine, ExpressEngineConfig } from 'angular2-express-engine';
import { MainModule } from './app.node.module';  // will change depending on your app

// 1. set up Angular Universal to be the rendering engine for Express
app.engine('.html', createEngine({}));

// 2. get the top level NgModule for the app and pass in important values to Angular Universal 
app.get('/*', (req, res) => {

  // Our Universal - express configuration object
  const expressConfig : ExpressEngineConfig = {
    req,
    res,
    ngModule: MainModule,
    preboot: false,
    baseUrl: '/',
    requestUrl: req.originalUrl,
    originUrl: 'http://localhost:3000'
  };

  // NOTE: everything passed in here will be set as properties to the top level Zone
  // access these values in your code like this: Zone.current.get('req');
  // this is temporary; we will have a non-Zone way of getting these soon
  res.render('index', expressConfig);
});

``` 

* Create your top level NgModule on the server side in the src/app.node.module.ts file 
([like this](https://github.com/angular/universal-starter/blob/master/src/app.node.module.ts))
  * Note that in the starter repo app.node.module.ts and app.browser.module.ts are exactly the same, but in
your app they will almost certainly be different as you specify node-only or browser-only
providers in the imports section as appropriate for each specific platform. 
  * Also note that this is where you set your root App component and top level routes. 
You should try to make it so that you use the same exact component for the server or browser. Most
of the differences will be in the NgModule provider imports that you need to specify.
* The webpack.config that you copied over uses /src/client.ts at the entry point into the client
side app. 
  * Note how client.ts uses the following code to have Angular Universal cooridinate the browser side bootstrap process:
  
```
// important for this to be first in your client.ts file so polyfills can be properly applied
import 'angular2-universal-polyfills';
import { platformUniversalDynamic } from 'angular2-universal';
import { MainModule } from './app.browser.module';  // this will change depending on your app

const platformRef = platformUniversalDynamic();

// bootstrap returns promise if you want to do something after complete
platformRef.bootstrapModule(MainModule);
```

This replaces the normal Angular `bootstrap()` that you would normally use
for client-only Angular apps. Note that the MainModule you pass in here can and
should be different (see [app.browser.module.ts](https://github.com/angular/universal-starter/blob/master/src/app.browser.module.ts) in starter repo) 
than the MainModule you reference from the server side
start (i.e. src/server.ts). This is due to the fact that your imports
for each side may be slightly different. In many cases, as you build out your
Universal app, you will have some browser-only or node-only dependencies and
that is when app.node.module.ts and app.browser.module.ts would be different.

Final note is that in your imports for your Universal app on both the browser
and node NgModule, you need to add UniversalModule:

```
import { UniversalModule } from 'angular2-universal';
@NgModule({
  imports: [
    UniversalModule // includes stuff like the universal HttpModule; must be first import
    // other imports here
  ]
})
export class MainModule {

}
```

# <a name="concepts"></a> Top 4 Key Concepts

The previous installation section goes over an example setup for Universal Apps, but
it may be useful to look at things from a slightly different perspective. Below are the
4 key concepts you have to know and understand if you are building Universal Apps.

## <a name="polyfills"></a> Polyfills

In both our server and client entry points, we have this at the very top:

```
import 'angular2-universal-polyfills';
```

What is this doing? Well, some of these are polyfills needed with most Angular apps:

```
import 'es6-promise';
import 'es6-shim';
import 'reflect-metadata';
```

The important part to be aware of is the Zone patch:

```

// for node:
require('zone.js/dist/zone-node.js');
require('zone.js/dist/long-stack-trace-zone');

// for browser:
require('zone.js/dist/zone.js');
require('zone.js/dist/long-stack-trace-zone');

```

There is a lot of magic going on here under the scenes, but basically
the Zone patch makes sure Angular is aware of all async calls in your code.
So, if you discover that your server side code is returning HTML before
your http calls resolve, then more than likely you either don't have this
patch referenced correctly OR you are making that http call via some async
mechanism that is not in the patch.

One last thing to be aware of here. In some cases, you may want to
patch DOM objects on the server side. For example, you want a `window`
API to work on the server side. In most cases, we DON'T recommend you do this
(use [DI Swapping](#diswap) instead), but if you have to do this, then you
would need to create your own patch and add it right after the reference
to `angular2-universal-polyfills`.

## <a name="bootstrapping"></a> Bootstrapping

As you should be aware from non-Universal Angular 2 development, you
first need to bootstrap your app. The bootstrapping process is slightly
different on the browser and node sides. At the very top level, there
are some convenience functions that wrap a lot of low level functionality.
It is possible to drop down a level to a more complex API, but at the high
level, bootstrapping looks like this:

```

// browser side bootstrap:
platformRef.bootstrapModule(MainModule);

// node side bootstrap:
app.engine('.html', createEngine({}));
app.get('/*', (req, res) => {
  res.render('index', {
    req,
    res,
    ngModule: MainModule,
    preboot: false,
    baseUrl: '/',
    requestUrl: req.originalUrl,
    originUrl: 'http://localhost:3000'
  });
});

```

We will publish some documentation in the future of how to dive
down a layer deeper in situation where you want more control over
the bootsrap process on each side.

## <a name="servercontext"></a> Server Context

A very common question is how to have control over the server
side context to do things like server side redirects or to
access data in the server request header. The key to doing any of this 
is to get access to the Express request and response objects in your
code. As you can see, these objects are passed into the server side
bootstrap:

```
app.get('/*', (req, res) => {
  res.render('index', {
    req,  // Express request object
    res,  // Express response object
    ngModule: MainModule,
    preboot: false,
    baseUrl: '/',
    requestUrl: req.originalUrl,
    originUrl: 'http://localhost:3000'
  });
});

```

All of these values are set on the Zone properties, so to access
these values, you just need to call `Zone.current.get('req')` or change
'req' to whatever value you want. This API will be improved in the 
near future.

## <a name="diswap"></a> DI Swapping

The concept of DI Swapping is absolutely critical for Universal development.
Basically, this is when you use Angular DI to abstract out code
that needs to be specific for the browser or on the server. So, for example,
if your code needs to access a value in the user's cookie, you would do 
something like this:

* Create an abstract class interface `Cookie` that has an empty function `get()`
* Create a browser-specific version called `CookieBrowser` in which the `get()` function where you reference `window.document.cookie`
* Create a node-specific version called `CookieNode` in which the `get()` function where you reference `Zone.current.get('req').cookies` 
* In your browser NgModule, make sure you set `CookieBrowser` as a provider for `Cookie`
* In your server NgModule, make sure you set `CookieNode` as a provider for `Cookie`

This is a really quick, high-level view of how DI Swapping works, but
hopefully you get the idea. You can apply this same type of method anywhere
in your code where you need platform-specific logic.
