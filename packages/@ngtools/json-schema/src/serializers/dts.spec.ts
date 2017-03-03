import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import {DTsSerializer} from './dts';
import {SchemaClassFactory} from '../schema-class-factory';
import {RootSchemaTreeNode} from '../schema-tree';


describe('DtsSerializer', () => {
  for (const nb of [1, 2, 3]) {
    it(`works (${nb})`, () => {
      const schemaJsonFilePath = path.join(__dirname, `../../tests/serializer/schema${nb}.json`);
      const schemaJson = JSON.parse(fs.readFileSync(schemaJsonFilePath, 'utf-8'));
      const valueDTsFilePath = path.join(__dirname, `../../tests/serializer/value${nb}.d.ts`);
      const valueDTs = fs.readFileSync(valueDTsFilePath, 'utf-8');
      const valueSourceFile = ts.createSourceFile('test.d.ts', valueDTs, ts.ScriptTarget.Latest);

      const schemaClass = new (SchemaClassFactory(schemaJson))({});
      const schema: RootSchemaTreeNode = schemaClass.$$schema();

      let str = '';
      function writer(s: string) {
        str += s;
      }

      const serializer = new DTsSerializer(writer);

      serializer.start();
      schema.serialize(serializer);
      serializer.end();

      const sourceFile = ts.createSourceFile('test.d.ts', str, ts.ScriptTarget.Latest);
      expect(sourceFile).toEqual(valueSourceFile);
    });
  }
});
