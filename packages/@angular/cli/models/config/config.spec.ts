import {CliConfig} from './config';
import * as fs from 'fs';
import * as path from 'path';
import {CliConfig as ConfigInterface} from './spec-schema';


describe('Config', () => {
  let schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'spec-schema.json'), 'utf-8'));

  it('works', () => {
    const cliConfig = new CliConfig(null, schema, <ConfigInterface>{
      requiredKey: 1,
      stringKey: 'stringValue'
    });
    const config = cliConfig.config;

    expect(config.requiredKey).toEqual(1);
    expect(config.stringKey).toEqual('stringValue');
    expect(config.stringKeyDefault).toEqual('defaultValue');
    expect(config.booleanKey).toEqual(undefined);

    expect(config.arrayKey1).toEqual(undefined);
    expect(() => config.arrayKey1[0]).toThrow();

    expect(config.numberKey).toEqual(undefined);
    config.numberKey = 33;
    expect(config.numberKey).toEqual(33);
  });

  describe('fromConfigPath', () => {
    const TEST_CONFIG_NAME = 'test-config.json';
    let configContent: string;

    beforeEach(() => {
      spyOn(fs, 'existsSync').and.returnValue(true);
      spyOn(fs, 'readFileSync').and.callFake((fileName: string) => {
        if (fileName === TEST_CONFIG_NAME) {
          return configContent;
        } else {
          return JSON.stringify(schema);
        }
      });
    });

    function callFromConfigPath(content: string) {
      configContent = content;
      (fs.readFileSync as jasmine.Spy).calls.reset();
      const config = CliConfig.fromConfigPath<ConfigInterface>(TEST_CONFIG_NAME);
      expect(fs.readFileSync).toHaveBeenCalledTimes(2);
      return config;
    }

    it('tolerates comments in JSON', () => {
      const config = callFromConfigPath(`{
        // comment
        "requiredKey" /* comment */ : 2 // comment
        /* comment */
      } // and here`);
      expect(config.get('requiredKey')).toEqual(2);
    });

    it('tolerates unquoted keys in JSON', () => {
      const config = callFromConfigPath(`{ requiredKey: 3 }`);
      expect(config.get('requiredKey')).toEqual(3);
    });

    it('tolerates trailing commas in JSON', () => {
      const config = callFromConfigPath(`{ "requiredKey": 2, }`);
      expect(config.get('requiredKey')).toEqual(2);
    });
  });

  describe('Get', () => {
    it('works', () => {
      const config = new CliConfig(null, schema, <ConfigInterface>{
        requiredKey: 1,
        stringKey: 'stringValue'
      });

      expect(JSON.parse(JSON.stringify(config.get()))).toEqual({
        requiredKey: 1,
        stringKeyDefault: 'defaultValue',
        stringKey: 'stringValue'
      });
      expect(config.get('requiredKey')).toEqual(1);
      expect(config.get('stringKey')).toEqual('stringValue');
      expect(config.get('booleanKey')).toEqual(undefined);
    });

    it('will never throw', () => {
      const config = new CliConfig(null, schema, <ConfigInterface>{
        requiredKey: 1
      });

      expect(config.get('arrayKey1')).toEqual(undefined);
      expect(config.get('arrayKey2[0]')).toEqual(undefined);
      expect(config.get('arrayKey2[0].stringKey')).toEqual(undefined);
      expect(config.get('arrayKey2[0].stringKey.a.b.c.d')).toEqual(undefined);
    });
  });

  it('handles fallback values', () => {
    const cliConfig = new CliConfig(null, schema,
      <ConfigInterface>{ requiredKey: 1 },
      [
        <ConfigInterface>{ requiredKey: 1, stringKey: 'stringValue' },
        <ConfigInterface>{ requiredKey: 1, numberKey: 1 }
      ]
    );

    // Check on string.
    expect(cliConfig.isDefined('stringKey')).toEqual(false);
    expect(cliConfig.config.stringKey).toEqual('stringValue');

    cliConfig.config.stringKey = 'stringValue2';
    expect(cliConfig.isDefined('stringKey')).toEqual(true);
    expect(cliConfig.config.stringKey).toEqual('stringValue2');

    cliConfig.deletePath('stringKey');
    expect(cliConfig.isDefined('stringKey')).toEqual(false);
    expect(cliConfig.config.stringKey).toEqual('stringValue');

    // Check on number (which is 2 fallbacks behind)
    expect(cliConfig.isDefined('numberKey')).toEqual(false);
    expect(cliConfig.config.numberKey).toEqual(1);

    cliConfig.config.numberKey = 2;
    expect(cliConfig.isDefined('numberKey')).toEqual(true);
    expect(cliConfig.config.numberKey).toEqual(2);

    cliConfig.deletePath('numberKey');
    expect(cliConfig.isDefined('numberKey')).toEqual(false);
    expect(cliConfig.config.numberKey).toEqual(1);
  });

  it('saves', () => {
    const jsonObject = {
      requiredKey: 1,
      arrayKey2: [{ stringKey: 'value1' }, { stringKey: 'value2' }]
    };

    const cliConfig = new CliConfig(null, schema,
      <ConfigInterface>jsonObject, [
        <ConfigInterface>{ requiredKey: 1, stringKey: 'stringValue' },
        <ConfigInterface>{ requiredKey: 1, numberKey: 1 }
      ]
    );

    expect(cliConfig.config.arrayKey2[0].stringKey).toEqual('value1');
    expect(JSON.stringify(JSON.parse(cliConfig.serialize()))).toEqual(JSON.stringify(jsonObject));
  });
});
