/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import * as ts from 'typescript';
import { findResources } from './find_resources';


describe('@ngtools/webpack transformers', () => {
  describe('find_resources', () => {
    it('should return resources', () => {
      const input = tags.stripIndent`
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css', './app.component.2.css']
        })
        export class AppComponent {
          title = 'app';
        }
      `;

      const result = findResources(ts.createSourceFile('temp.ts', input, ts.ScriptTarget.ES2015));
      expect(result).toEqual([
        './app.component.html',
        './app.component.css',
        './app.component.2.css',
      ]);
    });

    it('should not return resources if they are not in decorator', () => {
      const input = tags.stripIndent`
        const foo = {
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css', './app.component.2.css']
        }
      `;

      const result = findResources(ts.createSourceFile('temp.ts', input, ts.ScriptTarget.ES2015));
      expect(result).toEqual([]);
    });
  });
});
