import { migrateLegacyGlobalConfig } from '@angular/cli/utilities/config';
import * as mockFs from 'mock-fs';
import * as fs from 'fs';
import * as os from 'os';
import {join} from 'path';


const homedir = os.homedir();
describe('migrateLegacyGlobalConfig', () => {
  let validConfig: any;
  beforeEach(() => {
    validConfig = {
      packageManager: 'yarn',
      defaults: {
        schematics: {
          collection: 'collection name'
        }
      },
      warnings: {
        versionMismatch: true,
        typescriptMismatch: true
      }
    };
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('should return false if old config does not exist', () => {
    mockFs({});
    const results = migrateLegacyGlobalConfig();
    expect(results).toEqual(false);
  });

  it('should convert values to new config file', () => {
    mockFs({
      [join(homedir, '.angular-cli.json')]: JSON.stringify(validConfig)
    });
    const results = migrateLegacyGlobalConfig();
    expect(results).toEqual(true);
    const content = fs.readFileSync(join(homedir, '.angular-config.json'), 'utf-8');
    const newConfig = JSON.parse(content);
    expect(newConfig.cli.packageManager).toEqual('yarn');
    expect(newConfig.cli.defaultCollection).toEqual('collection name');
    expect(newConfig.cli.warnings.versionMismatch).toEqual(true);
    expect(newConfig.cli.warnings.typescriptMismatch).toEqual(true);
  });
});
