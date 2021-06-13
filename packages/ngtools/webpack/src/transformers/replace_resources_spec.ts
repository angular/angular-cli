/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import * as ts from 'typescript';
import { replaceResources } from './replace_resources';
import { createTypescriptContext, transformTypescript } from './spec_helpers';

function transform(
  input: string,
  shouldTransform = true,
  directTemplateLoading = true,
  importHelpers = true,
  module: ts.ModuleKind = ts.ModuleKind.ES2020,
  inlineStyleMimeType?: string,
) {
  const { program, compilerHost } = createTypescriptContext(input, undefined, undefined, {
    importHelpers,
    module,
  });
  const getTypeChecker = () => program.getTypeChecker();
  const transformer = replaceResources(
    () => shouldTransform,
    getTypeChecker,
    directTemplateLoading,
    inlineStyleMimeType,
  );

  return transformTypescript(input, [transformer], program, compilerHost);
}

describe('@ngtools/webpack transformers', () => {
  /* eslint-disable max-len */
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
        import { __decorate } from "tslib";
        import __NG_CLI_RESOURCE__0 from "!raw-loader!./app.component.html";
        import __NG_CLI_RESOURCE__1 from "./app.component.css";
        import __NG_CLI_RESOURCE__2 from "./app.component.2.css";
        import { Component } from '@angular/core';

        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = __decorate([
            Component({
                selector: 'app-root',
                template: __NG_CLI_RESOURCE__0,
                styles: [__NG_CLI_RESOURCE__1, __NG_CLI_RESOURCE__2]
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const result = transform(input);
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should replace resources with `require()` when module is CommonJs', () => {
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
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });

        exports.AppComponent = void 0;
        const tslib_1 = require("tslib");
        const core_1 = require("@angular/core");
        let AppComponent = class AppComponent {
          constructor() { this.title = 'app'; }
        };
        AppComponent = tslib_1.__decorate([
          core_1.Component({
            selector: 'app-root',
            template: require("!raw-loader!./app.component.html").default,
            styles: [require("./app.component.css").default, require("./app.component.2.css").default] }) ], AppComponent);
        exports.AppComponent = AppComponent;
      `;

      const result = transform(input, true, true, true, ts.ModuleKind.CommonJS);
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
          import { __decorate } from "tslib";
          import __NG_CLI_RESOURCE__0 from "./app.component.html";
          import __NG_CLI_RESOURCE__1 from "./app.component.css";
          import __NG_CLI_RESOURCE__2 from "./app.component.2.css";
          import { Component } from '@angular/core';
          let AppComponent = class AppComponent {
              constructor() {
                  this.title = 'app';
              }
          };
          AppComponent = __decorate([
              Component({
                  selector: 'app-root',
                  template: __NG_CLI_RESOURCE__0,
                  styles: [__NG_CLI_RESOURCE__1, __NG_CLI_RESOURCE__2]
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
        import { __decorate } from "tslib";
        import __NG_CLI_RESOURCE__0 from "!raw-loader!./app.component.svg";
        import { Component } from '@angular/core';
        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = __decorate([
            Component({
                selector: 'app-root',
                template: __NG_CLI_RESOURCE__0
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
        import { __decorate } from "tslib";
        import __NG_CLI_RESOURCE__0 from "!raw-loader!./app.component.html";
        import __NG_CLI_RESOURCE__1 from "./app.component.css";
        import { Component } from '@angular/core';

        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = __decorate([
            Component({
                selector: 'app-root',
                template: __NG_CLI_RESOURCE__0,
                styles: ["a { color: red }", __NG_CLI_RESOURCE__1]
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const result = transform(input);
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should create data URIs for inline styles when inlineStyleMimeType is set', () => {
      const input = tags.stripIndent`
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styles: ['a { color: red }'],
        })
        export class AppComponent {
          title = 'app';
        }
      `;
      const output = tags.stripIndent`
        import { __decorate } from "tslib";
        import __NG_CLI_RESOURCE__0 from "!raw-loader!./app.component.html";
        import __NG_CLI_RESOURCE__1 from "data:text/css;charset=utf-8;base64,YSB7IGNvbG9yOiByZWQgfQ==";
        import { Component } from '@angular/core';

        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = __decorate([
            Component({
                selector: 'app-root',
                template: __NG_CLI_RESOURCE__0,
                styles: [__NG_CLI_RESOURCE__1]
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const result = transform(input, true, true, true, ts.ModuleKind.ESNext, 'text/css');
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should throw error if inlineStyleMimeType value has invalid format', () => {
      expect(() =>
        transform('', true, true, true, ts.ModuleKind.ESNext, 'asdfsd;sdfsd//sdfsdf'),
      ).toThrowError('Invalid inline style MIME type.');
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
        import { __decorate } from "tslib";
        import __NG_CLI_RESOURCE__0 from "!raw-loader!./app.component.html";
        import __NG_CLI_RESOURCE__1 from "./app.component.css";
        import __NG_CLI_RESOURCE__2 from "./app.component.2.css";

        import { Component } from '@angular/core';
        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = __decorate([
            Component({
                selector: 'app-root',
                template: __NG_CLI_RESOURCE__0,
                styles: [__NG_CLI_RESOURCE__1, __NG_CLI_RESOURCE__2]
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
        import { __decorate } from "tslib";
        import __NG_CLI_RESOURCE__0 from "!raw-loader!./app.component.html";
        import __NG_CLI_RESOURCE__1 from "./app.component.css";
        import __NG_CLI_RESOURCE__2 from "./app.component.2.css";
        import { Component as NgComponent } from '@angular/core';

        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = __decorate([
          NgComponent({
                selector: 'app-root',
                template: __NG_CLI_RESOURCE__0,
                styles: [__NG_CLI_RESOURCE__1, __NG_CLI_RESOURCE__2]
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
        import { __decorate } from "tslib";
        import __NG_CLI_RESOURCE__0 from "!raw-loader!./app.component.html";
        import __NG_CLI_RESOURCE__1 from "./app.component.css";
        import __NG_CLI_RESOURCE__2 from "./app.component.2.css";

        import * as ng from '@angular/core';
        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = __decorate([
          ng.Component({
                selector: 'app-root',
                template: __NG_CLI_RESOURCE__0,
                styles: [__NG_CLI_RESOURCE__1, __NG_CLI_RESOURCE__2]
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
        import { __decorate } from "tslib";
        import __NG_CLI_RESOURCE__0 from "!raw-loader!./app.component.html";
        import __NG_CLI_RESOURCE__1 from "./app.component.css";

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

        AppComponent = __decorate([
            Component({
                selector: 'app-root',
                template: __NG_CLI_RESOURCE__0,
                styles: [__NG_CLI_RESOURCE__1]
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
        import { __decorate } from "tslib";
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

        AppComponent = __decorate([
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
        import { __decorate } from "tslib";
        import { Component } from '@angular/core';
        let AppComponent = class AppComponent {
            constructor() {
                this.title = 'app';
            }
        };
        AppComponent = __decorate([
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
