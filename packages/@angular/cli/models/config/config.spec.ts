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

  describe('Get', () => {
    it('works', () => {
      const config = new CliConfig(null, schema, <ConfigInterface>{
        requiredKey: 1,
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
