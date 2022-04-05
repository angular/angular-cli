/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { MissingTargetChoice } from '../../command-builder/architect-base-command-module';
import { ArchitectCommandModule } from '../../command-builder/architect-command-module';
import { CommandModuleImplementation } from '../../command-builder/command-module';

export class E2eCommandModule
  extends ArchitectCommandModule
  implements CommandModuleImplementation
{
  override missingTargetChoices: MissingTargetChoice[] = [
    {
      name: 'Cypress',
      value: '@cypress/schematic',
    },
    {
      name: 'Nightwatch',
      value: '@nightwatch/schematics',
    },
    {
      name: 'WebdriverIO',
      value: '@wdio/schematics',
    },
  ];

  multiTarget = true;
  command = 'e2e [project]';
  aliases = ['e'];
  describe = 'Builds and serves an Angular application, then runs end-to-end tests.';
  longDescriptionPath?: string;
}
