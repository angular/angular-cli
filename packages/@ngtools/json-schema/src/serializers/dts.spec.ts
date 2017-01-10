import * as path from 'path';
import * as fs from 'fs';

import {DTsSerializer} from './dts';
import {SchemaClassFactory} from '../schema-class-factory';
import {RootSchemaTreeNode} from '../schema-tree';


describe('DtsSerializer', () => {
  const schemaJsonFilePath = path.join(__dirname, '../../tests/schema1.json');
  const schemaJson = JSON.parse(fs.readFileSync(schemaJsonFilePath, 'utf-8'));
  const schemaClass = new (SchemaClassFactory(schemaJson))({});
  const schema: RootSchemaTreeNode = schemaClass.$$schema();

  it('works', () => {
    let str = '';
    function writer(s: string) {
      str += s;
    }

    const serializer = new DTsSerializer(writer, 'HelloWorld');

    serializer.start();
    schema.serialize(serializer);
    serializer.end();

    // Expect optional properties to be followed by `?`
    expect(str).toMatch(/stringKey\?/);
  });
});
