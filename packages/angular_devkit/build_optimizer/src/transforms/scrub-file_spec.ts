/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';
import { transformJavascript } from '../helpers/transform-javascript';
import { getScrubFileTransformer, testScrubFile } from './scrub-file';


const transform = (content: string) => transformJavascript(
  { content, getTransforms: [getScrubFileTransformer] }).content;

describe('scrub-file', () => {
  const clazz = 'var Clazz = (function () { function Clazz() { } return Clazz; }());';

  describe('decorators', () => {
    it('removes top-level Angular decorators', () => {
      const output = tags.stripIndent`
        import { Injectable } from '@angular/core';
        ${clazz}
      `;
      const input = tags.stripIndent`
        ${output}
        Clazz.decorators = [ { type: Injectable } ];
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes nested Angular decorators', () => {
      const output = tags.stripIndent`
        import { Injectable } from '@angular/core';
        var Clazz = (function () {
          function Clazz() { }
          return Clazz;
        }());
      `;
      const input = tags.stripIndent`
        import { Injectable } from '@angular/core';
        var Clazz = (function () {
          function Clazz() {}
          Clazz.decorators = [ { type: Injectable } ];
          return Clazz;
        }());
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('doesn\'t remove non Angular decorators', () => {
      const input = tags.stripIndent`
        import { Injectable } from 'another-lib';
        ${clazz}
        Clazz.decorators = [{ type: Injectable }];
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${input}`);
    });

    it('leaves non-Angular decorators in mixed arrays', () => {
      const input = tags.stripIndent`
        import { Injectable } from '@angular/core';
        import { NotInjectable } from 'another-lib';
        ${clazz}
        Clazz.decorators = [{ type: Injectable }, { type: NotInjectable }];
      `;
      const output = tags.stripIndent`
        import { Injectable } from '@angular/core';
        import { NotInjectable } from 'another-lib';
        ${clazz}
        Clazz.decorators = [{ type: NotInjectable }];
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });
  });

  describe('__decorate', () => {
    it('removes Angular decorators calls in __decorate', () => {
      const output = tags.stripIndent`
        import { Component, Injectable } from '@angular/core';
        var Clazz = (function () {
          function Clazz() { }
          return Clazz;
        }());
      `;
      const input = tags.stripIndent`
        import { Component, Injectable } from '@angular/core';
        var Clazz = (function () {
          function Clazz() { }
          Clazz = __decorate([
            Injectable(),
            Component({
              selector: 'app-root',
              templateUrl: './app.component.html',
              styleUrls: ['./app.component.css']
            })
          ], Clazz);
          return Clazz;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes only Angular decorators calls in __decorate', () => {
      const output = tags.stripIndent`
        import { Component } from '@angular/core';
        import { NotComponent } from 'another-lib';
        var Clazz = (function () {
          function Clazz() { }
          Clazz = __decorate([
            NotComponent()
          ], Clazz);
          return Clazz;
        }());
      `;
      const input = tags.stripIndent`
        import { Component } from '@angular/core';
        import { NotComponent } from 'another-lib';
        var Clazz = (function () {
          function Clazz() { }
          Clazz = __decorate([
            NotComponent(),
            Component({
              selector: 'app-root',
              templateUrl: './app.component.html',
              styleUrls: ['./app.component.css']
            })
          ], Clazz);
          return Clazz;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('recognizes tslib as well', () => {
      const input = tags.stripIndent`
        import { Component } from '@angular/core';
        import { NotComponent } from 'another-lib';
        var Clazz = (function () {
          function Clazz() { }
          Clazz = tslib.__decorate([
            NotComponent(),
            Component({
              selector: 'app-root',
              templateUrl: './app.component.html',
              styleUrls: ['./app.component.css']
            })
          ], Clazz);
          return Clazz;
        }());

        var Clazz2 = (function () {
          function Clazz2() { }
          Clazz2 = tslib_2.__decorate([
            NotComponent(),
            Component({
              selector: 'app-root',
              templateUrl: './app.component.html',
              styleUrls: ['./app.component.css']
            })
          ], Clazz2);
          return Clazz2;
        }());
      `;
      const output = tags.stripIndent`
        import { Component } from '@angular/core';
        import { NotComponent } from 'another-lib';
        var Clazz = (function () {
          function Clazz() { }
          Clazz = tslib.__decorate([
            NotComponent()
          ], Clazz);
          return Clazz;
        }());

        var Clazz2 = (function () {
          function Clazz2() { }
          Clazz2 = tslib_2.__decorate([
            NotComponent()
          ], Clazz2);
          return Clazz2;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });
  });

  describe('propDecorators', () => {
    it('removes top-level Angular propDecorators', () => {
      const output = tags.stripIndent`
        import { Input } from '@angular/core';
        ${clazz}
      `;
      const input = tags.stripIndent`
        ${output}
        Clazz.propDecorators = { 'ngIf': [{ type: Input }] }
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes nested Angular propDecorators', () => {
      const output = tags.stripIndent`
        import { Input } from '@angular/core';
        var Clazz = (function () {
          function Clazz() { }
          return Clazz;
        }());
      `;
      const input = tags.stripIndent`
        import { Input } from '@angular/core';
        var Clazz = (function () {
          function Clazz() {}
          Clazz.propDecorators = { 'ngIf': [{ type: Input }] };
          return Clazz;
        }());
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('doesn\'t remove non Angular propDecorators', () => {
      const input = tags.stripIndent`
        import { Input } from 'another-lib';
        ${clazz}
        Clazz.propDecorators = { 'ngIf': [{ type: Input }] };
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${input}`);
    });

    it('leaves non-Angular propDecorators in mixed arrays', () => {
      const output = tags.stripIndent`
        import { Input } from '@angular/core';
        import { NotInput } from 'another-lib';
        ${clazz}
        Clazz.propDecorators = {
          'notNgIf': [{ type: NotInput }]
        };
      `;
      const input = tags.stripIndent`
        import { Input } from '@angular/core';
        import { NotInput } from 'another-lib';
        ${clazz}
        Clazz.propDecorators = {
          'ngIf': [{ type: Input }],
          'notNgIf': [{ type: NotInput }]
        };
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });
  });

  describe('ctorParameters', () => {
    it('removes empty constructor parameters', () => {
      const output = tags.stripIndent`
        ${clazz}
      `;
      const input = tags.stripIndent`
        ${output}
        Clazz.ctorParameters = function () { return []; };
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes non-empty top-level style constructor parameters', () => {
      const output = tags.stripIndent`
        ${clazz}
      `;
      const input = tags.stripIndent`
        ${clazz}
        Clazz.ctorParameters = function () { return [{type: Injector}]; };
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });


    it('removes top-level Angular constructor parameters in es2015', () => {
      const output = tags.stripIndent`
        class Clazz extends BaseClazz { constructor(e) { super(e); } }
      `;
      const input = tags.stripIndent`
        ${output}
        Clazz.ctorParameters = () => [ { type: Injectable } ];
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes nested constructor parameters', () => {
      const output = tags.stripIndent`
        import { Injector } from '@angular/core';
        var Clazz = (function () {
          function Clazz() { }
          return Clazz;
        }());
      `;
      const input = tags.stripIndent`
        import { Injector } from '@angular/core';
        var Clazz = (function () {
          function Clazz() {}
          Clazz.ctorParameters = function () { return [{type: Injector}]; };
          return Clazz;
        }());
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('doesn\'t remove constructor parameters from whitelisted classes', () => {
      const input = tags.stripIndent`
        ${clazz.replace('Clazz', 'PlatformRef_')}
        PlatformRef_.ctorParameters = function () { return []; };
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${input}`);
    });
  });
});
