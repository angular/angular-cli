/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import { removeDecorators } from './remove_decorators';
import { createTypescriptContext, transformTypescript } from './spec_helpers';

describe('@ngtools/webpack transformers', () => {
  describe('remove_decorators', () => {
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
        import { __decorate } from "tslib";
        import { Component } from 'another-lib';
        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = __decorate([
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
        import { __decorate } from "tslib";
        import { AnotherDecorator } from 'another-lib';

        export class AppComponent {
          constructor() {
              this.title = 'app';
          }

          onEscape() {
            console.log('run');
          }
        }
        __decorate([
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
        import { __decorate } from "tslib";
        import { AnotherDecorator } from 'another-lib';

        let AppComponent = class AppComponent {
          constructor() {
              this.title = 'app';
          }
        };
        AppComponent = __decorate([
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

    it('should not prevent removal of unused imports', () => {
      // Note: this is actually testing the behaviour of `./elide_imports.ts`, but the problem
      // only came up when used together with `./remove_decorators.ts` so we test it here.
      // Originally reported as https://github.com/angular/angular-cli/issues/14617
      // The bug happened because `elideImports` would attempt to remove `BigDependency` and
      // in the process modify the import statement, which then prevented TS from removing it
      // the interface too.
      const input = tags.stripIndent`
        import {BigDependency, BigDependencyOptions} from 'src/app/lorem/big-dependency';
        import {Injectable} from '@angular/core';

        const bigDependencyLoader = () => import('../lorem/big-dependency');

        @Injectable({providedIn: 'root'})
        export class LoremService {
            load(options: BigDependencyOptions): Promise<any> {
                return bigDependencyLoader()
                  .then((m: {BigDependency}) => new m.BigDependency().setOptions(options));
            }
        }

      `;
      const output = tags.stripIndent`
        const bigDependencyLoader = () => import('../lorem/big-dependency');
        export class LoremService {
            load(options) {
                return bigDependencyLoader()
                    .then((m) => new m.BigDependency().setOptions(options));
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
  });
});
