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
import { replaceServerBootstrap } from './replace_server_bootstrap';

describe('@ngtools/webpack transformers', () => {
  describe('replace_server_bootstrap', () => {
    it('should replace bootstrap', () => {
      const input = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { platformDynamicServer } from '@angular/platform-server';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        if (environment.production) {
          enableProdMode();
        }

        platformDynamicServer().bootstrapModule(AppModule);
      `;

      const output = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { environment } from './environments/environment';

        import * as __NgCli_bootstrap_1 from "./app/app.module.ngfactory";
        import * as __NgCli_bootstrap_2 from "@angular/platform-server";

        if (environment.production) {
          enableProdMode();
        }
        __NgCli_bootstrap_2.platformServer().bootstrapModuleFactory(__NgCli_bootstrap_1.AppModuleNgFactory);
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = replaceServerBootstrap(
        () => true,
        () => ({ path: '/project/src/app/app.module', className: 'AppModule' }),
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should replace renderModule', () => {
      const input = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { renderModule } from '@angular/platform-server';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        if (environment.production) {
          enableProdMode();
        }

        renderModule(AppModule, {
          document: '<app-root></app-root>',
          url: '/'
        });
      `;

      const output = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { environment } from './environments/environment';

        import * as __NgCli_bootstrap_1 from "./app/app.module.ngfactory";
        import * as __NgCli_bootstrap_2 from "@angular/platform-server";

        if (environment.production) {
          enableProdMode();
        }
        __NgCli_bootstrap_2.renderModuleFactory(__NgCli_bootstrap_1.AppModuleNgFactory, {
            document: '<app-root></app-root>',
            url: '/'
          });
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = replaceServerBootstrap(
        () => true,
        () => ({ path: '/project/src/app/app.module', className: 'AppModule' }),
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should replace when the module is used in a config object', () => {
      const input = tags.stripIndent`
        import * as express from 'express';

        import { enableProdMode } from '@angular/core';
        import { ngExpressEngine } from '@nguniversal/express-engine';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        if (environment.production) {
          enableProdMode();
        }

        const server = express();
        server.engine('html', ngExpressEngine({
          bootstrap: AppModule
        }));
      `;

      const output = tags.stripIndent`
        import * as express from 'express';

        import { enableProdMode } from '@angular/core';
        import { ngExpressEngine } from '@nguniversal/express-engine';

        import { environment } from './environments/environment';

        import * as __NgCli_bootstrap_1 from "./app/app.module.ngfactory";

        if (environment.production) {
          enableProdMode();
        }

        const server = express();
        server.engine('html', ngExpressEngine({
          bootstrap: __NgCli_bootstrap_1.AppModuleNgFactory
        }));
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = replaceServerBootstrap(
        () => true,
        () => ({ path: '/project/src/app/app.module', className: 'AppModule' }),
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should replace bootstrap when barrel files are used', () => {
      const input = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { platformDynamicServer } from '@angular/platform-browser-dynamic';

        import { AppModule } from './app';
        import { environment } from './environments/environment';

        if (environment.production) {
          enableProdMode();
        }

        platformDynamicServer().bootstrapModule(AppModule);
      `;

      const output = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { environment } from './environments/environment';

        import * as __NgCli_bootstrap_1 from "./app/app.module.ngfactory";
        import * as __NgCli_bootstrap_2 from "@angular/platform-server";

        if (environment.production) {
          enableProdMode();
        }
        __NgCli_bootstrap_2.platformServer().bootstrapModuleFactory(__NgCli_bootstrap_1.AppModuleNgFactory);
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = replaceServerBootstrap(
        () => true,
        () => ({ path: '/project/src/app/app.module', className: 'AppModule' }),
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should not replace bootstrap when there is no entry module', () => {
      const input = tags.stripIndent`
        import { enableProdMode } from '@angular/core';
        import { platformDynamicServer } from '@angular/platform-browser-dynamic';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        if (environment.production) {
          enableProdMode();
        }

        platformDynamicServer().bootstrapModule(AppModule);
      `;

      const { program, compilerHost } = createTypescriptContext(input);
      const transformer = replaceServerBootstrap(
        () => true,
        () => null,
        () => program.getTypeChecker(),
      );
      const result = transformTypescript(undefined, [transformer], program, compilerHost);

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${input}`);
    });
  });
});
