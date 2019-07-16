/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function

import { Architect } from '@angular-devkit/architect';
import { logging, normalize, tags } from '@angular-devkit/core';
import { browserBuild, createArchitect, host } from '../utils';

describe('Browser Builder styles', () => {
  const extensionsWithImportSupport = ['css', 'scss', 'less', 'styl'];
  const extensionsWithVariableSupport = ['scss', 'less', 'styl'];
  const imgSvg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
    </svg>
  `;
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('supports global styles', async () => {
    const styles = [
      'src/input-style.css',
      { input: 'src/lazy-style.css', bundleName: 'lazy-style', inject: false },
      { input: 'src/pre-rename-style.css', bundleName: 'renamed-style' },
      { input: 'src/pre-rename-lazy-style.css', bundleName: 'renamed-lazy-style', inject: false },
    ] as {};
    const cssMatches: { [path: string]: string } = {
      'styles.css': '.input-style',
      'lazy-style.css': '.lazy-style',
      'renamed-style.css': '.pre-rename-style',
      'renamed-lazy-style.css': '.pre-rename-lazy-style',
    };
    const cssIndexMatches: { [path: string]: string } = {
      'index.html':
        '<link rel="stylesheet" href="styles.css">' +
        '<link rel="stylesheet" href="renamed-style.css">',
    };
    const jsMatches: { [path: string]: string } = {
      'styles.js': '.input-style',
      'lazy-style.js': '.lazy-style',
      'renamed-style.js': '.pre-rename-style',
      'renamed-lazy-style.js': '.pre-rename-lazy-style',
    };
    const jsIndexMatches: { [path: string]: string } = {
      'index.html':
        '<script src="runtime.js" defer></script>' +
        '<script src="polyfills.js" defer></script>' +
        '<script src="styles.js" defer></script>' +
        '<script src="renamed-style.js" defer></script>' +
        '<script src="vendor.js" defer></script>' +
        '<script src="main.js" defer></script>',
    };

    host.writeMultipleFiles({
      'src/string-style.css': '.string-style { color: red }',
      'src/input-style.css': '.input-style { color: red }',
      'src/lazy-style.css': '.lazy-style { color: red }',
      'src/pre-rename-style.css': '.pre-rename-style { color: red }',
      'src/pre-rename-lazy-style.css': '.pre-rename-lazy-style { color: red }',
    });

    let { files } = await browserBuild(architect, host, target, { extractCss: true, styles });
    // Check css files were created.
    for (const cssFileName of Object.keys(cssMatches)) {
      expect(await files[cssFileName]).toMatch(cssMatches[cssFileName]);
    }
    // Check no js files are created.
    for (const jsFileName of Object.keys(jsMatches)) {
      expect(jsFileName in files).toBe(false);
    }

    // Check check index has styles in the right order.
    for (const cssIndexFileName of Object.keys(cssIndexMatches)) {
      expect(await files[cssIndexFileName]).toMatch(cssIndexMatches[cssIndexFileName]);
    }

    // Also test with extractCss false.
    files = (await browserBuild(architect, host, target, { extractCss: false, styles })).files;

    // Check js files were created.
    for (const jsFileName of Object.keys(jsMatches)) {
      expect(await files[jsFileName]).toMatch(jsMatches[jsFileName]);
    }

    // Check no css files are created.
    for (const cssFileName of Object.keys(cssMatches)) {
      expect(cssFileName in files).toBe(false);
    }

    // Check check index has styles in the right order.
    for (const jsIndexFileName of Object.keys(jsIndexMatches)) {
      expect(await files[jsIndexFileName]).toMatch(jsIndexMatches[jsIndexFileName]);
    }
  });

  it('supports empty styleUrls in components', async () => {
    host.writeMultipleFiles({
      './src/app/app.component.ts': `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: []
        })
        export class AppComponent {
          title = 'app';
        }
      `,
    });

    await browserBuild(architect, host, target, { extractCss: true });
  });

  extensionsWithImportSupport.forEach(ext => {
    it(`supports imports in ${ext} files`, async () => {
      host.writeMultipleFiles({
        [`src/styles.${ext}`]: `
          @import './imported-styles.${ext}';
          body { background-color: #00f; }
        `,
        [`src/imported-styles.${ext}`]: 'p { background-color: #f00; }',
        [`src/app/app.component.${ext}`]: `
          @import './imported-component-styles.${ext}';
          .outer {
            .inner {
              background: #fff;
            }
          }
        `,
        [`src/app/imported-component-styles.${ext}`]: 'h1 { background: #000; }',
      });

      const matches: { [path: string]: RegExp } = {
        'styles.css': new RegExp(
          // The global style should be there
          /p\s*{\s*background-color: #f00;\s*}(.|\n|\r)*/.source +
            // The global style via import should be there
            /body\s*{\s*background-color: #00f;\s*}/.source,
        ),
        'styles.css.map': /"mappings":".+"/,
        'main.js': new RegExp(
          // The component style should be there
          /h1(.|\n|\r)*background:\s*#000(.|\n|\r)*/.source +
            // The component style via import should be there
            /.outer(.|\n|\r)*.inner(.|\n|\r)*background:\s*#[fF]+/.source,
        ),
      };

      const overrides = {
        extractCss: true,
        sourceMap: true,
        styles: [`src/styles.${ext}`],
      };

      host.replaceInFile(
        'src/app/app.component.ts',
        './app.component.css',
        `./app.component.${ext}`,
      );

      const { files } = await browserBuild(architect, host, target, overrides);
      for (const fileName of Object.keys(matches)) {
        expect(await files[fileName]).toMatch(matches[fileName]);
      }
    });
  });

  extensionsWithImportSupport.forEach(ext => {
    it(`supports material imports in ${ext} files`, async () => {
      host.writeMultipleFiles({
        [`src/styles.${ext}`]: `
          @import "~@angular/material/prebuilt-themes/indigo-pink.css";
          @import "@angular/material/prebuilt-themes/indigo-pink.css";
        `,
        [`src/app/app.component.${ext}`]: `
          @import "~@angular/material/prebuilt-themes/indigo-pink.css";
          @import "@angular/material/prebuilt-themes/indigo-pink.css";
        `,
      });
      host.replaceInFile(
        'src/app/app.component.ts',
        './app.component.css',
        `./app.component.${ext}`,
      );

      const overrides = {
        extractCss: true,
        styles: [{ input: `src/styles.${ext}` }],
      };
      await browserBuild(architect, host, target, overrides);
    });
  });

  extensionsWithVariableSupport.forEach(ext => {
    it(`supports ${ext} includePaths`, async () => {
      let variableAssignment = '';
      let variablereference = '';
      if (ext === 'scss') {
        variableAssignment = '$primary-color:';
        variablereference = '$primary-color';
      } else if (ext === 'styl') {
        variableAssignment = '$primary-color =';
        variablereference = '$primary-color';
      } else if (ext === 'less') {
        variableAssignment = '@primary-color:';
        variablereference = '@primary-color';
      }

      host.writeMultipleFiles({
        [`src/style-paths/variables.${ext}`]: `${variableAssignment} #f00;`,
        [`src/styles.${ext}`]: `
          @import 'variables';
          h1 { color: ${variablereference}; }
        `,
        [`src/app/app.component.${ext}`]: `
          @import 'variables';
          h2 { color: ${variablereference}; }
        `,
      });

      const matches: { [path: string]: RegExp } = {
        'styles.css': /h1\s*{\s*color: #f00;\s*}/,
        'main.js': /h2.*{.*color: #f00;.*}/,
      };

      host.replaceInFile(
        'src/app/app.component.ts',
        './app.component.css',
        `./app.component.${ext}`,
      );

      const overrides = {
        extractCss: true,
        styles: [`src/styles.${ext}`],
        stylePreprocessorOptions: {
          includePaths: ['src/style-paths'],
        },
      };

      const { files } = await browserBuild(architect, host, target, overrides);
      for (const fileName of Object.keys(matches)) {
        expect(await files[fileName]).toMatch(matches[fileName]);
      }
    });
  });

  it(`supports font-awesome imports`, async () => {
    host.writeMultipleFiles({
      'src/styles.scss': `
        $fa-font-path: "~font-awesome/fonts";
        @import "~font-awesome/scss/font-awesome";
      `,
    });

    const overrides = { extractCss: true, styles: [`src/styles.scss`] };
    await browserBuild(architect, host, target, overrides);
  }, 30000);

  it(`supports font-awesome imports without extractCss`, async () => {
    host.writeMultipleFiles({
      'src/styles.scss': `
        @import "~font-awesome/css/font-awesome.css";
      `,
    });

    const overrides = { extractCss: false, styles: [`src/styles.scss`] };
    await browserBuild(architect, host, target, overrides);
  }, 30000);

  it(`uses autoprefixer`, async () => {
    host.writeMultipleFiles({
      'src/styles.css': tags.stripIndents`
        /* normal-comment */
        /*! important-comment */
        div { flex: 1 }`,
      browserslist: 'IE 10',
    });

    const overrides = { extractCss: true, optimization: false };
    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['styles.css']).toContain(tags.stripIndents`
      /* normal-comment */
      /*! important-comment */
      div { -ms-flex: 1; flex: 1 }`);
  });

  it(`minimizes css`, async () => {
    host.writeMultipleFiles({
      'src/styles.css': tags.stripIndents`
        /* normal-comment */
        /*! important-comment */
        div { flex: 1 }`,
    });

    const overrides = { extractCss: true, optimization: true };
    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['styles.css']).toContain('/*! important-comment */div{flex:1}');
  });

  // TODO: consider making this a unit test in the url processing plugins.
  it(`supports baseHref/deployUrl in resource urls without rebaseRootRelativeCssUrls`, async () => {
    // Use a large image for the relative ref so it cannot be inlined.
    host.copyFile('src/spectrum.png', './src/assets/global-img-relative.png');
    host.copyFile('src/spectrum.png', './src/assets/component-img-relative.png');
    host.writeMultipleFiles({
      'src/styles.css': `
        h1 { background: url('/assets/global-img-absolute.svg'); }
        h2 { background: url('./assets/global-img-relative.png'); }
      `,
      'src/app/app.component.css': `
        h3 { background: url('/assets/component-img-absolute.svg'); }
        h4 { background: url('../assets/component-img-relative.png'); }
      `,
      'src/assets/global-img-absolute.svg': imgSvg,
      'src/assets/component-img-absolute.svg': imgSvg,
    });

    let { files } = await browserBuild(architect, host, target, { aot: true, extractCss: true });

    // Check base paths are correctly generated.
    let styles = await files['styles.css'];
    let main = await files['main.js'];

    expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
    expect(styles).toContain(`url('global-img-relative.png')`);
    expect(main).toContain(`url('/assets/component-img-absolute.svg')`);
    expect(main).toContain(`url('component-img-relative.png')`);

    expect(host.scopedSync().exists(normalize('dist/assets/global-img-absolute.svg'))).toBe(true);
    expect(host.scopedSync().exists(normalize('dist/global-img-relative.png'))).toBe(true);
    expect(host.scopedSync().exists(normalize('dist/assets/component-img-absolute.svg'))).toBe(
      true,
    );
    expect(host.scopedSync().exists(normalize('dist/component-img-relative.png'))).toBe(true);

    // Check urls with deploy-url scheme are used as is.
    files = (await browserBuild(architect, host, target, {
      extractCss: true,
      baseHref: '/base/',
      deployUrl: 'http://deploy.url/',
    })).files;

    styles = await files['styles.css'];
    main = await files['main.js'];
    expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
    expect(main).toContain(`url('/assets/component-img-absolute.svg')`);

    // Check urls with base-href scheme are used as is (with deploy-url).
    files = (await browserBuild(architect, host, target, {
      extractCss: true,
      baseHref: 'http://base.url/',
      deployUrl: 'deploy/',
    })).files;
    styles = await files['styles.css'];
    main = await files['main.js'];
    expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
    expect(main).toContain(`url('/assets/component-img-absolute.svg')`);

    // Check urls with deploy-url and base-href scheme only use deploy-url.
    files = (await browserBuild(architect, host, target, {
      extractCss: true,
      baseHref: 'http://base.url/',
      deployUrl: 'http://deploy.url/',
    })).files;
    styles = await files['styles.css'];
    main = await files['main.js'];
    expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
    expect(main).toContain(`url('/assets/component-img-absolute.svg')`);

    // Check with schemeless base-href and deploy-url flags.
    files = (await browserBuild(architect, host, target, {
      extractCss: true,
      baseHref: '/base/',
      deployUrl: 'deploy/',
    })).files;
    styles = await files['styles.css'];
    main = await files['main.js'];
    expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
    expect(main).toContain(`url('/assets/component-img-absolute.svg')`);

    // Check with identical base-href and deploy-url flags.
    files = (await browserBuild(architect, host, target, {
      extractCss: true,
      baseHref: '/base/',
      deployUrl: '/base/',
    })).files;

    styles = await files['styles.css'];
    main = await files['main.js'];
    expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
    expect(main).toContain(`url('/assets/component-img-absolute.svg')`);

    // Check with only base-href flag.
    files = (await browserBuild(architect, host, target, {
      extractCss: true,
      baseHref: '/base/',
    })).files;

    styles = await files['styles.css'];
    main = await files['main.js'];
    expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
    expect(main).toContain(`url('/assets/component-img-absolute.svg')`);
  }, 90000);

  it(`supports baseHref/deployUrl in resource urls with rebaseRootRelativeCssUrls`, async () => {
    // Use a large image for the relative ref so it cannot be inlined.
    host.copyFile('src/spectrum.png', './src/assets/global-img-relative.png');
    host.copyFile('src/spectrum.png', './src/assets/component-img-relative.png');
    host.writeMultipleFiles({
      'src/styles.css': `
        h1 { background: url('/assets/global-img-absolute.svg'); }
        h2 { background: url('./assets/global-img-relative.png'); }
      `,
      'src/app/app.component.css': `
        h3 { background: url('/assets/component-img-absolute.svg'); }
        h4 { background: url('../assets/component-img-relative.png'); }
      `,
      'src/assets/global-img-absolute.svg': imgSvg,
      'src/assets/component-img-absolute.svg': imgSvg,
    });

    // Check base paths are correctly generated.
    const overrides = {
      extractCss: true,
      rebaseRootRelativeCssUrls: true,
    };
    let { files } = await browserBuild(architect, host, target, {
      ...overrides,
      aot: true,
    });

    let styles = await files['styles.css'];
    let main = await files['main.js'];
    expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
    expect(styles).toContain(`url('global-img-relative.png')`);
    expect(main).toContain(`url('/assets/component-img-absolute.svg')`);
    expect(main).toContain(`url('component-img-relative.png')`);
    expect(host.scopedSync().exists(normalize('dist/assets/global-img-absolute.svg'))).toBe(true);
    expect(host.scopedSync().exists(normalize('dist/global-img-relative.png'))).toBe(true);
    expect(host.scopedSync().exists(normalize('dist/assets/component-img-absolute.svg'))).toBe(
      true,
    );
    expect(host.scopedSync().exists(normalize('dist/component-img-relative.png'))).toBe(true);

    // Check urls with deploy-url scheme are used as is.
    files = (await browserBuild(architect, host, target, {
      ...overrides,
      baseHref: '/base/',
      deployUrl: 'http://deploy.url/',
    })).files;

    styles = await files['styles.css'];
    main = await files['main.js'];
    expect(styles).toContain(`url('http://deploy.url/assets/global-img-absolute.svg')`);
    expect(main).toContain(`url('http://deploy.url/assets/component-img-absolute.svg')`);

    // Check urls with base-href scheme are used as is (with deploy-url).
    files = (await browserBuild(architect, host, target, {
      ...overrides,
      baseHref: 'http://base.url/',
      deployUrl: 'deploy/',
    })).files;

    styles = await files['styles.css'];
    main = await files['main.js'];
    expect(styles).toContain(`url('http://base.url/deploy/assets/global-img-absolute.svg')`);
    expect(main).toContain(`url('http://base.url/deploy/assets/component-img-absolute.svg')`);

    // Check urls with deploy-url and base-href scheme only use deploy-url.
    files = (await browserBuild(architect, host, target, {
      ...overrides,
      baseHref: 'http://base.url/',
      deployUrl: 'http://deploy.url/',
    })).files;

    styles = await files['styles.css'];
    main = await files['main.js'];
    expect(styles).toContain(`url('http://deploy.url/assets/global-img-absolute.svg')`);
    expect(main).toContain(`url('http://deploy.url/assets/component-img-absolute.svg')`);

    // Check with schemeless base-href and deploy-url flags.
    files = (await browserBuild(architect, host, target, {
      ...overrides,
      baseHref: '/base/',
      deployUrl: 'deploy/',
    })).files;

    styles = await files['styles.css'];
    main = await files['main.js'];
    expect(styles).toContain(`url('/base/deploy/assets/global-img-absolute.svg')`);
    expect(main).toContain(`url('/base/deploy/assets/component-img-absolute.svg')`);

    // Check with identical base-href and deploy-url flags.
    files = (await browserBuild(architect, host, target, {
      ...overrides,
      baseHref: '/base/',
      deployUrl: '/base/',
    })).files;

    styles = await files['styles.css'];
    main = await files['main.js'];
    expect(styles).toContain(`url('/base/assets/global-img-absolute.svg')`);
    expect(main).toContain(`url('/base/assets/component-img-absolute.svg')`);

    // Check with only base-href flag.
    files = (await browserBuild(architect, host, target, {
      ...overrides,
      baseHref: '/base/',
    })).files;

    styles = await files['styles.css'];
    main = await files['main.js'];
    expect(styles).toContain(`url('/base/assets/global-img-absolute.svg')`);
    expect(main).toContain(`url('/base/assets/component-img-absolute.svg')`);
  }, 90000);

  it(`supports bootstrap@4`, async () => {
    const overrides = {
      extractCss: true,
      styles: ['../../../../node_modules/bootstrap/dist/css/bootstrap.css'],
      scripts: ['../../../../node_modules/bootstrap/dist/js/bootstrap.js'],
    };

    await browserBuild(architect, host, target, overrides);
  });

  it(`supports inline javascript in less`, async () => {
    const overrides = { styles: [`src/styles.less`] };
    host.writeMultipleFiles({
      'src/styles.less': `
        .myFunction() {
          @functions: ~\`(function () {
            return '';
          })()\`;
        }
        .myFunction();
      `,
    });

    await browserBuild(architect, host, target, overrides);
  });

  it('supports Protocol-relative Url', async () => {
    host.writeMultipleFiles({
      'src/styles.css': `
        body {
          background-image: url('//cdn.com/classic-bg.jpg');
        }
      `,
    });

    const overrides = { extractCss: true, optimization: true };
    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['styles.css']).toContain('background-image:url(//cdn.com/classic-bg.jpg)');
  });

  it('supports fonts with space in filename', async () => {
    host.writeMultipleFiles({
      'src/styles.css': `
        @font-face {
          font-family: "Font Awesome";
          src: url("./assets/fa solid-900.woff2") format("woff2");
        }

        body {
          font-family: "Font Awesome";
        }
      `,
      'src/assets/fa solid-900.woff2': '',
    });

    const overrides = { extractCss: true };
    const { output } = await browserBuild(architect, host, target, overrides);
    expect(output.success).toBe(true);
  });

  it('supports font names with spaces', async () => {
    host.writeMultipleFiles({
      'src/styles.css': `
        body {
          font: 10px "Font Awesome";
        }
      `,
    });

    const overrides = { extractCss: true, optimization: true };
    const logger = new logging.Logger('font-name-spaces');
    const logs: string[] = [];
    logger.subscribe(e => logs.push(e.message));

    const { output } = await browserBuild(architect, host, target, overrides, { logger });
    expect(output.success).toBe(true);
    expect(logs.join()).not.toContain('WARNING in Invalid font values ');
  });
});
