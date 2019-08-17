/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import { createTypescriptContext, transformTypescript } from './ast_helpers';
import { replaceResources } from './replace_resources';

function transform(
  input: string,
  shouldTransform = true,
  directTemplateLoading = true,
  importHelpers = true,
) {
  const { program, compilerHost } =
    createTypescriptContext(input, undefined, undefined, importHelpers);
  const getTypeChecker = () => program.getTypeChecker();
  const transformer = replaceResources(
    () => shouldTransform, getTypeChecker, directTemplateLoading);

  return transformTypescript(input, [transformer], program, compilerHost);
}

// tslint:disable-next-line:no-big-function
describe('@ngtools/webpack transformers', () => {
  // tslint:disable:max-line-length
  // tslint:disable-next-line:no-big-function
  describe('find_resources', () => {
    it('should replace resources', () => {
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
      const output = tags.stripIndent`
        import * as tslib_1 from "tslib";
        import { Component } from '@angular/core';
        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = tslib_1.__decorate([
            Component({
                selector: 'app-root',
                template: tslib_1.__importDefault(require("!raw-loader!./app.component.html")).default,
                styles: [tslib_1.__importDefault(require("./app.component.css")).default, tslib_1.__importDefault(require("./app.component.2.css")).default]
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const result = transform(input);
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it(`should replace resources and add helper when 'importHelpers' is false`, () => {
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
      const output = tags.stripIndent`
        var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) { var c = arguments.length, r = c < 3 ? target : desc === null
        ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d; if (typeof Reflect === "object"
        && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--)
        if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r; return c > 3 && r && Object.defineProperty(target, key, r), r; };

        var __importDefault = (this && this.__importDefault) || function (mod) { return (mod && mod.__esModule) ? mod : { "default": mod }; };

        import { Component } from '@angular/core';

        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = __decorate([
            Component({
                selector: 'app-root',
                template: __importDefault(require("!raw-loader!./app.component.html")).default,
                styles: [__importDefault(require("./app.component.css")).default, __importDefault(require("./app.component.2.css")).default]
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const result = transform(input, undefined, undefined, false);
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not replace resources when directTemplateLoading is false', () => {
        const input = tags.stripIndent`
          import { Component } from '@angular/core';

          @Component({
            selector: 'app-root',
            templateUrl: './app.component.html',
            styleUrls: [
              './app.component.css',
              './app.component.2.css'
            ]
          })
          export class AppComponent {
            title = 'app';
          }
        `;
        const output = tags.stripIndent`
          import * as tslib_1 from "tslib";
          import { Component } from '@angular/core';
          let AppComponent = class AppComponent {
              constructor() {
                  this.title = 'app';
              }
          };
          AppComponent = tslib_1.__decorate([
              Component({
                  selector: 'app-root',
                  template: tslib_1.__importDefault(require("./app.component.html")).default,
                  styles: [tslib_1.__importDefault(require("./app.component.css")).default, tslib_1.__importDefault(require("./app.component.2.css")).default]
              })
          ], AppComponent);
          export { AppComponent };
        `;

        const result = transform(input, true, false);
        expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
      });


    it('should should support svg as templates', () => {
      const input = tags.stripIndent`
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.svg'
        })
        export class AppComponent {
          title = 'app';
        }
      `;
      const output = tags.stripIndent`
        import * as tslib_1 from "tslib";
        import { Component } from '@angular/core';
        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = tslib_1.__decorate([
            Component({
                selector: 'app-root',
                template: tslib_1.__importDefault(require("!raw-loader!./app.component.svg")).default
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const result = transform(input);
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should merge styleUrls with styles', () => {
      const input = tags.stripIndent`
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styles: ['a { color: red }'],
          styleUrls: ['./app.component.css'],
        })
        export class AppComponent {
          title = 'app';
        }
      `;
      const output = tags.stripIndent`
        import * as tslib_1 from "tslib";
        import { Component } from '@angular/core';
        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = tslib_1.__decorate([
            Component({
                selector: 'app-root',
                template: tslib_1.__importDefault(require("!raw-loader!./app.component.html")).default,
                styles: ["a { color: red }", tslib_1.__importDefault(require("./app.component.css")).default]
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const result = transform(input);
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should replace resources with backticks', () => {
      const input = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: \`./app.component.html\`,
          styleUrls: [\`./app.component.css\`, \`./app.component.2.css\`]
        })
        export class AppComponent {
          title = 'app';
        }
      `;
      const output = `
        import * as tslib_1 from "tslib";
        import { Component } from '@angular/core';
        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = tslib_1.__decorate([
            Component({
                selector: 'app-root',
                template: tslib_1.__importDefault(require("!raw-loader!./app.component.html")).default,
                styles: [tslib_1.__importDefault(require("./app.component.css")).default, tslib_1.__importDefault(require("./app.component.2.css")).default]
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const result = transform(input);
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should replace resources if Component decorator is aliased', () => {
      const input = tags.stripIndent`
        import { Component as NgComponent } from '@angular/core';

        @NgComponent({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css', './app.component.2.css']
        })
        export class AppComponent {
          title = 'app';
        }
      `;
      const output = tags.stripIndent`
        import * as tslib_1 from "tslib";
        import { Component as NgComponent } from '@angular/core';
        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = tslib_1.__decorate([
          NgComponent({
                selector: 'app-root',
                template: tslib_1.__importDefault(require("!raw-loader!./app.component.html")).default,
                styles: [tslib_1.__importDefault(require("./app.component.css")).default, tslib_1.__importDefault(require("./app.component.2.css")).default]
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const { program } = createTypescriptContext(input);
      const getTypeChecker = () => program.getTypeChecker();
      const transformer = replaceResources(() => true, getTypeChecker, true);
      const result = transformTypescript(input, [transformer]);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should replace resources if Angular Core import is namespaced', () => {
      const input = tags.stripIndent`
        import * as ng from '@angular/core';

        @ng.Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css', './app.component.2.css']
        })
        export class AppComponent {
          title = 'app';
        }
      `;
      const output = tags.stripIndent`
        import * as tslib_1 from "tslib";
        import * as ng from '@angular/core';
        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = tslib_1.__decorate([
          ng.Component({
                selector: 'app-root',
                template: tslib_1.__importDefault(require("!raw-loader!./app.component.html")).default,
                styles: [tslib_1.__importDefault(require("./app.component.css")).default, tslib_1.__importDefault(require("./app.component.2.css")).default]
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const result = transform(input);
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not replace resources if not in Component decorator', () => {
      const input = tags.stripIndent`
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css']
        })
        export class AppComponent {
          obj = [
            {
              'labels': 'Content',
              'templateUrl': 'content.html'
            }
          ];
        }
      `;

      const output = tags.stripIndent`
        import * as tslib_1 from "tslib";
        import { Component } from '@angular/core';

        let AppComponent = class AppComponent {
          constructor() {
            this.obj = [
              {
                'labels': 'Content',
                'templateUrl': 'content.html'
              }
            ];
          }
        };

        AppComponent = tslib_1.__decorate([
            Component({
                selector: 'app-root',
                template: tslib_1.__importDefault(require("!raw-loader!./app.component.html")).default,
                styles: [tslib_1.__importDefault(require("./app.component.css")).default]
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const result = transform(input);
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not replace resources if not in an NG Component decorator', () => {
      const input = tags.stripIndent`
        import { Component } from 'foo';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css']
        })
        export class AppComponent {
          obj = [
            {
              'labels': 'Content',
              'templateUrl': 'content.html'
            }
          ];
        }
      `;

      const output = tags.stripIndent`
        import * as tslib_1 from "tslib";
        import { Component } from 'foo';

        let AppComponent = class AppComponent {
          constructor() {
            this.obj = [
              {
                'labels': 'Content',
                'templateUrl': 'content.html'
              }
            ];
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

      const result = transform(input);
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not replace resources if shouldTransform returns false', () => {
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
      const output = `
        import * as tslib_1 from "tslib";
        import { Component } from '@angular/core';
        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = tslib_1.__decorate([
            Component({
                selector: 'app-root',
                templateUrl: './app.component.html',
                styleUrls: ['./app.component.css', './app.component.2.css']
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const result = transform(input, false);
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });
  });
});
