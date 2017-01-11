import * as path from 'path';
import * as fs from 'fs';

import {JsonSerializer} from './json';
import {SchemaClassFactory} from '../schema-class-factory';
import {RootSchemaTreeNode} from '../schema-tree';


describe('JsonSerializer', () => {
  const schemaJsonFilePath = path.join(__dirname, '../../tests/schema1.json');
  const schemaJson = JSON.parse(fs.readFileSync(schemaJsonFilePath, 'utf-8'));
  const valueJsonFilePath = path.join(__dirname, '../../tests/value1.json');
  const valueJson = JSON.parse(fs.readFileSync(valueJsonFilePath, 'utf-8'));

  const schemaClass = new (SchemaClassFactory(schemaJson))(valueJson);
  const schema: RootSchemaTreeNode = schemaClass.$$schema();

  it('works', () => {
    let str = '';
    function writer(s: string) {
      str += s;
    }

    const serializer = new JsonSerializer(writer);

    serializer.start();
    schema.serialize(serializer);
    serializer.end();

    expect(JSON.stringify(JSON.parse(str))).toEqual(JSON.stringify(valueJson));
  });
});
