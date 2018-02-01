import {readFileSync} from 'fs';
import {join} from 'path';

import {RootSchemaTreeNode} from './schema-tree';


describe('@ngtools/json-schema', () => {

  describe('OneOfSchemaTreeNode', () => {
    const schemaJsonFilePath = join(__dirname, '../tests/schema1.json');
    const schemaJson = JSON.parse(readFileSync(schemaJsonFilePath, 'utf-8'));
    const valueJsonFilePath = join(__dirname, '../tests/value1-1.json');
    const valueJson = JSON.parse(readFileSync(valueJsonFilePath, 'utf-8'));


    it('works', () => {
      const proto: any = Object.create(null);
      // tslint:disable-next-line
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

    it('returns undefined for values that are non-existent', () => {
      const proto: any = Object.create(null);
      const root = new RootSchemaTreeNode(proto, { value: valueJson, schema: schemaJson });

      const value = root.children['objectKey1'].children['objectKey'].children['stringKey'].get();
      expect(value).toBe(undefined);
    });
  });


  describe('EnumSchemaTreeNode', () => {
    const schemaJsonFilePath = join(__dirname, '../tests/schema2.json');
    const schemaJson = JSON.parse(readFileSync(schemaJsonFilePath, 'utf-8'));
    const valueJsonFilePath = join(__dirname, '../tests/value2-1.json');
    const valueJson = JSON.parse(readFileSync(valueJsonFilePath, 'utf-8'));


    it('works', () => {
      const proto: any = Object.create(null);
      // tslint:disable-next-line
      new RootSchemaTreeNode(proto, {
        value: valueJson,
        schema: schemaJson
      });

      expect(proto.a instanceof Array).toBe(true);
      expect(proto.a).toEqual(['v1', 'v3']);

      // Set it to a string, which is valid.
      proto.a[0] = 'v2';
      expect(proto.a).toEqual(['v2', 'v3']);
    });

    it('supports default values', () => {
      const proto: any = Object.create(null);
      const schema = new RootSchemaTreeNode(proto, {
        value: valueJson,
        schema: schemaJson
      });

      expect(schema.children['b'].get()).toEqual('default');
    });


    it('should throw error when setting invalid value', () => {
      const proto: any = Object.create(null);
      // tslint:disable-next-line
      new RootSchemaTreeNode(proto, {
        value: valueJson,
        schema: schemaJson
      });

      try {
        proto.a[0] = 'INVALID';
      } catch (error) {
        expect(error.message).toBe('Invalid value can only be one of these: v1,v2,v3');
      }
    });

  });

});
