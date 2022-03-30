/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { ArchitectCommandModule } from '../../command-builder/architect-command-module';
import { CommandModuleImplementation } from '../../command-builder/command-module';

export class E2eCommandModule
  extends ArchitectCommandModule
  implements CommandModuleImplementation
{
  multiTarget = true;
  override missingErrorTarget = tags.stripIndents`
  Cannot find "e2e" target for the specified project.

  You should add a package that implements end-to-end testing capabilities.

  For example:
    Cypress: ng add @cypress/schematic
    Nightwatch: ng add @nightwatch/schematics
    WebdriverIO: ng add @wdio/schematics

  More options will be added to the list as they become available.
  `;

  command = 'e2e [project]';
  aliases = ['e'];
  describe = 'Builds and serves an Angular application, then runs end-to-end tests.';
  longDescriptionPath?: string;
}
