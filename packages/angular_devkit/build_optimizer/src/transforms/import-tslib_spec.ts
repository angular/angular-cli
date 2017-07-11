import { oneLine, stripIndent } from 'common-tags';

import { transformJavascript } from '../helpers/transform-javascript';
import { getImportTslibTransformer } from './import-tslib';


const transform = (content: string) => transformJavascript(
  { content, getTransforms: [getImportTslibTransformer] }).content;

describe('import-tslib', () => {
  it('replaces __extends with', () => {
    const input = stripIndent`
      var __extends = (this && this.__extends) || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    `;
    const output = stripIndent`
      import { __extends } from "tslib";
    `;

    expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
  });

  it('replaces __decorate with', () => {
    // tslint:disable:max-line-length
    const input = stripIndent`
      var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
          var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
          if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
          else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
          return c > 3 && r && Object.defineProperty(target, key, r), r;
      };
    `;
    // tslint:enable:max-line-length
    const output = stripIndent`
      import { __decorate } from "tslib";
    `;

    expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
  });

  it('replaces __metadata with', () => {
    // tslint:disable:max-line-length
    const input = stripIndent`
      var __metadata = (this && this.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
      };
    `;
    // tslint:enable:max-line-length
    const output = stripIndent`
      import { __metadata } from "tslib";
    `;

    expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
  });

  it('replaces __param with', () => {
    const input = stripIndent`
      var __param = (this && this.__param) || function (paramIndex, decorator) {
          return function (target, key) { decorator(target, key, paramIndex); }
      };
    `;

    const output = stripIndent`
      import { __param } from "tslib";
    `;

    expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
  });

  it('replaces uses "require" instead of "import" on CJS modules', () => {
    const input = stripIndent`
      var __extends = (this && this.__extends) || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
      exports.meaning = 42;
    `;
    const output = stripIndent`
      var __extends = /*@__PURE__*/ require("tslib").__extends;
      exports.meaning = 42;
    `;

    expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
  });
});
