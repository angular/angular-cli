/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Migration to remove polyfills specific to Internet Explorer', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;

  beforeEach(async () => {
    tree = await schematicRunner
      .runExternalSchematicAsync(
        require.resolve('../../collection.json'),
        'ng-new',
        {
          name: 'migration-test',
          version: '1.2.3',
          directory: '.',
        },
        new UnitTestTree(new EmptyTree()),
      )
      .toPromise();
  });

  it('should remove used `classlist.js` polyfill', async () => {
    tree.overwrite(
      'src/polyfills.ts',
      `
/**
 * IE11 requires the following for NgClass support on SVG elements
 */
import 'classlist.js';

// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );
  });

  it('should remove used `web-animations-js` polyfill', async () => {
    tree.overwrite(
      'src/polyfills.ts',
      `
/**
 * Web Animations \`@angular/platform-browser/animations\`
 * Only required if AnimationBuilder is used within the application and using IE/Edge or Safari.
 * Standard animation support in Angular DOES NOT require any polyfills (as of Angular 6.0).
 */
import 'web-animations-js';

// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );
  });

  it('should remove unused `classlist.js` polyfill', async () => {
    tree.overwrite(
      'src/polyfills.ts',
      `
/**
 * IE11 requires the following for NgClass support on SVG elements
 */
// import 'classlist.js';  // Run \`npm install --save classlist.js\`.

// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
    `.trim(),
    );
  });

  it('should remove unused `web-animations-js` polyfill', async () => {
    tree.overwrite(
      'src/polyfills.ts',
      `
/**
 * Web Animations \`@angular/platform-browser/animations\`
 * Only required if AnimationBuilder is used within the application and using IE/Edge or Safari.
 * Standard animation support in Angular DOES NOT require any polyfills (as of Angular 6.0).
 */
// import 'web-animations-js';  // Run \`npm install --save web-animations-js\`.

// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );
  });

  it('warns on a polyfill path that does not reference a valid file', async () => {
    tree.delete('src/polyfills.ts');

    const logs = [] as string[];
    schematicRunner.logger.subscribe((log) => logs.push(log.message));

    await schematicRunner.runSchematicAsync('drop-ie-polyfills', {}, tree).toPromise();

    expect(logs).toEqual([
      'Polyfill path from workspace configuration could not be read, does the file exist?',
    ]);
  });

  it('handles byte-order-marks (BOMs) in the polyfill file', async () => {
    tree.overwrite(
      'src/polyfills.ts',
      // File with leading BOM (\uFEFF).
      `
\uFEFF/**
 * IE11 requires the following for NgClass support on SVG elements
 */
import 'classlist.js';

// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );
  });

  it('handles carriage returns with newlines if present', async () => {
    tree.overwrite(
      'src/polyfills.ts',
      // File each `\r\n` for newline separators.
      `
/**\r
 * IE11 requires the following for NgClass support on SVG elements\r
 */\r
// import 'classlist.js';  // Run \`npm install --save classlist.js\`.\r
\r
// Other stuff.\r
/***************************************************************************************************\r
 * Zone JS is required by default for Angular itself.\r
 */\r
import 'zone.js';  // Included with Angular CLI.\r
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
// Other stuff.\r
/***************************************************************************************************\r
 * Zone JS is required by default for Angular itself.\r
 */\r
import 'zone.js';  // Included with Angular CLI.\r
      `.trim(),
    );
  });

  it('removes older-style `classlist.js` polyfill comment', async () => {
    // Previous Angular versions used a single-line comment, this should still be removed.
    tree.overwrite(
      'src/polyfills.ts',
      `
/** IE11 requires the following for NgClass support on SVG elements */
import 'classlist.js';

// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );
  });

  it('should remove an unused polyfill from the last item in the file', async () => {
    // TypeScript APIs require special-casing any trailing comments in the file, so we need to test
    // this explicitly.
    tree.overwrite(
      'src/polyfills.ts',
      `
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.

/**
 * IE11 requires the following for NgClass support on SVG elements
 */
// import 'classlist.js';  // Run \`npm install --save classlist.js\`.
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
    `.trim(),
    );
  });

  it('keeps the file overview comment preceeding a used polyfill', async () => {
    tree.overwrite(
      'src/polyfills.ts',
      `
/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 *
 * This file is divided into 2 sections:
 *   1. Browser polyfills. These are applied before loading ZoneJS and are sorted by browsers.
 *   2. Application imports. Files imported after ZoneJS that should be loaded before your main
 *      file.
 *
 * The current setup is for so-called "evergreen" browsers; the last versions of browsers that
 * automatically update themselves. This includes Safari >= 10, Chrome >= 55 (including Opera),
 * Edge >= 13 on the desktop, and iOS 10 and Chrome on mobile.
 *
 * Learn more in https://angular.io/guide/browser-support
 */

/**
 * IE11 requires the following for NgClass support on SVG elements
 */
import 'classlist.js';
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 *
 * This file is divided into 2 sections:
 *   1. Browser polyfills. These are applied before loading ZoneJS and are sorted by browsers.
 *   2. Application imports. Files imported after ZoneJS that should be loaded before your main
 *      file.
 *
 * The current setup is for so-called "evergreen" browsers; the last versions of browsers that
 * automatically update themselves. This includes Safari >= 10, Chrome >= 55 (including Opera),
 * Edge >= 13 on the desktop, and iOS 10 and Chrome on mobile.
 *
 * Learn more in https://angular.io/guide/browser-support
 */
      `.trim(),
    );
  });

  it('keeps the file overview comment preceeding an unused polyfill', async () => {
    tree.overwrite(
      'src/polyfills.ts',
      `
/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 *
 * This file is divided into 2 sections:
 *   1. Browser polyfills. These are applied before loading ZoneJS and are sorted by browsers.
 *   2. Application imports. Files imported after ZoneJS that should be loaded before your main
 *      file.
 *
 * The current setup is for so-called "evergreen" browsers; the last versions of browsers that
 * automatically update themselves. This includes Safari >= 10, Chrome >= 55 (including Opera),
 * Edge >= 13 on the desktop, and iOS 10 and Chrome on mobile.
 *
 * Learn more in https://angular.io/guide/browser-support
 */

/**
 * IE11 requires the following for NgClass support on SVG elements
 */
// import 'classlist.js';  // Run \`npm install --save classlist.js\`.
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 *
 * This file is divided into 2 sections:
 *   1. Browser polyfills. These are applied before loading ZoneJS and are sorted by browsers.
 *   2. Application imports. Files imported after ZoneJS that should be loaded before your main
 *      file.
 *
 * The current setup is for so-called "evergreen" browsers; the last versions of browsers that
 * automatically update themselves. This includes Safari >= 10, Chrome >= 55 (including Opera),
 * Edge >= 13 on the desktop, and iOS 10 and Chrome on mobile.
 *
 * Learn more in https://angular.io/guide/browser-support
 */
      `.trim(),
    );
  });

  it('keeps the BROWSER POLYFILLS comment preceeding a used polyfill', async () => {
    tree.overwrite(
      'src/polyfills.ts',
      `
/***************************************************************************************************
 * BROWSER POLYFILLS
 */

/**
 * IE11 requires the following for NgClass support on SVG elements
 */
import 'classlist.js';
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
/***************************************************************************************************
 * BROWSER POLYFILLS
 */
      `.trim(),
    );
  });

  it('keeps the BROWSER POLYFILLS comment preceeding an unused polyfill', async () => {
    tree.overwrite(
      'src/polyfills.ts',
      `
/***************************************************************************************************
 * BROWSER POLYFILLS
 */

/**
 * IE11 requires the following for NgClass support on SVG elements
 */
// import 'classlist.js';  // Run \`npm install --save classlist.js\`.
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
/***************************************************************************************************
 * BROWSER POLYFILLS
 */
      `.trim(),
    );
  });

  it('ignores a `package.json` that does not include polyfill dependencies', async () => {
    const packageJson = `
{
  "name": "ng-new",
  "version": "0.0.0",
  "dependencies": {
    "@angular/core": "^13.0.0"
  },
  "devDependencies": {
    "@angular/cli": "^13.0.0"
  }
}
    `.trim();

    tree.overwrite('package.json', packageJson);

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('package.json')).toBe(packageJson);

    // No `npm install` should be scheduled, nothing to remove.
    expect(schematicRunner.tasks).toEqual([]);
  });

  it('uninstalls `classlist.js` and `web-animations-js` packages', async () => {
    tree.overwrite(
      'package.json',
      `
{
  "name": "ng-new",
  "version": "0.0.0",
  "dependencies": {
    "@angular/core": "^13.0.0",
    "classlist.js": "^1.0.0"
  },
  "devDependencies": {
    "@angular/cli": "^13.0.0",
    "web-animations-js": "^1.0.0"
  }
}
    `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    // Assert `package.json` no longer contains removed dependencies.
    expect(migrated.readContent('package.json')).toBe(
      `
{
  "name": "ng-new",
  "version": "0.0.0",
  "dependencies": {
    "@angular/core": "^13.0.0"
  },
  "devDependencies": {
    "@angular/cli": "^13.0.0"
  }
}
    `.trim(),
    );

    // Assert that `npm install` is scheduled.
    const taskNames = schematicRunner.tasks.map((task) => task.name);
    expect(taskNames).toEqual(['node-package']);
  });

  it('removes preceeding newline from used polyfill', async () => {
    tree.overwrite(
      'src/polyfills.ts',
      `
/** Some other polyfill. */
import 'some-other-polyfill';

/**
 * IE11 requires the following for NgClass support on SVG elements
 */
import 'classlist.js';

// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
/** Some other polyfill. */
import 'some-other-polyfill';

// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );
  });

  it('removes preceeding newline from unused polyfill', async () => {
    tree.overwrite(
      'src/polyfills.ts',
      `
/** Some other polyfill. */
import 'some-other-polyfill';

/**
 * IE11 requires the following for NgClass support on SVG elements
 */
// import 'classlist.js';  // Run \`npm install --save classlist.js\`.

// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
/** Some other polyfill. */
import 'some-other-polyfill';

// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );
  });

  it('removes newlines between multiple removed polyfills', async () => {
    tree.overwrite(
      'src/polyfills.ts',
      `
/** Some other polyfill. */
import 'some-other-polyfill';

/**
 * IE11 requires the following for NgClass support on SVG elements
 */
// import 'classlist.js';  // Run \`npm install --save classlist.js\`.

/**
 * Web Animations \`@angular/platform-browser/animations\`
 * Only required if AnimationBuilder is used within the application and using IE/Edge or Safari.
 * Standard animation support in Angular DOES NOT require any polyfills (as of Angular 6.0).
 */
import 'web-animations-js';

// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );

    const migrated = await schematicRunner
      .runSchematicAsync('drop-ie-polyfills', {}, tree)
      .toPromise();

    expect(migrated.readContent('src/polyfills.ts').trim()).toBe(
      `
/** Some other polyfill. */
import 'some-other-polyfill';

// Other stuff.
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.
      `.trim(),
    );
  });
});
