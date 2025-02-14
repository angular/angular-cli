/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable import/no-extraneous-dependencies */
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import * as path from 'node:path';
import { NodeWorkflow } from './node-workflow';

describe('NodeWorkflow', () => {
  // TODO: this test seems to either not work on windows or on linux.
  xit('works', (done) => {
    const workflow = new NodeWorkflow(new NodeJsSyncHost(), { dryRun: true });
    const collection = path.join(__dirname, '../../../../schematics/angular/package.json');

    workflow
      .execute({
        collection,
        schematic: 'ng-new',
        options: { name: 'workflow-test', version: '6.0.0-rc.4' },
      })
      .toPromise()
      .then(done, done.fail);
  });
});
