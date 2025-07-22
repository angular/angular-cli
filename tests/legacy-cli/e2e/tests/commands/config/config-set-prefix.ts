import assert from 'node:assert/strict';
import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default function () {
  return Promise.resolve()
    .then(() => expectToFail(() => ng('config', 'schematics.@schematics/angular.component.prefix')))
    .then(() => ng('config', 'schematics.@schematics/angular.component.prefix', 'new-prefix'))
    .then(() => ng('config', 'schematics.@schematics/angular.component.prefix'))
    .then(({ stdout }) => {
      assert.match(stdout, /new-prefix/);
    });
}
