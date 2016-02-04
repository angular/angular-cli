# 3rd party libraries

### Table of Contents

* [A. Consumer Guide: Using `ng install` to prepare your application to use a 3rd party library](#a-consumer-guide-installing-a-3rd-party-library)
* [B. Publisher Guide: Preparing your library for use by angular-cli](#b-publisher-guide-preparing-your-library)

## A. Consumer Guide: Installing a 3rd party library

Prerequisites: **You will first want to make sure the library adheres to the Publisher Guide**

How do I find this out?

1. Find the root file in the 3rd party library repo you are interested in
2. Take a look at the root file (should be the same name as the repo itself in most cases)
3. If you see `export default { ...some angular2 metadata... }` at the bottom, then the chances are high it's compatible
4. If you don't see it, [click here](#suggest-a-repo-adhere-to-the-publisher-guide) to copy/paste a feature request to post on the library repo

### Ok I'm ready, let's do this!

For example purposes, we will use [ng2-cli-test-lib](https://github.com/NathanWalker/ng2-cli-test-lib) here, however you would substitute the name of the library you want to install.

```
$ ng install ng2-cli-test-lib
Installing 3rd party package: ng2-cli-test-lib...
Package successfully installed.
[?] Inject the installed package into your app? (Y/n) Y
[?] Customize the injection of ng2-cli-test-lib? (Y/n) Y
[?] What would you like to inject from ng2-cli-test-lib?
1 Directive
2 Pipe
3 Provider
4 styleUrl
-----------
q Quit

Enter value: 1
[?] Which Directive would you like to inject?
1 TestDirective
Enter value: 1

[?] Where would you like to inject it?
1 ~/project/src/app.ts
2 ~/project/src/app/project.spec.ts
3 ~/project/src/app/project.ts
Enter value: 3
Injecting Directive (TestDirective) to ~/project/src/app/project.ts
Successfully injected.

[?] What would you like to inject from ng2-cli-test-lib?
1 Directive
2 Pipe
3 Provider
4 styleUrl
-----------
q Quit

Enter value: q

[?] Inject providers into bootstrap script? (Y/n) Y
[?] Path to the file which bootstraps your app? ~/project/src/app.ts
Providers imported in ~/project/src/app.ts
Done.
```

You library is now successfully installed and injected into your project.

In this example we chose to inject a `Directive`.
Specifically we chose `TestDirective` to be injected into `~/project/src/app/project.ts`.
Upon quitting, we were given the opportunity to inject providers into our bootstrap script. We chose `Y(es)` and specified `~/project/src/app.ts`. Providers were then injected into our bootstrap script.

However, if we don't want that the library to auto-inject anything, we can just answer `N(o)` to the first question.

Example:

````shell
$ ng install ng2-cli-test-lib
Installing 3rd party package: ng2-cli-test-lib...
Package successfully installed.
[?] Inject the installed package into your app? (Y/n) n
Done.
````

## B. Publisher Guide: Preparing your library

A few advantages to preparing your library for use by angular-cli:

* It does not affect how your library would be consumed manually
* Provides a standard format in which your library can be consumed
* Creates a sense of familiarity and ease of use for developers
* Allows for rapid development with your library for projects that are under very tight time constraints
* Provides a way for developers to easily uninstall your library when the need arises

#### Step 1

Create a file in the root of the library project to represent the entry point, usually named to match the repo/library name.

#### Step 2

Add a `default` export at the bottom with the angular2 metadata that your library provides
For example:
[https://github.com/NathanWalker/ng2-cli-test-lib/blob/master/ng2-cli-test-lib.ts](https://github.com/NathanWalker/ng2-cli-test-lib/blob/master/ng2-cli-test-lib.ts)

#### Step 3

At the time of writing, we still need a bundler script to create bundles that will then be included into our app.
Here is an example of a bundler script which uses `systemjs-builder`, which we tested and works well.
````js
var pkg     = require('./package.json');
var path    = require('path');
var Builder = require('systemjs-builder');
var name    = pkg.name;

var builder = new Builder();
var config = {
  baseURL: '.',
  transpiler: 'typescript',
  typescriptOptions: {
    module: 'cjs'
  },
  map: {
    typescript: './node_modules/typescript/lib/typescript.js',
    angular2: path.resolve('node_modules/angular2'),
    rxjs: path.resolve('node_modules/rxjs')
  },
  paths: {
    '*': '*.js'
  },
  meta: {
    'node_modules/angular2/*': { build: false },
    'node_modules/rxjs/*': { build: false }
  },
};

builder.config(config);

builder
.bundle(name, path.resolve(__dirname, 'bundles/', name + '.js'))
.then(function() {
  console.log('Build complete.');
})
.catch(function(err) {
  console.log('Error', err);
});
````

Just include this script in the root of your app named like `bundler-script.js` and run it before publishing your library to `npm`.

Note that when TypeScript version 1.8 is out of `beta`, this script will no longer be needed and this documentation will be updated.

#### Step 4

Bump version, compile and republish.

#### Step 5

There is no step 5. It's that easy. Ok wait a second, what?!
Let's break down the entry file mentioned above.

```
// We import these so we can reference them in the 'default' export below
import {TestDirective} from './src/app/directives/test.directive';
import {TestService} from './src/app/providers/test.provider';
import {TestService2} from './src/app/providers/test2.provider';
import {TestPipe} from './src/app/pipes/test.pipe';
import {TestStyles} from './src/app/test.styles';

// We export everything we want developers to be able to use manually
export * from './src/app/directives/test.directive';
export * from './src/app/providers/test.provider';
export * from './src/app/providers/test2.provider';
export * from './src/app/pipes/test.pipe';
export * from './src/app/test.styles';

// This is the magic.
// Provides a standard way to export your library to allow angular-cli to help developers setup your library
// Please note: keys are optional. Your library can provide any metadata is provides.
export default {
  directives: [TestDirective],
  pipes: [TestPipe],
  providers: [TestService, TestService2],
  styles: TestStyles.styles(),
  styleUrls: ['src/app/css/test.css']
}
```

This would allow angular-cli to auto-annotate all relevant angular metadata that your library provides if the consumer chose to auto-inject.
You can study this example library which provides this complete example:
https://github.com/NathanWalker/ng2-cli-test-lib

### Suggest a repo adhere to the Publisher Guide

1. Create a new issue on the lib repo
2. Copy/paste this subject: `Please add a default export to support angular-cli auto install feature`
3. Copy/paste this message for the body:

> It would be great if this library provided a `default` export object as described [here in the angular-cli Publisher's Guide](https://github.com/angular/angular-cli/blob/master/docs/ng-install.md#b-publisher-guide-preparing-your-library). Our project would greatly benefit from it and it's very easy to do. Please comment back if that would be possible. If you won't have time in the next couple days, I will try to submit a PR to provide this compatibility soon. Thank you!

## CREDITS

Using the `default` export was a brilliant idea from an angular core team member, @robwormald, so huge thanks to him. More background here: https://github.com/angular/angular-cli/issues/96
