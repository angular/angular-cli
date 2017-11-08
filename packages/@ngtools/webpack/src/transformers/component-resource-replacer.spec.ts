import { oneLine, stripIndent } from 'common-tags';
import * as ts from 'typescript';
import {
  ComponentResourceTransformer,
  ComponentResourceReplacerOptions,
  ReplacerMode
} from './component-resource-replacer';
import { createTransformerFactory, Transformer } from './transformer';


function transform(
  content: string,
  transformer?: Transformer,
): string | undefined {
  let result: string | undefined;
  const source = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest);
  const compilerOptions: ts.CompilerOptions = {
    isolatedModules: true,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
    importHelpers: true,
  };
  const compilerHost: ts.CompilerHost = {
    getSourceFile: (fileName) => {
      if (fileName === source.fileName) {
        return source;
      }
      throw new Error();
    },
    getDefaultLibFileName: () => 'lib.d.ts',
    writeFile: (fileName, data) => {
      if (fileName === 'temp.js') {
        result = data;
      }
    },
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => false,
    getNewLine: () => '\n',
    fileExists: (fileName) => fileName === source.fileName,
    readFile: (_fileName) => '',
  };

  const program = ts.createProgram([source.fileName], compilerOptions, compilerHost);

  let transformers = undefined;
  if (transformer) {
    transformers = {
      before: [
        createTransformerFactory(
          transformer,
          {
            getTypeChecker: () => program.getTypeChecker()
          }
        )
      ],
    };
  }

  program.emit(undefined, undefined, undefined, undefined, transformers);

  return result;
}

function expectTransformation(
  input: string,
  output: string,
  options?: Partial<ComponentResourceReplacerOptions>
): void {
  const inputResult = transform(input, new ComponentResourceTransformer(options));
  const outputResult = transform(output);

  expect(oneLine`${inputResult}`).toEqual(oneLine`${outputResult}`);
}

function createComponentSource(metadataText: string): string {
  const content = stripIndent`
    import { Component } from '@angular/core';
    @Component({
      selector: 'test',
      ${metadataText}
    })
    export class TestComponent {}
  `;

  return content;
}

describe('component-resource-replacer', () => {
  it('converts templateUrl to template require()', () => {
    const input = createComponentSource(`
      templateUrl: './test.component.html',
    `);
    const output = createComponentSource(`
      template: require('./test.component.html'),
    `);

    expectTransformation(input, output);
  });

  it('normalizes a template resource path', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        templateUrl: 'test.component.html',
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        template: require("./test.component.html"),
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output);
  });

  it('converts single element styleUrls to styles require()', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styleUrls: ['./test.component.css'],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styles: [require('./test.component.css')],
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output);
  });

  it('normalizes a styleUrl resource path', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styleUrls: ['test.component.css'],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styles: [require("./test.component.css")],
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output);
  });

  it('converts multi element styleUrls to styles require()', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styleUrls: ['./test-1.component.css', './test-2.component.css'],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styles: [require('./test-1.component.css'), require('./test-2.component.css')],
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output);
  });

  it('removes empty styleUrls array', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styleUrls: [],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output);
  });

  it('maintains inline styles with no styleUrls', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styles: ['h1 { color: blue; }'],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styles: ['h1 { color: blue; }'],
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output);
  });

  it('combines inline styles with styleUrls', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styles: ['h1 { color: blue; }'],
        styleUrls: ['./test.component.css'],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styles: ['h1 { color: blue; }', require('./test.component.css')],
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output);
  });

  it('removes empty styles array', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styles: [],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output);
  });

  it('removes empty styles array elements', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styles: ['', 'h1 { color: blue; }', ''],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        styles: ['h1 { color: blue; }'],
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output);
  });

  it('removes moduleId', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        moduleId: 'test-module-id',
        selector: 'test',
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output);
  });

  it('converts both templateUrl and styleUrls', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        templateUrl: './test.component.html',
        styleUrls: ['./test-1.component.css', './test-2.component.css'],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        template: require('./test.component.html'),
        styles: [require('./test-1.component.css'), require('./test-2.component.css')],
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output);
  });

  it('only modifies Angular component metadata', () => {
    const input = stripIndent`
      import { Component } from 'xyz';
      @Component({
        selector: 'test',
        templateUrl: './test.component.html',
        styleUrls: ['./test-1.component.css', './test-2.component.css'],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from 'xyz';
      @Component({
        selector: 'test',
        templateUrl: './test.component.html',
        styleUrls: ['./test-1.component.css', './test-2.component.css'],
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output);
  });

  it('reports all resources in require mode', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        templateUrl: './test.component.html',
        styleUrls: ['./test-1.component.css', './test-2.component.css'],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        template: require('./test.component.html'),
        styles: [require('./test-1.component.css'), require('./test-2.component.css')],
      })
      export class TestComponent {}
    `;

    const resources: string[] = [];
    expectTransformation(input, output, { onResourceFound: r => resources.push(r) });

    expect(resources.length).toEqual(3);
    expect(resources.includes('./test.component.html')).toBeTruthy();
    expect(resources.includes('./test-1.component.css')).toBeTruthy();
    expect(resources.includes('./test-2.component.css')).toBeTruthy();
  });

  it('makes no changes in analyze only mode', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        templateUrl: './test.component.html',
        styleUrls: ['./test-1.component.css', './test-2.component.css'],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        templateUrl: './test.component.html',
        styleUrls: ['./test-1.component.css', './test-2.component.css'],
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output, { urlMode: ReplacerMode.Analyze });
  });

  it('reports all resources in analyze only mode', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        templateUrl: './test.component.html',
        styleUrls: ['./test-1.component.css', './test-2.component.css'],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        templateUrl: './test.component.html',
        styleUrls: ['./test-1.component.css', './test-2.component.css'],
      })
      export class TestComponent {}
    `;

    const resources: string[] = [];
    expectTransformation(input, output, {
      urlMode: ReplacerMode.Analyze,
      onResourceFound: r => resources.push(r),
    });

    expect(resources.length).toEqual(3);
    expect(resources.includes('./test.component.html')).toBeTruthy();
    expect(resources.includes('./test-1.component.css')).toBeTruthy();
    expect(resources.includes('./test-2.component.css')).toBeTruthy();
  });

  it('fetches all resources in inline mode', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        templateUrl: './test.component.html',
        styleUrls: ['./test-1.component.css', './test-2.component.css'],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        template: "<p>hi</p>",
        styles: [":host { }", "p { color: blue; }"],
      })
      export class TestComponent {}
    `;

    const contents: { [resource: string]: string } = {
      './test.component.html': '<p>hi</p>',
      './test-1.component.css': ':host { }',
      './test-2.component.css': 'p { color: blue; }',
    };

    expectTransformation(input, output, {
      urlMode: ReplacerMode.Inline,
      fetchResource: r => contents[r],
    });
  });

  it('transforms inline content in require mode', () => {
    const input = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        templateUrl: './test.component.html',
        styleUrls: ['./test-1.component.css'],
        styles: ['p { color: blue; }'],
      })
      export class TestComponent {}
    `;
    const output = stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'test',
        template: require('./test.component.html'),
        styles: ["p { color: red; }", require('./test-1.component.css')],
      })
      export class TestComponent {}
    `;

    expectTransformation(input, output, {
      urlMode: ReplacerMode.Require,
      transformContent: (content, inline) => {
        expect(content).toBe('p { color: blue; }');
        expect(inline).toBe(true);

        return 'p { color: red; }';
      },
    });
  });

});
