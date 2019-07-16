/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { schema } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { NodeWorkflow } from '@angular-devkit/schematics/tools';
import * as path from 'path';


describe('NodeWorkflow', () => {
  // TODO: this test seems to either not work on windows or on linux.
  xit('works', done => {
    const workflow = new NodeWorkflow(new NodeJsSyncHost(), { dryRun: true });
    const collection = path.join(__dirname, '../../../../schematics/angular/package.json');

    workflow.execute({
      collection,
      schematic: 'ng-new',
      options: { name: 'workflow-test', version: '6.0.0-rc.4' },
    }).toPromise().then(done, done.fail);
  });
});
