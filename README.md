# Current Status: Universal platform API has been merged into Angular 4.0!
## https://github.com/angular/angular/tree/master/packages/platform-server
(The code for the 2.x version of angular2-universal has been archived at https://github.com/angular/universal/tree/2.x)

[![Build Status](https://travis-ci.org/angular/universal.svg?branch=master)](https://travis-ci.org/angular/universal)
[![Join the chat at https://gitter.im/angular/universal](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/angular/universal?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Angular Universal
> Universal (isomorphic) JavaScript support for Angular.

# Table of Contents
* [Introduction](#introduction)
* [Upgrading from Angular2-Universal](#upgrading-from-angular2-universal)
* [Roadmap](#roadmap)
* [Getting Started with Universal](#getting-started)
    * w/ NodeJS Server
    * w/ ASP.NET Core Server
* [Universal "Gotchas"](#universal-gotchas)
* [Preboot](#preboot)
* [What's in a name?](#whats-in-a-name)
* [Universal Team](#universal-team)
* [License](#license)

---

# Introduction
The Angular Universal project consists of the base platform API and the surrounding tools that enables developer to do server side rendering(or pre-rendering) of Angular applications. The platform API part has been merged into Angular core as of 4.0. 

This repository will host the various tools like engines to integrate with various backends(NodeJS, ASP.NET etc.) and also extra modules and examples to help you started with server side rendering.

# Upgrading from Angular2-Universal
> If you're coming from the original `angular2-universal` (2.x) here are some helpful steps for porting your application to Angular 4 & platform-server.

[Go here to find the guide](https://github.com/angular/universal/blob/master/UPGRADE-GUIDE.md)

----

# Roadmap

## Angular 4.0
- Integrate the platform API into core (Done)
- Support Title and Meta services on the server (Done)
- Write documentation for core API (In Progress)
- Develop Express, ASP.NET Core, Hapi engines (In Progress)

## Angular 4.1+
- Hooks in `renderModule*` to do stuff just before rendering to string
- Generic state transfer API in the platform
- Http Transfer State Module that uses HTTP interceptors and state transfer API
- Better internal performance and stress tests
- Make it easier to write unit tests for Universal components
- Support [AppShell](https://developers.google.com/web/updates/2015/11/app-shell) use cases
- Unified Document Service that combines Meta and Title services and adds more features
- Angular CLI support for Universal
- Material 2 works on Universal
- Provide a solution for Java backends

## Angular 5.0 and Beyond
- Full client rehydration strategy that reuses DOM elements/CSS rendered on the server
- Make it easier to support other 3rd part libraries like jQuery/d3 that aren't Universal aware
- Node.js bridge protocol to communicate with different language backends - Django, Go, PHP etc.

# Getting Started

[* **NodeJS** :: Example repo](https://github.com/robwormald/ng-universal-demo)
  - Minimal webpack & universal example with Angular 4.0

[* ASP.NET Core :: Universal Starter repo](https://github.com/MarkPieszak/aspnetcore-angular2-universal)
  - **Installation**: Clone the above repo, `npm i && dotnet restore` *(VStudio will run these automatically when opening the project)*
  - Launch files included for both VSCode & VStudio to run/debug automatically (press F5).

---- 

# Universal "Gotchas"

> When building Universal components in Angular 2 there are a few things to keep in mind.

 - **`window`**, **`document`**, **`navigator`**, and other browser types - _do not exist on the server_ - so using them, or any library that uses them (jQuery for example) will not work. You do have some options, if you truly need some of this functionality:
    - If you need to use them, consider limiting them to only your client and wrapping them situationally. You can use the Object injected using the PLATFORM_ID token to check whether the current platform is browser or server. 
    
    ```
     import { PLATFORM_ID } from '@angular/core';
     import { isPlatformBrowser, isPlatformServer } from '@angular/common';
     
     constructor(@Inject(PLATFORM_ID) private platformId: Object) { ... }
     
     ngOnInit() {
       if (isPlatformBrowser(this.platformId)) {
          // Client only code.
          ...
       }
       if (isPlatformServer(this.platformId)) {
         // Server only code.
         ...
       }
     }
    ```
    
     - Try to *limit or* **avoid** using **`setTimeout`**. It will slow down the server-side rendering process. Make sure to remove them in the [`ngOnDestroy`](https://angular.io/docs/ts/latest/api/core/index/OnDestroy-class.html) method of your Components.
   - Also for RxJs timeouts, make sure to _cancel_ their stream on success, for they can slow down rendering as well.
 - **Don't manipulate the nativeElement directly**. Use the _Renderer2_. We do this to ensure that in any environment we're able to change our view.
```
constructor(element: ElementRef, renderer: Renderer2) {
  renderer.setStyle(element.nativeElement, 'font-size', 'x-large');
}
```
 - The application runs XHR requests on the server & once again on the Client-side (when the application bootstraps)
    - Use a cache that's transferred from server to client (TODO: Point to the example)
 - Know the difference between attributes and properties in relation to the DOM.
 - Keep your directives stateless as much as possible. For stateful directives, you may need to provide an attribute that reflects the corresponding property with an initial string value such as url in img tag. For our native element the src attribute is reflected as the src property of the element type HTMLImageElement.

# Preboot
> Control server-rendered page and transfer state before client-side web app loads to the client-side-app. [Repo](https://github.com/angular/preboot)

# What's in a name?
We believe that using the word "universal" is correct when referring to a JavaScript Application that runs in more environments than the browser. (inspired by [Universal JavaScript](https://medium.com/@mjackson/universal-javascript-4761051b7ae9))

# Universal Team
- [PatrickJS](https://twitter.com/gdi2290) and [Jeff Whelpley](https://twitter.com/jeffwhelpley) - Founders of the Angular Universal project. (Universal rendering is also called [PatrickJS-ing](https://twitter.com/jeffbcross/status/846512930971516928))
- [Mark Pieszak](https://twitter.com/MarkPieszak) - Contributor and Evangelist, ASP.NET Core Engine
- [Jason Jean](https://github.com/FrozenPandaz) - Express engine and Universal support for CLI
- [Wassim Chegham](https://twitter.com/manekinekko) - Contributor and Evangelist, Hapi engine developer. 
  - [Angular for the rest of us](https://medium.com/google-developer-experts/angular-universal-for-the-rest-of-us-922ca8bac84)
  - [Angular outside the browser](http://slides.com/wassimchegham/angular2-universal#/)
- [Jeff Cross](https://twitter.com/jeffbcross) - Evangelist and performance consultant
- [Vikram Subramanian](https://twitter.com/vikerman) and [Alex Rickabaugh](https://github.com/alxhub) - Angular Core API

The Universal project is driven by community contributions. Please send us your Pull Requests!

# License
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](/LICENSE)
