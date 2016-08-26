import {CliConfig} from '../../addon/ng2/models/config/config';
import * as fs from 'fs';
import * as path from 'path';
import {CliConfig as ConfigInterface} from './spec-schema';

const expect = require('chai').expect;


describe('Config', () => {
  let schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'spec-schema.json'), 'utf-8'));

  it('works', () => {
    const cliConfig = new CliConfig(null, schema, <ConfigInterface>{
      requiredKey: 1,
      stringKey: 'stringValue'
    });
    const config = cliConfig.config;

    expect(config.requiredKey).to.equal(1);
    expect(config.stringKey).to.equal('stringValue');
    expect(config.stringKeyDefault).to.equal('defaultValue');
    expect(config.booleanKey).to.equal(undefined);

    expect(config.arrayKey1).to.equal(undefined);
    expect(() => config.arrayKey1[0]).to.throw();

    expect(config.numberKey).to.equal(undefined);
    config.numberKey = 33;
    expect(config.numberKey).to.equal(33);
  });

  describe('Get', () => {
    it('works', () => {
      const config = new CliConfig(null, schema, <ConfigInterface>{
        requiredKey: 1,
        stringKey: 'stringValue'
      });

      expect(config.get('requiredKey')).to.equal(1);
      expect(config.get('stringKey')).to.equal('stringValue');
      expect(config.get('booleanKey')).to.equal(undefined);
    });

    it('will never throw', () => {
      const config = new CliConfig(null, schema, <ConfigInterface>{
        requiredKey: 1
      });

      expect(config.get('arrayKey1')).to.equal(undefined);
      expect(config.get('arrayKey2[0]')).to.equal(undefined);
      expect(config.get('arrayKey2[0].stringKey')).to.equal(undefined);
      expect(config.get('arrayKey2[0].stringKey.a.b.c.d')).to.equal(undefined);
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
    expect(cliConfig.isDefined('stringKey')).to.equal(false);
    expect(cliConfig.config.stringKey).to.equal('stringValue');

    cliConfig.config.stringKey = 'stringValue2';
    expect(cliConfig.isDefined('stringKey')).to.equal(true);
    expect(cliConfig.config.stringKey).to.equal('stringValue2');

    cliConfig.deletePath('stringKey');
    expect(cliConfig.isDefined('stringKey')).to.equal(false);
    expect(cliConfig.config.stringKey).to.equal('stringValue');

    // Check on number (which is 2 fallbacks behind)
    expect(cliConfig.isDefined('numberKey')).to.equal(false);
    expect(cliConfig.config.numberKey).to.equal(1);

    cliConfig.config.numberKey = 2;
    expect(cliConfig.isDefined('numberKey')).to.equal(true);
    expect(cliConfig.config.numberKey).to.equal(2);

    cliConfig.deletePath('numberKey');
    expect(cliConfig.isDefined('numberKey')).to.equal(false);
    expect(cliConfig.config.numberKey).to.equal(1);
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

    expect(cliConfig.config.arrayKey2[0].stringKey).to.equal('value1');
    expect(JSON.stringify(JSON.parse(cliConfig.serialize()))).to.equal(JSON.stringify(jsonObject));
  });
});
