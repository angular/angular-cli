# Build System

Angular CLI includes a first-party build system for Angular applications distributed as `@angular-devkit/build-angular`.
This build system is responsible for creating a standalone single-page application (SPA) from user source files and third-party dependencies.

`@angular-devkit/build-angular` itself integrates with the rest of Angular CLI by being an [Architect builder](https://angular.io/guide/cli-builder).
This document describes a top level view of the functionality in `@angular-devkit/build-angular`, referred as just the "build system".
Deprecated or soon to be removed features are not described here.

In broad strokes the main areas are:
- loading and processing sources
- code splitting
- production optimizations
- post-processing steps

Many tools are used in this process, and most of these steps happen within a [Webpack](https://webpack.js.org/) build.
We maintain a number of Webpack-centric plugins in this repository, some of these are public but most are private since they are very specific to our setup.


## Overview diagram

Below is a diagram of processing sources go through.
It's not strictly accurate because some options remove certain processing stages while adding others.
This diagram doesn't show these conditionals and only shows the possible processing steps.
Relative paths, such as `./raw-css-loader.ts`, refer to internal plugins, while other names usually refer to public npm packages.

![Overview diagram](https://g.gravizo.com/source/svg?https://raw.githubusercontent.com/angular/angular-cli/master/docs/design/build-system-overview.dot)

## Loading and processing sources

Sources for Angular CLI browser apps are comprised of TypeScript files, style sheets, assets, scripts, and third party dependencies.
A given build will load these sources from disk, process them, and bundle them together.


### TypeScript and Ahead-Of-Time Compilation

Angular builds rely heavily on TypeScript-specific functionality for [Ahead-of-Time template compilation](https://angular.io/guide/aot-compiler) (AOT).
Outside Angular CLI, this is performed by the Angular Compiler (`ngc`), provided by `@angular/compiler-cli`.
To avail of Ahead-of-Time template compilation within a Webpack compilation we use and distribute the `@ngtools/webpack` Webpack plugin.

Typescript sources are loaded from disk and compiled in-memory into JavaScript files that are stored in a virtual file system and made available to Webpack.
During compilation we also perform a number of code transformations using TypeScript transformers that enable automatic usage of AOT, internationalization features, and server-side rendering.

AOT compilation requires loading HTML and CSS resources, referenced on Angular Components, as standalone strings with no external dependencies.
However, Webpack compilations operate on the basis of modules and references between them.
It's not possible to get the full compilation result for a given resource before the end of the compilation in webpack.
To obtain the standalone string for a HTML/CSS resource we compile it using a separate Webpack child compilation then extract the results.
These child compilations inherit configuration and access to the same files as the parent compilation, but have their own compilation life cycle and complete independently.

The build system allows specifying replacements for specific files by replacing what path is loaded from the virtual file system.
This is used for conditional loading of code at build time.

### Stylesheets

Two types of stylesheets are used in the build system: global stylesheets and component stylesheets.
Global stylesheets are injected into the `index.html` file, while component stylesheets are loaded directly into compiled Angular components.

The build system supports plain CSS stylesheets as well as the Sass, LESS and Stylus CSS pre-processors.
Stylesheet processing functionality is provided by `sass-loader`, `less-loader`, `stylus-loader`, `postcss-loader`, `postcss-import`, augmented in the build system by custom webpack plugins.


### Assets

Assets in the build system refer specifically to a list of files or directories that are meant to be copied verbatim as build artifacts.
These files are not processed and commonly include images, favicons, pdfs and other generic file types.
They are loaded into the compilation using `copy-webpack-plugin`.


### Scripts

Scripts in the build system refer specifically to JavaScript files that are meant to be loaded directly on `index.html` without being processed.
They are loaded into the compilation using a custom webpack plugin.


### Third party dependencies

Third party dependencies are mostly inside `node_modules` and are referenced via imports in source files.
Stylesheet third party dependencies are treated mostly the same as sources.

JavaScript third party dependencies suffer a more involved process.
They are first resolved to a folder in `node_modules` via [Node Module Resolution](https://nodejs.org/api/modules.html#modules_modules).
A given module might have several different entry points, for instance one for use in NodeJS and another one for using in the browser.
Although `package.json` only officially supports listing one entry point under the `main` key, it's common for npm packages to list [other entry points](https://2ality.com/2017/04/setting-up-multi-platform-packages.html).
Each entry point is listed in under a key in that module's `package.json` whose value is a string containing a relative file path.
We use `es2015 > browser > module > main` a priority list of keys, where the first key matched name determines which entry point to use.
For instance, for a module that has both `browser` and `main` entry points, we pick `browser`.

Once the actual JavaScript file is determined, it is loaded into the compilation together with it's source map.

This resolution strategy supports the [Angular Package Format](https://docs.google.com/document/d/1CZC2rcpxffTDfRDs6p1cfbmKNLA6x5O-NtkJglDaBVs/edit#heading=h.k0mh3o8u5hx).


## Code splitting

Code is automatically split into different files (or chunks, for js files) based on a few different triggers.

The main TypeScript entry point and it's dependencies are bundled into the `main` chunk.
Global styles and scripts get one file per entry, named after themselves.

JavaScript code imported only via dynamic imports is automatically split into a separate chunk that is loaded asynchronously named after the file containing the dynamic import.
If multiple asynchronous chunks contain a reference to the same module, it is placed in a new asynchronously loaded chunk named after the other chunks that use it.

There is also a special chunk called `runtime` that contains the module loading logic and is loaded before the others.


## Optimizations

The build system contains optimizations aimed at improving the performance (for development builds) or the size of artifacts (for production builds).
These are often mutually exclusive and thus we cannot just default to always using them.


### Development optimizations

Development optimizations focus on reducing rebuild time on watched builds.
Although faster is always better, our threshold is to keep rebuilds even for large projects below 2 seconds.

Computation needed to bundle code grows with its total size because of the cost of string concatenation and source map operations.
Third party dependencies that are initially loaded are split into a synchronously loaded chunk called `vendor`.
Splitting the infrequently changed vendor code from the frequently changed source code thus helps make rebuilds faster.

When processing stylesheets, Webpack stores the intermediate modules as JavaScript code.
The JavaScript wrapper code makes stylesheets larger and `mini-css-extract-plugin` must be used to obtain the actually stylesheet content into a CSS file.
In development however, we skip the CSS extraction and leave it as JavaScript code for faster rebuild times.

Watched builds split the processing load of TypeScript compilation between file emission on the main process and type checking on a forked process.
Large projects can also opt-out of AOT compilation for faster rebuilds.


### Production optimizations

Angular CLI focuses on enabling tree-shaking (removing unused modules) and dead code elimination (removing unused module code).
These two categories have high potential for size reduction because of network effects: removing code can lead to more code being removed.

The main tool we use to achieve this goal are the dead code elimination capabilities of [Terser](https://github.com/terser/terser).
We also use Terser's mangling, by which names, but not properties, are renamed to shorter forms.
The main characteristics of Terser to keep in mind is that it operates via static analysis and does not support the indirection introduced by module loading.
Thus the rest of the pipeline is directed towards providing Terser with code that can be removed via static analysis in large single modules scopes.

To this end we developed [@angular-devkit/build-optimizer](https://github.com/angular/angular-cli/tree/master/packages/angular_devkit/build_optimizer), a post-processing tool for TS code.
Build Optimizer searches for code patterns produced by the TypeScript and Angular compiler that are known to inhibit dead code elimination, and converts them into equivalent structures that enable it instead (the link above contains some examples).
It also adds Terser [annotations](https://github.com/terser/terser#annotations) marking top-level functions as free from side effects for libraries that have the `sideEffects` flag set to false in `package.json`.

Webpack itself also contains two major features that enable tree-shaking and dead code elimination: [`sideEffects` flag](https://github.com/webpack/webpack/tree/master/examples/side-effects) support and [module concatenation](https://webpack.js.org/plugins/module-concatenation-plugin/).
Having the `sideEffects` flag set to false in `package.json` of a library means that library has no top-level side-effects and only exposes imports, which allows Webpack to rewrite imports to that library directly to the modules used and not including non-imported modules at all.
Module concatenation allows Webpack to collect in a single module the content of several modules, which in turn allows Terser to more easily remove unused code since there is no module loading indirection between those modules.

One significant pitfall of this optimization strategy is the use of code splitting.
Using code splitting is desirable in order to speed up loading of web apps by deferring code that is not necessary on the initial load.
But since code splitting necessarily makes use of module loading, it is at odds with Terser-based optimizations.

The use of lazy loading can not only prevent further optimizations, but also regress the currently possible ones by [preventing module concatenation](https://webpack.js.org/plugins/module-concatenation-plugin/#optimization-bailouts).
Modules that were concatenated when lazy modules are not present might not be concatenated anymore after lazy loading is introduced because these modules now need to be accessed from the lazy modules and thus get their own module scope.

Aside from tree-shaking, scripts and styles (as defined in the sources above) also undergo optimizations via [Terser](https://github.com/terser/terser) and [CleanCSS](https://github.com/jakubpawlowicz/clean-css) respectively.


## Post-processing steps

There are some steps that are meant to operate over existing whole applications and thus happen after the webpack compilation finishes and outputs files.

The fist step is differential loading, where we take code that is targeting modern browsers and produces from it a compatible version for older browsers.
`index.html` is then modified in such a way that both modern and older browsers only load their corresponding scripts.
This is the first step because it's also the most resource intensive one, and performing it later in the pipeline would multiply the work done.

The second of these post-processing steps is build-time localization.
The final js bundles are processed using `@angular/localize`, replacing any locale-specific translations.
This sort of localization produces one application for each locale, each in their own folders.

The third and last post-processing step is the creation of a [service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).
A listing of final application files is taken, fingerprinted according to their content, and added to the service worker manifest.
This must be the last step because it needs each application file to not be modified further.