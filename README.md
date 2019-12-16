[![CircleCI](https://circleci.com/gh/angular/universal/tree/master.svg?style=shield)](https://circleci.com/gh/angular/universal/tree/master)
[![Join the chat at https://gitter.im/angular/universal](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/angular/universal?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Angular Universal
![Angular Universal](https://angular.io/generated/images/marketing/concept-icons/universal.png)

# Table of Contents
* [Introduction](#introduction)
* [Getting Started with Universal](#getting-started)
* [Upgrading to Version 8](#version-8)
* [Packages](#packages)
* [Universal "Gotchas"](#universal-gotchas)
* [Roadmap](#roadmap)
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

[Angular Universal Guide](https://angular.io/guide/universal)

# Version 8
Follow this upgrade guide if you are upgrading an exsiting Universal project to Angular version 8 - [Guide](/docs/v8-upgrade-guide.md)

# Packages
The packages from this repo are published as scoped packages under [@nguniversal](https://www.npmjs.com/search?q=%40nguniversal)

- [@nguniversal/common](/modules/common/README.md)
- [@nguniversal/builders](/modules/builders/README.md)
- [@nguniversal/express-engine](/modules/express-engine/README.md)
- [@nguniversal/aspnetcore-engine](/modules/aspnetcore-engine/README.md)
- [@nguniversal/hapi-engine](/modules/hapi-engine/README.md)
- [@nguniversal/module-map-ngfactory-loader](/modules/module-map-ngfactory-loader)
- [@nguniversal/socket-engine](/modules/socket-engine)

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
- Development server/watch mode builder with livereload for CLI

## In Progress
- Static site rendering

## Planning
- Full client rehydration strategy that reuses DOM elements/CSS rendered on the server
- Better internal performance and stress tests
- Make it easier to write unit tests for Universal components
- Node.js bridge protocol to communicate with different language backends - Django, Go, PHP etc.

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
