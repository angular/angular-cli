/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { JavaScriptTransformer } from './javascript-transformer';

describe('JavaScriptTransformer sourcemaps', () => {
  let transformer: JavaScriptTransformer;

  afterEach(async () => {
    await transformer?.close();
  });

  function extractSourcemap(code: string): Record<string, unknown> | null {
    const match = code.match(
      /\/\/# sourceMappingURL=data:application\/json;charset=utf-8;base64,(.+)/,
    );
    if (!match) {
      return null;
    }

    return JSON.parse(Buffer.from(match[1], 'base64').toString('utf-8'));
  }

  it('should remap correctly when only advanced optimizations are applied', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: true,
        advancedOptimizations: true,
      },
      1,
    );

    const inputMap = {
      version: 3,
      sources: ['src/app.ts'],
      sourcesContent: ['const x = new SomeClass();'],
      mappings: 'AAAA',
      names: [],
    };
    const base64Map = Buffer.from(JSON.stringify(inputMap)).toString('base64');
    const input = `var x = new SomeClass();\n//# sourceMappingURL=data:application/json;base64,${base64Map}`;

    const result = await transformer.transformData('src/app.js', input, true);
    const text = Buffer.from(result).toString('utf-8');
    const map = extractSourcemap(text);

    expect(map).toBeDefined();
    expect(map?.['version']).toBe(3);
    expect(map?.['sources']).toContain('src/app.ts');
    expect(typeof map?.['mappings']).toBe('string');
    expect((map?.['mappings'] as string).length).toBeGreaterThan(0);
  });

  it('should remap correctly when only linking is applied', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: true,
        thirdPartySourcemaps: true,
      },
      1,
    );

    const inputMap = {
      version: 3,
      sources: ['node_modules/my-lib/directive.ts'],
      sourcesContent: ['export class MyDirective {}'],
      mappings: 'AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA',
      names: [],
    };
    const base64Map = Buffer.from(JSON.stringify(inputMap)).toString('base64');
    const input = `
      import * as i0 from "@angular/core";
      export class MyDirective {}
      MyDirective.ɵdir = i0.ɵɵngDeclareDirective({
        minVersion: "12.0.0",
        version: "14.0.0",
        ngImport: i0,
        type: MyDirective,
        selector: "[my-dir]"
      });
      //# sourceMappingURL=data:application/json;base64,${base64Map}
    `;

    const result = await transformer.transformData(
      'node_modules/my-lib/directive.js',
      input,
      false,
    );
    const text = Buffer.from(result).toString('utf-8');
    const map = extractSourcemap(text);

    expect(map).toBeDefined();
    expect(map?.['version']).toBe(3);
    expect(map?.['sources']).toContain('node_modules/my-lib/directive.ts');
    expect(typeof map?.['mappings']).toBe('string');
    expect((map?.['mappings'] as string).length).toBeGreaterThan(0);
  });

  it('should defer and chain remapping when both linking and advanced optimizations are applied', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: true,
        thirdPartySourcemaps: true,
        advancedOptimizations: true,
      },
      1,
    );

    const inputMap = {
      version: 3,
      sources: ['node_modules/my-lib/component.ts'],
      sourcesContent: ['export class MyComponent {}'],
      mappings: 'AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA',
      names: [],
    };
    const base64Map = Buffer.from(JSON.stringify(inputMap)).toString('base64');
    const input = `
      import * as i0 from "@angular/core";
      export class MyComponent {}
      MyComponent.ɵcmp = i0.ɵɵngDeclareComponent({
        minVersion: "12.0.0",
        version: "14.0.0",
        ngImport: i0,
        type: MyComponent,
        selector: "my-cmp",
        template: "<div></div>"
      });
      //# sourceMappingURL=data:application/json;base64,${base64Map}
    `;

    const result = await transformer.transformData(
      'node_modules/my-lib/component.js',
      input,
      false,
    );
    const text = Buffer.from(result).toString('utf-8');
    const map = extractSourcemap(text);

    expect(map).toBeDefined();
    expect(map?.['version']).toBe(3);
    expect(map?.['sources']).toContain('node_modules/my-lib/component.ts');
    expect(typeof map?.['mappings']).toBe('string');
    expect((map?.['mappings'] as string).length).toBeGreaterThan(0);
  });

  it('should produce a valid sourcemap when no input sourcemap is present', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: true,
        advancedOptimizations: true,
      },
      1,
    );

    const input = 'var x = new SomeClass();';
    const result = await transformer.transformData('src/app.js', input, true);
    const text = Buffer.from(result).toString('utf-8');
    const map = extractSourcemap(text);

    expect(map).toBeDefined();
    expect(map?.['version']).toBe(3);
    expect(map?.['sources']).toContain('src/app.js');
    expect(typeof map?.['mappings']).toBe('string');
    expect((map?.['mappings'] as string).length).toBeGreaterThan(0);
  });

  it('should remap correctly when coverage instrumentation is applied with an input sourcemap', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: true,
      },
      1,
    );

    const inputMap = {
      version: 3,
      sources: ['src/counter.ts'],
      sourcesContent: ['export function add(a: number, b: number) { return a + b; }'],
      mappings: 'AAAA',
      names: [],
    };
    const base64Map = Buffer.from(JSON.stringify(inputMap)).toString('base64');
    const input = `export function add(a, b) { return a + b; }\n//# sourceMappingURL=data:application/json;base64,${base64Map}`;

    const result = await transformer.transformData(
      'src/counter.js',
      input,
      true,
      undefined,
      true /* instrumentForCoverage */,
    );
    const text = Buffer.from(result).toString('utf-8');
    const map = extractSourcemap(text);

    expect(map).toBeDefined();
    expect(map?.['version']).toBe(3);
    expect(map?.['sources']).toContain('src/counter.ts');
    expect(typeof map?.['mappings']).toBe('string');
    expect((map?.['mappings'] as string).length).toBeGreaterThan(0);
  });

  it('should defer and chain remapping when coverage instrumentation and advanced optimizations are applied', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: true,
        advancedOptimizations: true,
      },
      1,
    );

    const inputMap = {
      version: 3,
      sources: ['src/app.ts'],
      sourcesContent: ['const x = new SomeClass();'],
      mappings: 'AAAA',
      names: [],
    };
    const base64Map = Buffer.from(JSON.stringify(inputMap)).toString('base64');
    const input = `var x = new SomeClass();\n//# sourceMappingURL=data:application/json;base64,${base64Map}`;

    const result = await transformer.transformData(
      'src/app.js',
      input,
      true,
      undefined,
      true /* instrumentForCoverage */,
    );
    const text = Buffer.from(result).toString('utf-8');
    const map = extractSourcemap(text);

    expect(map).toBeDefined();
    expect(map?.['version']).toBe(3);
    expect(map?.['sources']).toContain('src/app.ts');
    expect(typeof map?.['mappings']).toBe('string');
    expect((map?.['mappings'] as string).length).toBeGreaterThan(0);
  });

  it('should accept a Uint8Array input in transformData', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: true,
        advancedOptimizations: true,
      },
      1,
    );

    const inputBuffer = Buffer.from('var x = new SomeClass();', 'utf-8');
    const result = await transformer.transformData('src/app.js', inputBuffer, true);
    const text = Buffer.from(result).toString('utf-8');
    const map = extractSourcemap(text);

    expect(map).toBeDefined();
    expect(map?.['version']).toBe(3);
    expect(map?.['sources']).toContain('src/app.js');
    expect(typeof map?.['mappings']).toBe('string');
  });

  it('should strip trailing sourcemap comments from Uint8Array input on fast-path', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: false,
      },
      1,
    );

    const inputBuffer = Buffer.from(
      'console.log("hello");\n//# sourceMappingURL=app.js.map',
      'utf-8',
    );
    const result = await transformer.transformData('node_modules/my-lib/lib.js', inputBuffer, true);
    const text = Buffer.from(result).toString('utf-8');

    expect(text).toBe('console.log("hello");\n');
  });

  it('should return Uint8Array input untouched on fast-path when no sourcemap comment is present', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: false,
      },
      1,
    );

    const inputBuffer = Buffer.from('console.log("hello");\nconst x = 1;', 'utf-8');
    const result = await transformer.transformData('node_modules/my-lib/lib.js', inputBuffer, true);

    expect(result).toBe(inputBuffer);
  });

  it('should return Uint8Array untouched when skipLinker is false but file contains no linker declarations', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: false,
      },
      1,
    );

    const inputBuffer = Buffer.from('console.log("no linking required");\nconst x = 1;', 'utf-8');
    const result = await transformer.transformData(
      'node_modules/my-lib/lib.js',
      inputBuffer,
      false, // skipLinker: false
    );

    expect(result).toBe(inputBuffer);
  });

  it('should bypass worker and skip linking for @angular/core and @angular/compiler paths', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: false,
      },
      1,
    );

    const inputBuffer = Buffer.from('export const ɵɵngDeclareDirective = () => {};', 'utf-8');
    const result = await transformer.transformData(
      'node_modules/@angular/core/fesm2022/core.mjs',
      inputBuffer,
      false,
    );

    expect(result).toBe(inputBuffer);
  });

  it('should bypass worker and skip linking for TypeScript file extensions (.ts, .tsx, .mts, .cts)', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: false,
      },
      1,
    );

    const inputBuffer = Buffer.from('export const ɵɵngDeclareDirective = () => {};', 'utf-8');

    for (const ext of ['.ts', '.tsx', '.mts', '.cts']) {
      const result = await transformer.transformData(`src/app/directive${ext}`, inputBuffer, false);

      expect(result).toBe(inputBuffer);
    }
  });

  it('should not exclude packages with similar prefixes such as @angular/compiler-cli', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: false,
      },
      1,
    );

    const input = `
      import * as i0 from "@angular/core";
      export class MyDirective {}
      MyDirective.ɵdir = i0.ɵɵngDeclareDirective({
        minVersion: "12.0.0",
        version: "14.0.0",
        ngImport: i0,
        type: MyDirective,
        selector: "[my-dir]"
      });
    `;

    const result = await transformer.transformData(
      'node_modules/@angular/compiler-cli/test.js',
      input,
      false,
    );
    const text = Buffer.from(result).toString('utf-8');

    expect(text).not.toContain('i0.ɵɵngDeclareDirective');
  });

  it('should strip sourcemaps from Uint8Array when worker runs with sourcemap: false', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: false,
        advancedOptimizations: true,
      },
      1,
    );

    const inputBuffer = Buffer.from('var a = 1;\n//# sourceMappingURL=foo.js.map', 'utf-8');
    const result = await transformer.transformData('src/app/foo.js', inputBuffer, true);
    const text = Buffer.from(result).toString('utf-8');

    expect(text).toBe('var a = 1;\n');
    expect(text).not.toContain('sourceMappingURL');
  });

  it('should reject tasks after transformer is closed', async () => {
    transformer = new JavaScriptTransformer(
      {
        sourcemap: false,
      },
      1,
    );

    await transformer.close();

    await expectAsync(
      transformer.transformData('src/app/foo.js', 'console.log(1);', true),
    ).toBeRejectedWithError('JavaScriptTransformer closed.');
  });
});
