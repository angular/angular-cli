import {readFileSync} from 'fs';
import {join} from 'path';

import {RootSchemaTreeNode} from './schema-tree';


describe('SchemaTreeNode', () => {

});


describe('OneOfSchemaTreeNode', () => {
  const schemaJsonFilePath = join(__dirname, '../tests/schema1.json');
  const schemaJson = JSON.parse(readFileSync(schemaJsonFilePath, 'utf-8'));
  const valueJsonFilePath = join(__dirname, '../tests/value1-1.json');
  const valueJson = JSON.parse(readFileSync(valueJsonFilePath, 'utf-8'));


  it('works', () => {
    const proto: any = Object.create(null);
    new RootSchemaTreeNode(proto, {
      value: valueJson,
      schema: schemaJson
    });

    expect(proto.oneOfKey2 instanceof Array).toBe(true);
    expect(proto.oneOfKey2.length).toBe(2);

    // Set it to a string, which is valid.
    proto.oneOfKey2 = 'hello';
    expect(proto.oneOfKey2 instanceof Array).toBe(false);
  });
});

