/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {JsonObject} from '@angular-devkit/core';
import {EmptyTree} from '@angular-devkit/schematics';
import {SchematicTestRunner, UnitTestTree} from '@angular-devkit/schematics/testing';

const SCHEMATIC_NAME = 'fix-invalid-interpolations';

fdescribe(`Fix invalid interpolations. ${SCHEMATIC_NAME}`, () => {
  const schematicRunner = new SchematicTestRunner(
      'migrations',
      require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
  });

  it(`should replace interpolations with only one terminating brace`,
     async () => {
       tree.create('/test.html', `
         <div>{{ 1 + 2 }</div> {{ 5 + 6 }
       `);

       const newTree =
           await schematicRunner.runSchematicAsync(SCHEMATIC_NAME, {}, tree)
               .toPromise();
       expect(newTree.readContent('/test.html')).toBe(`
         <div>{{ 1 + 2 }}</div> {{ 5 + 6 }}
       `);
     });

  it(`should replace interpolations with comment between terminating braces`,
     async () => {
       tree.create('/test.html', `
         {{ 1 + 2 }<!---->} is a literal
         <span>{{ 3 }<!-- so is this one -->}</span>
       `);

       const newTree =
           await schematicRunner.runSchematicAsync(SCHEMATIC_NAME, {}, tree)
               .toPromise();
       expect(newTree.readContent('/test.html')).toBe(`
         {{ '{{' }} 1 + 2 {{ '}}' }} is a literal
         <span>{{ '{{' }} 3 {{ '}}' }}</span>
       `);
     });

  it(`should replace mixed types of invalid interpolations`, async () => {
    tree.create('/test.html', `
      {{ 1 + 2 }<!---->}
      {{ 1 + 2 }
    `);

    const newTree =
        await schematicRunner.runSchematicAsync(SCHEMATIC_NAME, {}, tree)
            .toPromise();
    expect(newTree.readContent('/test.html')).toBe(`
      {{ '{{' }} 1 + 2 {{ '}}' }}
      {{ 1 + 2 }}
    `);
  });

  it(`should not replace valid interpolations`, async () => {
    const contents = `
      {{ 1 + 2 }}
      <span>{{ 3 }} or {{ '{' + "a" + '}' }}</span> or {{ "{{" + "b" + "}}" }}
    `;
    tree.create('/test.html', contents);

    const newTree =
        await schematicRunner.runSchematicAsync(SCHEMATIC_NAME, {}, tree)
            .toPromise();
    expect(newTree.readContent('/test.html')).toBe(contents);
  });

  it(`should replace interpolations in inline templates`, async () => {
    tree.create('/test.ts', `
      @Component({
        template: \`
          {{ 1 + 2 }<!---->}
          {{ 1 + 2 }
        \`;
      })
      class Test {}

      @Component({
        template: \`
          {{ 1 + 2 }<!---->}
          {{ 1 + 2 }
        \`;
      })
      class Test2 {}
    `);

    const newTree =
        await schematicRunner.runSchematicAsync(SCHEMATIC_NAME, {}, tree)
            .toPromise();
    expect(newTree.readContent('/test.ts')).toBe(`
      @Component({
        template: \`
          {{ '{{' }} 1 + 2 {{ '}}' }}
          {{ 1 + 2 }}
        \`;
      })
      class Test {}

      @Component({
        template: \`
          {{ '{{' }} 1 + 2 {{ '}}' }}
          {{ 1 + 2 }}
        \`;
      })
      class Test2 {}
    `);
  });
});
