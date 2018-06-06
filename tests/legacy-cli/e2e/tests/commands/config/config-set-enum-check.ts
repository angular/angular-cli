import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function() {

    // These tests require schema querying capabilities
    // .then(() => expectToFail(
    //   () => ng('config', 'schematics.@schematics/angular.component.aaa', 'bbb')),
    // )
    // .then(() => expectToFail(() => ng(
    //   'config',
    //   'schematics.@schematics/angular.component.viewEncapsulation',
    //   'bbb',
    // )))

  await ng(
    'config',
    'schematics.@schematics/angular.component.viewEncapsulation',
    'Emulated',
  );
}
