[![Build Status](https://travis-ci.org/angular/universal.svg?branch=master)](https://travis-ci.org/angular/universal)
[![npm version](https://badge.fury.io/js/angular2-universal.svg)](http://badge.fury.io/js/angular2-universal)
[![Join the chat at https://gitter.im/angular/universal](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/angular/universal?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Issue Stats](http://issuestats.com/github/angular/universal/badge/pr?style=flat)](http://issuestats.com/github/angular/universal)
[![Issue Stats](http://issuestats.com/github/angular/universal/badge/issue?style=flat)](http://issuestats.com/github/angular/universal)

<p align="center">
  
    <img src="https://cloud.githubusercontent.com/assets/1016365/10639063/138338bc-7806-11e5-8057-d34c75f3cafc.png" alt="Universal Angular 2" height="320"/>
  
</p>

# Universal Angular 2
> Universal (isomorphic) JavaScript support for Angular 2.

# Table of Contents
* [Documentation](#documentation)
* [Getting Started with Universal](#getting-started)
    * w/ NodeJS Server
    * w/ ASP.NET Core Server
* [Modules](#modules)
    * [Universal](#universal)
* [Best Practices](#best-practices)
* [What's in a name?](#whats-in-a-name)
* [License](#license)

---

# Documentation

**[Universal Documentation & Guide](https://github.com/angular/universal/blob/master/DOCUMENTATION.md)**

 - Featuring an overview, installation process, and key concepts for creating Universal Angular applications.
 - For those intersted in how it all got started, and the goals of Universal check out the [Original Design Doc (from 2015)](https://docs.google.com/document/d/1q6g9UlmEZDXgrkY88AJZ6MUrUxcnwhBGS0EXbVlYicY)


# Getting Started

[* **NodeJS** :: **Universal Starter** repo](https://github.com/angular/universal-starter)
  - Minimal webpack angular2 & universal starter
  - **Installation**: Clone the above repo, `npm i && npm start` to fire it up.

[* ASP.NET Core :: Universal Starter repo](https://github.com/MarkPieszak/aspnetcore-angular2-universal)
  - **Installation**: Clone the above repo, `npm i && dotnet restore` *(VStudio will run these automatically when opening the project)*
  - Launch files included for both VSCode & VStudio to run/debug automatically (press F5).

---- 

# Universal "Gotchas"

> When building Universal components in Angular 2 there are a few things to keep in mind.

 - To use `templateUrl` or `stylesUrl` you must use **`angular2-template-loader`** in your TS loaders.
    - This is already setup within this starter repo. Look at the webpack.config file [here](https://github.com/angular/universal-starter/blob/master/webpack.config.ts) for details & implementation.
 - **`window`**, **`document`**, **`navigator`**, and other browser types - _do not exist on the server_ - so using them, or any library that uses them (jQuery for example) will not work. You do have some options, if you truly need some of this functionality:
    - If you need to use them, consider limiting them to only your main.client and wrapping them situationally with the imported *isBrowser / isNode* features from Universal.  `import { isBrowser, isNode } from 'angular2-universal'`;
    - Another option is using `DOM` from ["@angular/platform-browser"](https://github.com/angular/angular/blob/e3687706c71beb7c9dbdae1bbb5fbbcea588c476/modules/%40angular/platform-browser/src/dom/dom_adapter.ts#L34)
 - **Don't manipulate the nativeElement directly**. Use the _Renderer_. We do this to ensure that in any environment we're able to change our view.
```
constructor(element: ElementRef, renderer: Renderer) {
  renderer.setElementStyle(element.nativeElement, 'font-size', 'x-large');
}
```
 - The application runs XHR requests on the server & once again on the Client-side (when the application bootstraps)
    - Use a [UniversalCache](https://github.com/angular/universal-starter/blob/master/src/app/shared/api.service.ts#L46-L71) instead of regular Http, to save certain requests so they aren't re-ran again on the Client.
 - Know the difference between attributes and properties in relation to the DOM.
 - Keep your directives stateless as much as possible. For stateful directives, you may need to provide an attribute that reflects the corresponding property with an initial string value such as url in img tag. For our native <img src=""> element the src attribute is reflected as the src property of the element type HTMLImageElement.

# Modules

## [Universal](/modules/universal)
> Manage your application lifecycle and serialize changes while on the server to be sent to the client.


### Videos
Angular 2 Universal Patterns - ng-conf, May 2016  
[![Angular 2 Universal Patterns](http://img.youtube.com/vi/TCj_oC3m6_U/0.jpg)](https://www.youtube.com/watch?v=TCj_oC3m6_U)

Angular Universal Source Code - ReadTheSource, January 2016  
[![Angular Universal Source Code](http://img.youtube.com/vi/qOjtFjXoebY/0.jpg)](https://www.youtube.com/watch?v=qOjtFjXoebY)

Full Stack Angular 2 - AngularConnect, Oct 2015  
[![Full Stack Angular 2](https://img.youtube.com/vi/MtoHFDfi8FM/0.jpg)](https://www.youtube.com/watch?v=MtoHFDfi8FM)

Angular 2 Server Rendering - Angular U, July 2015  
[![Angular 2 Server Rendering](http://img.youtube.com/vi/0wvZ7gakqV4/0.jpg)](http://www.youtube.com/watch?v=0wvZ7gakqV4)

## [preboot.js](https://github.com/angular/preboot)
> Control server-rendered page and transfer state before client-side web app loads to the client-side-app.



# What's in a name?
We believe that using the word "universal" is correct when referring to a JavaScript Application that runs in more environments than the browser. (inspired by [Universal JavaScript](https://medium.com/@mjackson/universal-javascript-4761051b7ae9))

# License
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](/LICENSE)
