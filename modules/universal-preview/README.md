![Angular 2 Universal](https://cloud.githubusercontent.com/assets/1016365/10639063/138338bc-7806-11e5-8057-d34c75f3cafc.png)

# Angular 2 Universal
> Universal (isomorphic) JavaScript support for Angular 2

# Table of Contents
* [Modules](#modules)
    * [Universal](#universal)
    * [preboot.js](#prebootjs)
* [Best Practices](#best-practices)
* [What's in a name?](#whats-in-a-name)
* [License](#license)

# Modules

## Universal
> Manage your application lifecycle and serialize changes while on the server to be sent to the browser

### Documentation
[Design Doc](https://docs.google.com/document/d/1q6g9UlmEZDXgrkY88AJZ6MUrUxcnwhBGS0EXbVlYicY)

### Videos
Full Stack Angular 2 - AngularConnect, Oct 2015  
[![Full Stack Angular 2](https://img.youtube.com/vi/MtoHFDfi8FM/0.jpg)](https://www.youtube.com/watch?v=MtoHFDfi8FM)

Angular 2 Server Rendering - Angular U, July 2015  
[![Angular 2 Server Rendering](http://img.youtube.com/vi/0wvZ7gakqV4/0.jpg)](http://www.youtube.com/watch?v=0wvZ7gakqV4)

## preboot.js
> Control server-rendered page and transfer state before client-side web app loads to the client-side-app.

# Best Practices
> When building Universal components in Angular 2 there are a few things to keep in mind

* Know the difference between attributes and properties in relation to the DOM
* Don't manipulate the `nativeElement` directly. Use the `Renderer`
```typescript
constructor(element: ElementRef, renderer: Renderer) {
  renderer.setElementStyle(element, 'fontSize', 'x-large');
}
```
* Don't use any of the browser types provided in the global namespace such as `navigator` or `document`. Anything outside of Angular will not be detected when serializing your application into html
* Keep your directives stateless as much as possible. For stateful directives you may need to provide an attribute that reflects the corresponding property with an initial string value such as `url` in `img` tag. For our native `<img src"">` element the `src` attribute is reflected as the `src` property of the element type `HTMLImageElement`. 

# What's in a name?
We believe that using the word "universal" is correct when referring to a JavaScript Application that runs in more environments than the browser. (inspired by [Universal JavaScript](https://medium.com/@mjackson/universal-javascript-4761051b7ae9))

# License
[Apache-2.0](/LICENSE)
