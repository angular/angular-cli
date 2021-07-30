/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { normalize, tags } from '@angular-devkit/core';
import { dirname } from 'path';
import { browserBuild, createArchitect, host } from '../../testing/test-utils';

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
    host.writeMultipleFiles({
      'src/string-style.css': '.string-style { color: red }',
      'src/input-style.css': '.input-style { color: red }',
      'src/lazy-style.css': '.lazy-style { color: red }',
      'src/pre-rename-style.css': '.pre-rename-style { color: red }',
      'src/pre-rename-lazy-style.css': '.pre-rename-lazy-style { color: red }',
    });

    const { files } = await browserBuild(architect, host, target, { styles });
    // Check css files were created.
    for (const cssFileName of Object.keys(cssMatches)) {
      expect(await files[cssFileName]).toMatch(cssMatches[cssFileName]);
    }

    // Check check index has styles in the right order.
    for (const cssIndexFileName of Object.keys(cssIndexMatches)) {
      expect(await files[cssIndexFileName]).toMatch(cssIndexMatches[cssIndexFileName]);
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

    await browserBuild(architect, host, target);
  });

  it('supports autoprefixer with inline component styles in JIT mode', async () => {
    host.writeMultipleFiles({
      './src/app/app.component.ts': `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styles: ['div { flex: 1 }'],
        })
        export class AppComponent {
          title = 'app';
        }
      `,
      '.browserslistrc': 'IE 10',
    });

    const { files } = await browserBuild(architect, host, target, { aot: false });

    expect(await files['main.js']).toContain('-ms-flex: 1;');
  });

  it('supports autoprefixer with inline component styles in AOT mode', async () => {
    host.writeMultipleFiles({
      './src/app/app.component.ts': `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styles: ['div { flex: 1 }'],
        })
        export class AppComponent {
          title = 'app';
        }
      `,
      '.browserslistrc': 'IE 10',
    });

    const { files } = await browserBuild(architect, host, target, { aot: true });

    expect(await files['main.js']).toContain('-ms-flex: 1;');
  });

  extensionsWithImportSupport.forEach((ext) => {
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

  extensionsWithImportSupport.forEach((ext) => {
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
        styles: [{ input: `src/styles.${ext}` }],
      };
      await browserBuild(architect, host, target, overrides);
    });
  });

  extensionsWithVariableSupport.forEach((ext) => {
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
        @import "font-awesome/scss/font-awesome";
      `,
    });

    const overrides = { styles: [`src/styles.scss`] };
    await browserBuild(architect, host, target, overrides);
  });

  it(`supports font-awesome imports (tilde)`, async () => {
    host.writeMultipleFiles({
      'src/styles.scss': `
        $fa-font-path: "~font-awesome/fonts";
        @import "~font-awesome/scss/font-awesome";
      `,
    });

    const overrides = { styles: [`src/styles.scss`] };
    await browserBuild(architect, host, target, overrides);
  });

  it(`uses autoprefixer`, async () => {
    host.writeMultipleFiles({
      'src/styles.css': tags.stripIndents`
        @import url(imported-styles.css);
        /* normal-comment */
        /*! important-comment */
        div { flex: 1 }`,
      'src/imported-styles.css': tags.stripIndents`
        /* normal-comment */
        /*! important-comment */
        section { flex: 1 }`,
      '.browserslistrc': 'IE 10',
    });

    const overrides = { optimization: false };
    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['styles.css']).toContain(tags.stripIndents`
      /* normal-comment */
      /*! important-comment */
      section { -ms-flex: 1; flex: 1 }
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

    const overrides = { optimization: true };
    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['styles.css']).toContain('/*! important-comment */div{flex:1}');
  });

  it('supports autoprefixer grid comments in SCSS with optimization true', async () => {
    host.writeMultipleFiles({
      'src/styles.scss': tags.stripIndents`
        /* autoprefixer grid: autoplace */
        .css-grid-container {
          display: grid;
          row-gap: 10px;
          grid-template-columns: 100px;
        }
      `,
      '.browserslistrc': 'IE 10',
    });

    const overrides = { optimization: true, styles: ['src/styles.scss'] };
    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['styles.css']).toContain('-ms-grid-columns:100px;');
  });

  // TODO: consider making this a unit test in the url processing plugins.
  it(
    `supports baseHref/deployUrl in resource urls`,
    async () => {
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

      let { files } = await browserBuild(architect, host, target, { aot: true });

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
      files = (
        await browserBuild(architect, host, target, {
          baseHref: '/base/',
          deployUrl: 'http://deploy.url/',
        })
      ).files;

      styles = await files['styles.css'];
      main = await files['main.js'];
      expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
      expect(main).toContain(`url('/assets/component-img-absolute.svg')`);

      // Check urls with base-href scheme are used as is (with deploy-url).
      files = (
        await browserBuild(architect, host, target, {
          baseHref: 'http://base.url/',
          deployUrl: 'deploy/',
        })
      ).files;
      styles = await files['styles.css'];
      main = await files['main.js'];
      expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
      expect(main).toContain(`url('/assets/component-img-absolute.svg')`);

      // Check urls with deploy-url and base-href scheme only use deploy-url.
      files = (
        await browserBuild(architect, host, target, {
          baseHref: 'http://base.url/',
          deployUrl: 'http://deploy.url/',
        })
      ).files;
      styles = await files['styles.css'];
      main = await files['main.js'];
      expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
      expect(main).toContain(`url('/assets/component-img-absolute.svg')`);

      // Check with schemeless base-href and deploy-url flags.
      files = (
        await browserBuild(architect, host, target, {
          baseHref: '/base/',
          deployUrl: 'deploy/',
        })
      ).files;
      styles = await files['styles.css'];
      main = await files['main.js'];
      expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
      expect(main).toContain(`url('/assets/component-img-absolute.svg')`);

      // Check with identical base-href and deploy-url flags.
      files = (
        await browserBuild(architect, host, target, {
          baseHref: '/base/',
          deployUrl: '/base/',
        })
      ).files;

      styles = await files['styles.css'];
      main = await files['main.js'];
      expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
      expect(main).toContain(`url('/assets/component-img-absolute.svg')`);

      // Check with only base-href flag.
      files = (
        await browserBuild(architect, host, target, {
          baseHref: '/base/',
        })
      ).files;

      styles = await files['styles.css'];
      main = await files['main.js'];
      expect(styles).toContain(`url('/assets/global-img-absolute.svg')`);
      expect(main).toContain(`url('/assets/component-img-absolute.svg')`);
      // NOTE: Timeout for large amount of builds in test. Test should be split up when refactored.
    },
    4 * 60 * 1000,
  );

  it(`supports bootstrap@4 with full path`, async () => {
    const bootstrapPath = dirname(require.resolve('bootstrap/package.json'));

    const overrides = {
      styles: [bootstrapPath + '/dist/css/bootstrap.css'],
      scripts: [bootstrapPath + '/dist/js/bootstrap.js'],
    };

    await browserBuild(architect, host, target, overrides);
  });

  it(`supports bootstrap@4 with package reference`, async () => {
    const overrides = {
      styles: ['bootstrap/dist/css/bootstrap.css'],
      scripts: ['bootstrap/dist/js/bootstrap.js'],
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

  it('causes equal failure for tilde and tilde-slash url()', async () => {
    host.writeMultipleFiles({
      'src/styles.css': `
        body {
          background-image: url('~/does-not-exist.jpg');
        }
      `,
    });

    const overrides = { optimization: true };
    const run = await architect.scheduleTarget(target, overrides);
    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: false }));

    host.writeMultipleFiles({
      'src/styles.css': `
        body {
          background-image: url('~does-not-exist.jpg');
        }
      `,
    });

    const run2 = await architect.scheduleTarget(target, overrides);
    await expectAsync(run2.result).toBeResolvedTo(jasmine.objectContaining({ success: false }));
  });

  it('supports Protocol-relative Url', async () => {
    host.writeMultipleFiles({
      'src/styles.css': `
        body {
          background-image: url('//cdn.com/classic-bg.jpg');
        }
      `,
    });

    const overrides = { optimization: true };
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

    const { output } = await browserBuild(architect, host, target);
    expect(output.success).toBe(true);
  });

  extensionsWithImportSupport.forEach((ext) => {
    it(`retains declarations order in ${ext} files when using @import`, async () => {
      host.writeMultipleFiles({
        [`src/styles-one.${ext}`]: tags.stripIndents`
            .one {
              color: #fff;
            }
          `,
        [`src/styles-two.${ext}`]: tags.stripIndents`
            .two {
              color: #fff;
            }
          `,
        // LESS doesn't support css imports by default.
        // See: https://github.com/less/less.js/issues/3188#issuecomment-374690630
        [`src/styles-three.${ext}`]: tags.stripIndents`
            @import ${
              ext === 'less' ? ' (css) ' : ''
            }url("https://fonts.googleapis.com/css?family=Roboto:400");
            .three {
              color: #fff;
            }
          `,
      });

      const overrides = {
        styles: [`src/styles-one.${ext}`, `src/styles-two.${ext}`, `src/styles-three.${ext}`],
      };
      const { files } = await browserBuild(architect, host, target, overrides);
      expect(await files['styles.css']).toMatch(/\.one(.|\n|\r)*\.two(.|\n|\r)*\.three/);
    });
  });

  extensionsWithImportSupport.forEach((ext) => {
    it(`adjusts relative resource URLs when using @import in ${ext} (global)`, async () => {
      host.copyFile('src/spectrum.png', './src/more-styles/images/global-img-relative.png');
      host.writeMultipleFiles({
        [`src/styles-one.${ext}`]: tags.stripIndents`
            @import "more-styles/styles-two.${ext}";
          `,
        [`src/more-styles/styles-two.${ext}`]: tags.stripIndents`
            .two {
              background-image: url(images/global-img-relative.png);
            }
          `,
      });

      const overrides = {
        sourceMap: false,
        styles: [`src/styles-one.${ext}`],
      };
      const { files } = await browserBuild(architect, host, target, overrides);
      expect(await files['styles.css']).toContain("'global-img-relative.png'");
    });

    it(`adjusts relative resource URLs when using @import in ${ext} (component)`, async () => {
      host.copyFile('src/spectrum.png', './src/app/images/component-img-relative.png');
      host.writeMultipleFiles({
        [`src/app/styles/component-styles.${ext}`]: `
            div { background-image: url(../images/component-img-relative.png); }
          `,
        [`src/app/app.component.${ext}`]: `
            @import "styles/component-styles.${ext}";
          `,
      });

      host.replaceInFile(
        'src/app/app.component.ts',
        './app.component.css',
        `./app.component.${ext}`,
      );

      const overrides = {
        sourceMap: false,
      };
      await browserBuild(architect, host, target, overrides);
    });
  });
});
