[![Build Status](https://travis-ci.org/angular/universal.svg?branch=master)](https://travis-ci.org/angular/universal)
[![Join the chat at https://gitter.im/angular/universal](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/angular/universal?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Angular Universal
![Angular Universal](https://angular.io/assets/images/logos/concept-icons/universal.png)

# Table of Contents
* [Introduction](#introduction)
* [Getting Started with Universal](#getting-started)
    * w/ NodeJS Server
    * w/ ASP.NET Core Server
* [Packages](#packages)
* [Universal "Gotchas"](#universal-gotchas)
* [Roadmap](#roadmap)
* [Upgrading from Angular2-Universal](#upgrading-from-angular2-universal)
* [Preboot](#preboot)
* [What's in a name?](#whats-in-a-name)
* [Universal Team](#universal-team)
* [License](#license)

---

# Introduction
The Angular Universal project is a community driven project to expand on the core APIs from Angular (platform-server) to enable developers to do server side rendering of Angular applications in a variety of scenarios.

This repository will host the various tools like engines to integrate with various backends(NodeJS, ASP.NET etc.) and also extra modules and examples to help you started with server side rendering.

The Universal project is driven by community contributions. Please send us your Pull Requests!

# Getting Started

[* **NodeJS** :: Example repo](https://github.com/angular/universal-starter)
  - Minimal universal example

[* ASP.NET Core :: Universal Starter repo](https://github.com/MarkPieszak/aspnetcore-angular2-universal)
  - **Installation**: Clone the above repo, `npm i && dotnet restore` *(VStudio will run these automatically when opening the project)*
  - Launch files included for both VSCode & VStudio to run/debug automatically (press F5).


# Packages
The packages from this repo are published as scoped packages under [@nguniversal](https://www.npmjs.com/search?q=%40nguniversal)

- [@nguniversal/common](/modules/common/README.md)
- [@nguniversal/express-engine](/modules/express-engine/README.md)
- [@nguniversal/aspnetcore-engine](/modules/aspnetcore-engine/README.md)
- [@nguniversal/hapi-engine](/modules/hapi-engine/README.md)
- [@nguniversal/module-map-ngfactory-loader](/modules/module-map-ngfactory-loader)

# Universal "Gotchas"
Moved to [/docs/gotchas.md](/docs/gotchas.md)

# Roadmap

## Completed
- Integrate the platform API into core
- Support Title and Meta services on the server
- Develop Express, ASP.NET Core, Hapi engines
- Angular CLI support for Universal
- Provide a DOM implementation on the server
- Hooks in `renderModule*` to do stuff just before rendering to string
- Generic state transfer API in the platform
- Http Transfer State Module that uses HTTP interceptors and state transfer API
- Material 2 works on Universal
- Write documentation for core API
- Support [AppShell](https://developers.google.com/web/updates/2015/11/app-shell) use cases

## In Progress
- Better internal performance and stress tests
- Make it easier to write unit tests for Universal components
- Make it easier to support other 3rd part libraries like jQuery/d3 that aren't Universal aware
- Node.js bridge protocol to communicate with different language backends - Django, Go, PHP etc.

## Planning
- Full client rehydration strategy that reuses DOM elements/CSS rendered on the server

# Upgrading from Angular2-Universal
If you're coming from the original `angular2-universal` (2.x) here are some helpful steps for porting your application to Angular 4 & platform-server.

[Go here to find the guide](/docs/angular2-universal-migration.md)

# Preboot
Control server-rendered page and transfer state before client-side web app loads to the client-side-app. [Repo](https://github.com/angular/preboot)

# What's in a name?
We believe that using the word "universal" is correct when referring to a JavaScript Application that runs in more environments than the browser. (inspired by [Universal JavaScript](https://medium.com/@mjackson/universal-javascript-4761051b7ae9))

# Universal Team
- [Adam Plumer](https://github.com/CaerusKaru) and [Fabian Wiles](https://github.com/Toxicable) - Current maintainers
- [PatrickJS](https://twitter.com/gdi2290) and [Jeff Whelpley](https://twitter.com/jeffwhelpley) - Founders of the Angular Universal project. (Universal rendering is also called [PatrickJS-ing](https://twitter.com/jeffbcross/status/846512930971516928))
- [Mark Pieszak](https://twitter.com/MarkPieszak) - Contributor and Evangelist, ASP.NET Core Engine
- [Jason Jean](https://github.com/FrozenPandaz) - Express engine and Universal support for CLI
- [Wassim Chegham](https://twitter.com/manekinekko) - Contributor and Evangelist, Hapi engine developer. 
  - [Angular for the rest of us](https://medium.com/google-developer-experts/angular-universal-for-the-rest-of-us-922ca8bac84)
  - [Angular outside the browser](http://slides.com/wassimchegham/angular2-universal#/)
- [Jeff Cross](https://twitter.com/jeffbcross) - Evangelist and performance consultant
- [Vikram Subramanian](https://twitter.com/vikerman) and [Alex Rickabaugh](https://github.com/alxhub) - Angular Core API

# License
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](/LICENSE)
