import {ng} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';
import { expectFileToExist } from '../../../utils/fs';
import * as path from 'path';
import { homedir } from 'os';


export default function() {
  return Promise.resolve()
    .then(() => expectToFail(() => ng('config', '--global', 'schematics.@schematics/angular.component.inlineStyle')))
    .then(() => ng('config', '--global', 'schematics.@schematics/angular.component.inlineStyle', 'false'))
    .then(() => ng('config', '--global', 'schematics.@schematics/angular.component.inlineStyle'))
    .then(({ stdout }) => {
      if (!stdout.match(/false\n?/)) {
        throw new Error(`Expected "false", received "${JSON.stringify(stdout)}".`);
      }
    })
    .then(() => expectToFail(() => {
      return ng('config', '--global', 'schematics.@schematics/angular.component.inlineStyle', 'INVALID_BOOLEAN');
    }))
    .then(() => ng('config', '--global', 'schematics.@schematics/angular.component.inlineStyle', 'true'))
    .then(() => ng('config', '--global', 'schematics.@schematics/angular.component.inlineStyle'))
    .then(({ stdout }) => {
      if (!stdout.match(/true\n?/)) {
        throw new Error(`Expected "true", received "${JSON.stringify(stdout)}".`);
      }
    })
    .then(() => expectToFail(() => ng('config', '--global', 'cli.warnings.notreal', 'true')))
    .then(() => ng('config', '--global', 'cli.warnings.versionMismatch', 'false'))
    .then(() => expectFileToExist(path.join(homedir(), '.angular.json')));
}
