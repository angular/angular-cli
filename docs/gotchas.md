# Important Considerations when Using Angular Universal

## Introduction

Although the goal of the Universal project is the ability to seamlessly render an Angular
application on the server, there are some inconsistencies that you should consider. First,
there is the obvious discrepancy between the server and browser environments. When rendering
on the server, your application is in an ephemeral or "snapshot" state. The application is
fully rendered once, with the resulting HTML returned, and the remaining application state
destroyed until the next render. Next, the server environment inherently does not have the
same capabilities as the browser (and has some that likewise the browser does not). For
instance, the server does not have any concept of cookies. You can polyfill this and other
functionality, but there is no perfect solution for this. In later sections, we'll walk
through potential mitigations to reduce the scope of errors when rendering on the server.

Please also note the goal of SSR: improved initial render time for your application. This
means that anything that has the potential to reduce the speed of your application in this
initial render should be avoided or sufficiently guarded against. Again, we'll review how
to accomplish this in later sections.

## "window is not defined"

One of the most common issues when using Angular Universal is the lack of browser global
variables in the server environment. This is because the Universal project uses
[domino](https://github.com/fgnass/domino) as the server DOM rendering engine. As a result,
there is certain functionality that won't be present or supported on the server. This
includes the `window` and `document` global objects, cookies, certain HTML elements (like canvas),
and several others. There is no exhaustive list, so please be aware of the fact that if you
see an error like this, where a previously-accessible global is not defined, it's likely because
that global is not available through domino.

> Fun fact: Domino stands for "DOM in Node"

### How to fix?

#### Strategy 1: Injection

Frequently, the needed global is available through the Angular platform via Dependency Injection (DI).
For instance, the global `document` is available through the `DOCUMENT` token. Additionally, a _very_
primitive version of both `window` and `location` exist through the `DOCUMENT` object. For example:

```ts
// example.service.ts
import {Injectable, Inject} from '@angular/core';
import {DOCUMENT} from '@angular/common';

@Injectable()
export class ExampleService {
  constructor(@Inject(DOCUMENT) private _doc: Document) {
  }

  getWindow(): Window | null {
    return this._doc.defaultView;
  }
  
  getLocation(): Location {
    return this._doc.location;
  }

  createElement(tag: string): HTMLElement {
    return this._doc.createElement(tag);
  }
}
```

Please be judicious about using these references, and lower your expectations about their capabilities. `localStorage`
is one frequently-requested API that won't work how you want it to out of the box. If you need to write your own library 
components, please consider using this method to provide similar functionality on the server (this is what Angular CDK 
and Material do).

#### Strategy 2: Guards

If you can't inject the proper global value you need from the Angular platform, you can "guard" against
invocation of browser code, so long as you don't need to access that code on the server. For instance,
often invocations of the global `window` element are to get window size, or some other visual aspect.
However, on the server, there is no concept of "screen", and so this functionality is rarely needed.

You may read online and elsewhere that the recommended approach is to use `isPlatformBrowser` or
`isPlatformServer`. This guidance is **incorrect**. This is because you wind up creating platform-specific
code branches in your application code. This not only increases the size of your application unnecessarily,
but it also adds complexity that then has to be maintained. By separating code into separate platform-specific
modules and implementations, your base code can remain about business logic, and platform-specific exceptions
are handled as they should be: on a case-by-case abstraction basis. This can be accomplished using Angular's Dependency 
Injection (DI) in order to remove the offending code and drop in a replacement at runtime. Here's an example:

```ts
// window-service.ts
import {Injectable} from '@angular/core';

@Injectable()
export class WindowService {
  getWidth(): number {
    return window.innerWidth;
  }
}
```

```ts
// server-window.service.ts
import {Injectable} from '@angular/core';
import {WindowService} from './window.service';

@Injectable()
export class ServerWindowService extends WindowService {
  getWidth(): number {
    return 0;
  } 
}
```

```ts
// app-server.module.ts
import {NgModule} from '@angular/core';
import {WindowService} from './window.service';
import {ServerWindowService} from './server-window.service';

@NgModule({
  providers: [{
    provide: WindowService,
    useClass: ServerWindowService,
  }]
})
```

If you have a component provided by a third-party that is not Universal-compatible out of the box,
you can create two separate modules for browser and server (the server module you should already have),
in addition to your base app module. The base app module will contain all of your platform-agnostic code,
the browser module will contain all of your browser-specific/server-incompatible code, and vice-versa for
your server module. In order to avoid editing too much template code, you can create a no-op component
to drop in for the library component. Here's an example:

```ts
// example.component.ts
import {Component} from '@angular/core';

@Component({
  selector: 'example-component',
  template: `<library-component></library-component>` // this is provided by a third-party lib
                                                      // that causes issues rendering on Universal
})
export class ExampleComponent {
}
```

```ts
// app.module.ts
import {NgModule} from '@angular/core';
import {ExampleComponent} from './example.component';

@NgModule({
  declarations: [ExampleComponent],
})
```

```ts
// browser-app.module.ts
import {NgModule} from '@angular/core';
import {LibraryModule} from 'some-lib';
import {AppModule} from './app.module';

@NgModule({
  imports: [AppModule, LibraryModule],
})
```

```ts
// library-shim.component.ts
import {Component} from '@angular/core';

@Component({
  selector: 'library-component',
  template: ''
})
export class LibraryShimComponent {
}
```

```ts
// server.app.module.ts
import {NgModule} from '@angular/core';
import {LibraryShimComponent} from './library-shim.component';
import {AppModule} from './app.module';

@NgModule({
  imports: [AppModule],
  declarations: [LibraryShimComponent],
})
export class ServerAppModule {
}
```

#### Strategy 3: Shims

If all else fails, and you simply must have access to some sort of browser functionality, you can patch
the global scope of the server environment to include the globals you need. For instance:

```ts
// server.ts
global['window'] = {
  // properties you need implemented here...
};
```

This can be applied to any undefined element. Please be careful when you do this, as playing with the global
scope is generally considered an anti-pattern.

> Fun fact: a shim is a patch for functionality that will never be supported on a given platform. A 
> polyfill is a patch for functionality that is planned to be supported, or is supported on newer versions

## Application is slow, or worse, won't render

The Angular Universal rendering process is straightforward, but just as simply can be blocked or slowed down
by well-meaning or innocent-looking code. First, some background on the rendering process. When a render
request is made for platform-server (the Angular Universal platform), a single route navigation is executed.
When that navigation completes, meaning that all Zone.js macrotasks are completed, the DOM in whatever state
it's in at that time is returned to the user.

> A Zone.js macrotask is just a JavaScript macrotask that executes in/is patched by Zone.js

This means that if there is a process, like a microtask, that takes up ticks to complete, or a long-standing
HTTP request, the rendering process will not complete, or will take longer. Macrotasks include calls to globals
like `setTimeout` and `setInterval`, and `Observables`. Calling these without cancelling them, or letting them run 
longer than needed on the server could result in suboptimal rendering.

> It may be worth brushing up on the JavaScript event loop and learning the difference between microtasks
> and macrotasks, if you don't know it already. [Here's](https://javascript.info/event-loop) a good reference.

## My X, Y, Z won't finish before render!

Similarly to the above section on waiting for macrotasks to complete, the flip-side is that the platform will
not wait for microtasks to complete before finishing the render. In Angular Universal, we have patched the
Angular HTTP client to turn it into a macrotask, to ensure that any needed HTTP requests complete for a given
render. However, this type of patch may not be appropriate for all microtasks, and so it is recommended you use
your best judgment on how to proceed. You can look at the code reference for how Universal wraps a task to turn
it into a macrotask, or you can simply opt to change the server behavior of the given tasks.
