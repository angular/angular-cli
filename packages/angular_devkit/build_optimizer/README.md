# Angular Build Optimizer

Angular Build Optimizer contains Angular optimizations applicable to JavaScript code as a TypeScript transform pipeline.


## Available optimizations

Transformations applied depend on file content:

- [Class fold](#class-fold), [Scrub file](#scrub-file) and [Prefix functions](#prefix-functions): applied to Angular apps and libraries.
- [Import tslib](#import-tslib): applied when TypeScript helpers are found.

Some of these optimizations add `/*@__PURE__*/` comments.
These are used by JS optimization tools to identify pure functions that can potentially be dropped.


### Class fold

Static properties are folded into ES5 classes:

```typescript
// input
var Clazz = (function () { function Clazz() { } return Clazz; }());
Clazz.prop = 1;

// output
var Clazz = (function () { function Clazz() { } Clazz.prop = 1; return Clazz; }());
```


### Scrub file

Angular decorators, property decorators and constructor parameters are removed, while leaving non-Angular ones intact.

```typescript
// input
import { Injectable, Input, Component } from '@angular/core';
import { NotInjectable, NotComponent, NotInput } from 'another-lib';
var Clazz = (function () { function Clazz() { } return Clazz; }());
Clazz.decorators = [{ type: Injectable }, { type: NotInjectable }];
Clazz.propDecorators = { 'ngIf': [{ type: Input }] };
Clazz.ctorParameters = function () { return [{type: Injector}]; };
var ComponentClazz = (function () {
  function ComponentClazz() { }
  __decorate([
    Input(),
    __metadata("design:type", Object)
  ], Clazz.prototype, "selected", void 0);
  __decorate([
    NotInput(),
    __metadata("design:type", Object)
  ], Clazz.prototype, "notSelected", void 0);
  ComponentClazz = __decorate([
    NotComponent(),
    Component({
        selector: 'app-root',
        templateUrl: './app.component.html',
        styleUrls: ['./app.component.css']
    })
  ], ComponentClazz);
  return ComponentClazz;
}());

// output
import { Injectable, Input, Component } from '@angular/core';
import { NotInjectable, NotComponent } from 'another-lib';
var Clazz = (function () { function Clazz() { } return Clazz; }());
Clazz.decorators = [{ type: NotInjectable }];
var ComponentClazz = (function () {
  function ComponentClazz() { }
  __decorate([
    NotInput(),
    __metadata("design:type", Object)
  ], Clazz.prototype, "notSelected", void 0);
  ComponentClazz = __decorate([
    NotComponent()
  ], ComponentClazz);
  return ComponentClazz;
}());
```


### Prefix functions

Adds `/*@__PURE__*/` comments to top level downleveled class declarations and instantiation.

Warning: this transform assumes the file is a pure module. It should not be used with unpure modules.

```typescript
// input
var Clazz = (function () { function Clazz() { } return Clazz; }());
var newClazz = new Clazz();
var newClazzTwo = Clazz();

// output
var Clazz = /*@__PURE__*/ (function () { function Clazz() { } return Clazz; }());
var newClazz = /*@__PURE__*/ new Clazz();
var newClazzTwo = /*@__PURE__*/ Clazz();
```


### Prefix Classes

Adds `/*@__PURE__*/` to downleveled TypeScript classes.

```typescript
// input
var ReplayEvent = (function () {
    function ReplayEvent(time, value) {
        this.time = time;
        this.value = value;
    }
    return ReplayEvent;
}());

// output
var ReplayEvent = /*@__PURE__*/ (function () {
    function ReplayEvent(time, value) {
        this.time = time;
        this.value = value;
    }
    return ReplayEvent;
}());
```


### Import tslib

TypeScript helpers (`__extends/__decorate/__metadata/__param`) are replaced with `tslib` imports whenever found.

```typescript
// input
var __extends = (this && this.__extends) || function (d, b) {
  for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
  function __() { this.constructor = d; }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};

// output
import { __extends } from "tslib";
```

### Wrap enums

Wrap downleveled TypeScript enums in a function, and adds `/*@__PURE__*/` comment.

```typescript
// input
var ChangeDetectionStrategy;
(function (ChangeDetectionStrategy) {
    ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
    ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
})(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));

// output
var ChangeDetectionStrategy = /*@__PURE__*/ (function () {
  var ChangeDetectionStrategy = {};
  ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
  ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
  return ChangeDetectionStrategy;
})();
```


## Library Usage

```typescript
import { buildOptimizer } from '@angular-devkit/build-optimizer';

const transpiledContent = buildOptimizer({ content: input }).content;
```

Available options:
```typescript
export interface BuildOptimizerOptions {
  content?: string;
  inputFilePath?: string;
  outputFilePath?: string;
  emitSourceMap?: boolean;
  strict?: boolean;
  isSideEffectFree?: boolean;
}
```


## Webpack loader usage:

```typescript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: '@angular-devkit/build-optimizer/webpack-loader',
        options: {
          sourceMap: false
        }
      }
    ]
  }
}
```


## CLI usage

```bash
build-optimizer input.js
build-optimizer input.js output.js
```
