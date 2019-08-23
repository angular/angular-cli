/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable-next-line:no-implicit-dependencies
import { tags } from '@angular-devkit/core';
import { transformJavascript } from '../helpers/transform-javascript';
import { getImportTslibTransformer, testImportTslib } from './import-tslib';


const transform = (content: string) => transformJavascript(
  { content, getTransforms: [getImportTslibTransformer] }).content;

describe('import-tslib', () => {
  it('replaces __extends', () => {
    const input = tags.stripIndent`
      var __extends = (this && this.__extends) || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
          function __() { this.constructor = d; }
          d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    `;
    const output = tags.stripIndent`
      import { __extends } from "tslib";
    `;

    expect(testImportTslib(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('replaces wrapped __extends', () => {
    const input = tags.stripIndent`
    export default function appGlobal() {
        var __extends = (this && this.__extends) || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
          function __() { this.constructor = d; }
          d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    }
    `;
    const output = tags.stripIndent`
      import { __extends } from "tslib";
      export default function appGlobal() { }
    `;

    expect(testImportTslib(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('replaces __decorate', () => {
    // tslint:disable:max-line-length
    const input = tags.stripIndent`
      var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
          var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
          if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
          else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
          return c > 3 && r && Object.defineProperty(target, key, r), r;
      };
    `;
    const output = tags.stripIndent`
      import { __decorate } from "tslib";
    `;

    expect(testImportTslib(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('replaces multiple __decorate', () => {
    // tslint:disable:max-line-length
    const input = tags.stripIndent`
      var __decorate$1 = (this && this.__decorate) || function (decorators, target, key, desc) {
          var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
          if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
          else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
          return c > 3 && r && Object.defineProperty(target, key, r), r;
      };
      var __decorate$2 = (this && this.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    `;
    const output = tags.stripIndent`
      import { __decorate as __decorate$1 } from "tslib";
      import { __decorate as __decorate$2 } from "tslib";
    `;

    expect(testImportTslib(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('replaces multiple __decorate in CJS modules', () => {
    // tslint:disable:max-line-length
    const input = tags.stripIndent`
      var __decorate$1 = (this && this.__decorate) || function (decorators, target, key, desc) {
          var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
          if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
          else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
          return c > 3 && r && Object.defineProperty(target, key, r), r;
      };
      var __decorate$2 = (this && this.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
      };

      exports.meaning = 42;
    `;
    const output = tags.stripIndent`
      var __decorate$1 = /*@__PURE__*/ require("tslib").__decorate;
      var __decorate$2 = /*@__PURE__*/ require("tslib").__decorate;

      exports.meaning = 42;
    `;

    expect(testImportTslib(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('replaces __metadata', () => {
    const input = tags.stripIndent`
      var __metadata = (this && this.__metadata) || function (k, v) {
          if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
      };
    `;
    const output = tags.stripIndent`
      import { __metadata } from "tslib";
    `;

    expect(testImportTslib(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('replaces __param', () => {
    const input = tags.stripIndent`
      var __param = (this && this.__param) || function (paramIndex, decorator) {
          return function (target, key) { decorator(target, key, paramIndex); }
      };
    `;

    const output = tags.stripIndent`
      import { __param } from "tslib";
    `;

    expect(testImportTslib(input)).toBeTruthy();
    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('replaces uses "require" instead of "import" on CJS modules', () => {
    const input = tags.stripIndent`
      var __extends = (this && this.__extends) || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
          function __() { this.constructor = d; }
          d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
      exports.meaning = 42;
    `;
    const output = tags.stripIndent`
      var __extends = /*@__PURE__*/ require("tslib").__extends;
      exports.meaning = 42;
    `;

    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

});
