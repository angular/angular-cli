/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { tags } from '@angular-devkit/core';
import * as ts from 'typescript';
import { replaceResources } from './replace_resources';
import { createTypescriptContext, transformTypescript } from './spec_helpers';

function transform(
  input: string,
  shouldTransform = true,
  importHelpers = true,
  module: ts.ModuleKind = ts.ModuleKind.ES2020,
) {
  const { program, compilerHost } = createTypescriptContext(input, undefined, undefined, {
    importHelpers,
    module,
  });
  const getTypeChecker = () => program.getTypeChecker();
  const transformer = replaceResources(() => shouldTransform, getTypeChecker);

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
        import __NG_CLI_RESOURCE__0 from "./app.component.html?ngResource";
        import __NG_CLI_RESOURCE__1 from "./app.component.css?ngResource";
        import __NG_CLI_RESOURCE__2 from "./app.component.2.css?ngResource";
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
        exports.AppComponent = AppComponent;
        exports.AppComponent = AppComponent = tslib_1.__decorate([
          (0, core_1.Component)({
            selector: 'app-root',
            template: require("./app.component.html?ngResource"),
            styles: [require("./app.component.css?ngResource"), require("./app.component.2.css?ngResource")] }) ], AppComponent);
      `;

      const result = transform(input, true, true, ts.ModuleKind.CommonJS);
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should support svg as templates', () => {
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
        import __NG_CLI_RESOURCE__0 from "./app.component.svg?ngResource";
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
        import __NG_CLI_RESOURCE__0 from "./app.component.html?ngResource";
        import __NG_CLI_RESOURCE__1 from "./app.component.css?ngResource";
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
        import __NG_CLI_RESOURCE__0 from "./app.component.html?ngResource";
        import __NG_CLI_RESOURCE__1 from "./app.component.css?ngResource";
        import __NG_CLI_RESOURCE__2 from "./app.component.2.css?ngResource";

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
        import __NG_CLI_RESOURCE__0 from "./app.component.html?ngResource";
        import __NG_CLI_RESOURCE__1 from "./app.component.css?ngResource";
        import __NG_CLI_RESOURCE__2 from "./app.component.2.css?ngResource";
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
      const transformer = replaceResources(() => true, getTypeChecker);
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
        import __NG_CLI_RESOURCE__0 from "./app.component.html?ngResource";
        import __NG_CLI_RESOURCE__1 from "./app.component.css?ngResource";
        import __NG_CLI_RESOURCE__2 from "./app.component.2.css?ngResource";

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

    it('should replace resources specified as string literals', () => {
      const input = tags.stripIndent`
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styles: 'h2 {font-size: 10px}',
          styleUrl: './app.component.css'
        })
        export class AppComponent {
          title = 'app';
        }
      `;
      const output = tags.stripIndent`
        import { __decorate } from "tslib";
        import __NG_CLI_RESOURCE__0 from "./app.component.html?ngResource";
        import __NG_CLI_RESOURCE__1 from "./app.component.css?ngResource";
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
                styles: ["h2 {font-size: 10px}", __NG_CLI_RESOURCE__1]
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
        import __NG_CLI_RESOURCE__0 from "./app.component.html?ngResource";
        import __NG_CLI_RESOURCE__1 from "./app.component.css?ngResource";

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
