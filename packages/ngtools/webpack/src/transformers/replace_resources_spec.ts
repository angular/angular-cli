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

function transform(input: string, shouldTransform = true, directTemplateLoading = true) {
  const { program } = createTypescriptContext(input);
  const getTypeChecker = () => program.getTypeChecker();
  const transformer = replaceResources(
    () => shouldTransform, getTypeChecker, directTemplateLoading);

  return transformTypescript(input, [transformer]);
}

// tslint:disable-next-line:no-big-function
describe('@ngtools/webpack transformers', () => {
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
                template: require("!raw-loader!./app.component.html"),
                styles: [require("./app.component.css"), require("./app.component.2.css")]
            })
        ], AppComponent);
        export { AppComponent };
      `;

      const result = transform(input);
      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not replace resources when directTemplateLoading is false', () => {
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
                  template: require("./app.component.html"),
                  styles: [require("./app.component.css"), require("./app.component.2.css")]
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
                template: require("!raw-loader!./app.component.svg")
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
                template: require("!raw-loader!./app.component.html"),
                styles: ["a { color: red }", require("./app.component.css")]
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
                template: require("!raw-loader!./app.component.html"),
                styles: [require("./app.component.css"), require("./app.component.2.css")]
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
                template: require("!raw-loader!./app.component.html"),
                styles: [require("./app.component.css"), require("./app.component.2.css")]
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
                template: require("!raw-loader!./app.component.html"),
                styles: [require("./app.component.css"), require("./app.component.2.css")]
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
                template: require("!raw-loader!./app.component.html"),
                styles: [require("./app.component.css")]
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
