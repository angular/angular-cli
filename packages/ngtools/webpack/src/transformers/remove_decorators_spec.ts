/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import { createTypescriptContext, transformTypescript } from './ast_helpers';
import { removeDecorators } from './remove_decorators';

describe('@ngtools/webpack transformers', () => {
  describe('decorator_remover', () => {
    it('should remove Angular decorators', () => {
      const input = tags.stripIndent`
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css']
        })
        export class AppComponent {
          title = 'app';
        }
      `;
      const output = tags.stripIndent`
        export class AppComponent {
          constructor() {
            this.title = 'app';
          }
        }
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = removeDecorators(
        () => true,
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not remove non-Angular decorators', () => {
      const input = tags.stripIndent`
        import { Component } from 'another-lib';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css']
        })
        export class AppComponent {
          title = 'app';
        }
      `;
      const output = `
        import * as tslib_1 from "tslib";
        import { Component } from 'another-lib';
        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = tslib_1.__decorate([
            Component({
                selector: 'app-root',
                templateUrl: './app.component.html',
                styleUrls: ['./app.component.css']
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = removeDecorators(
        () => true,
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should keep other decorators on class member', () => {
      const input = tags.stripIndent`
        import { Component, HostListener } from '@angular/core';
        import { AnotherDecorator } from 'another-lib';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css']
        })
        export class AppComponent {
          title = 'app';

          @HostListener('document:keydown.escape')
          @AnotherDecorator()
          onEscape() {
            console.log('run');
          }
        }
      `;
      const output = tags.stripIndent`
        import * as tslib_1 from "tslib";
        import { AnotherDecorator } from 'another-lib';

        export class AppComponent {
          constructor() {
              this.title = 'app';
          }

          onEscape() {
            console.log('run');
          }
        }
        tslib_1.__decorate([
          AnotherDecorator()
        ], AppComponent.prototype, "onEscape", null);
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = removeDecorators(
        () => true,
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should keep other decorators on class declaration', () => {
      const input = tags.stripIndent`
        import { Component } from '@angular/core';
        import { AnotherDecorator } from 'another-lib';

        @AnotherDecorator()
        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css']
        })
        export class AppComponent {
          title = 'app';
        }
      `;
      const output = tags.stripIndent`
        import * as tslib_1 from "tslib";
        import { AnotherDecorator } from 'another-lib';

        let AppComponent = class AppComponent {
          constructor() {
              this.title = 'app';
          }
        };
        AppComponent = tslib_1.__decorate([
          AnotherDecorator()
        ], AppComponent);
        export { AppComponent };
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = removeDecorators(
        () => true,
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should remove imports for identifiers within the decorator', () => {
      const input = tags.stripIndent`
        import { Component } from '@angular/core';
        import { ChangeDetectionStrategy } from '@angular/core';

        @Component({
          selector: 'app-root',
          changeDetection: ChangeDetectionStrategy.OnPush,
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css']
        })
        export class AppComponent {
          title = 'app';
        }
      `;
      const output = tags.stripIndent`
        export class AppComponent {
          constructor() {
            this.title = 'app';
          }
        }
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = removeDecorators(
        () => true,
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not remove imports from types that are still used', () => {
      const input = tags.stripIndent`
        import { Component, ChangeDetectionStrategy, EventEmitter } from '@angular/core';
        import { abc } from 'xyz';

        @Component({
          selector: 'app-root',
          changeDetection: ChangeDetectionStrategy.OnPush,
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css']
        })
        export class AppComponent {
          notify: EventEmitter<string> = new EventEmitter<string>();
          title = 'app';
          example = { abc };
        }

        export { ChangeDetectionStrategy };
      `;
      const output = tags.stripIndent`
        import { ChangeDetectionStrategy, EventEmitter } from '@angular/core';
        import { abc } from 'xyz';

        export class AppComponent {
          constructor() {
            this.notify = new EventEmitter();
            this.title = 'app';
            this.example = { abc };
          }
        }

        export { ChangeDetectionStrategy };
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = removeDecorators(
        () => true,
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });
  });
});
