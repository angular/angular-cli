/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

/**
 * Fixture application with a server entry point and four lazy routes.
 * Four lazy chunks exceed the default chunk optimization threshold (3),
 * so the optimization pass runs without requiring the
 * `NG_BUILD_OPTIMIZE_CHUNKS` environment variable (which is captured at
 * module load time and cannot be toggled per spec).
 *
 * `shared.ts` is imported statically by both `main.ts` and two of the lazy
 * components. esbuild emits such modules as a separate `chunk-*.js` shared
 * chunk, while the chunk optimizer merges entry-reachable modules back into
 * the main chunk. The absence of `chunk-*.js` files is therefore used as a
 * signal that the optimization pass actually ran.
 */
const LAZY_ROUTE_NAMES = ['lazy-a', 'lazy-b', 'lazy-c', 'lazy-d'] as const;

function lazyComponentSource(name: string, useShared: boolean): string {
  const className = name.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase());

  return `
    import { Component } from '@angular/core';
    ${useShared ? `import { sharedValue } from '../shared';` : ''}

    @Component({
      selector: 'app-${name}',
      template: '<p>${name} works! ${useShared ? '{{ shared }}' : ''}</p>',
    })
    export default class ${className}Component {
      ${useShared ? `shared = sharedValue();` : ''}
    }
  `;
}

const serverLazyRoutesFiles: Record<string, string> = {
  'src/shared.ts': `
    export function sharedValue(): string {
      return 'shared-' + Date.now().toString(36);
    }
  `,
  'src/app/app.routes.ts': `
    import { Routes } from '@angular/router';

    export const routes: Routes = [
      ${LAZY_ROUTE_NAMES.map(
        (name) => `{ path: '${name}', loadComponent: () => import('./${name}.component') },`,
      ).join('\n      ')}
    ];
  `,
  ...Object.fromEntries(
    LAZY_ROUTE_NAMES.map((name, index) => [
      `src/app/${name}.component.ts`,
      lazyComponentSource(name, index < 2),
    ]),
  ),
  'src/app/app.component.ts': `
    import { Component } from '@angular/core';
    import { RouterOutlet } from '@angular/router';
    import { sharedValue } from '../shared';

    @Component({
      selector: 'app-root',
      imports: [RouterOutlet],
      template: '<p>{{ shared }}</p><router-outlet></router-outlet>',
    })
    export class AppComponent {
      shared = sharedValue();
    }
  `,
  'src/app/app.config.ts': `
    import { ApplicationConfig } from '@angular/core';
    import { provideRouter } from '@angular/router';
    import { routes } from './app.routes';

    export const appConfig: ApplicationConfig = {
      providers: [provideRouter(routes)],
    };
  `,
  'src/main.ts': `
    import { bootstrapApplication } from '@angular/platform-browser';
    import { AppComponent } from './app/app.component';
    import { appConfig } from './app/app.config';

    bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
  `,
  'src/main.server.ts': `
    import { mergeApplicationConfig } from '@angular/core';
    import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
    import { provideServerRendering } from '@angular/platform-server';
    import { AppComponent } from './app/app.component';
    import { appConfig } from './app/app.config';

    const serverConfig = mergeApplicationConfig(appConfig, {
      providers: [provideServerRendering()],
    });

    const bootstrap = (context: BootstrapContext) =>
      bootstrapApplication(AppComponent, serverConfig, context);

    export default bootstrap;
  `,
};

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Chunk optimization with a server entry point"', () => {
    beforeEach(async () => {
      await harness.modifyFile('src/tsconfig.app.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.files ??= [];
        tsConfig.files.push('main.server.ts');

        return JSON.stringify(tsConfig);
      });

      await harness.writeFiles(serverLazyRoutesFiles);
    });

    it('generates a server manifest consistent with the optimized browser chunks', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        ssr: true,
        polyfills: ['zone.js'],
        optimization: true,
        // Name lazy chunks after their route entry points so that only shared
        // chunks use the `chunk-` prefix, which the assertions below rely on.
        namedChunks: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // The chunk optimizer merges entry-reachable shared modules back into the
      // main chunk. A remaining `chunk-*.js` shared chunk indicates the
      // optimization pass did not run and this test would be vacuous.
      expect(harness.hasFileMatch('dist/browser', /^chunk-/)).toBeFalse();

      const manifestContent = harness.readFile('dist/server/angular-app-manifest.mjs');
      const mappingSource = /entryPointToBrowserMapping: (\{[\s\S]*?\n\})/.exec(manifestContent);
      expect(mappingSource)
        .withContext('entryPointToBrowserMapping should be present in the server manifest')
        .not.toBeNull();

      const mapping = JSON.parse(mappingSource![1]) as Record<string, string[]>;

      // Every lazy route entry point must retain a mapping entry after optimization.
      for (const name of LAZY_ROUTE_NAMES) {
        const key = Object.keys(mapping).find((entryPoint) =>
          entryPoint.endsWith(`${name}.component.ts`),
        );
        expect(key)
          .withContext(`mapping entry for lazy route '${name}' should exist`)
          .toBeDefined();
      }

      // Every browser file referenced by the mapping must exist on disk.
      for (const files of Object.values(mapping)) {
        for (const file of files) {
          expect(harness.hasFile(`dist/browser/${file}`))
            .withContext(`mapped browser file '${file}' should exist`)
            .toBeTrue();
        }
      }

      // All scripts referenced by the index HTML must exist on disk.
      const indexContent = harness.readFile('dist/browser/index.csr.html');
      const scriptRefs = [
        ...indexContent.matchAll(/<(?:script src|link rel="modulepreload" href)="([^"]+)"/g),
      ].map((match) => match[1]);
      expect(scriptRefs.length).toBeGreaterThan(0);
      for (const file of scriptRefs) {
        expect(harness.hasFile(`dist/browser/${file}`))
          .withContext(`index.html referenced file '${file}' should exist`)
          .toBeTrue();
      }
    });
  });
});
