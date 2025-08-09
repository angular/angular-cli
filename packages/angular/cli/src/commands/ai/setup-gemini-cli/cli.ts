/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { cp, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Argv } from 'yargs';
import {
  CommandModule,
  CommandModuleImplementation,
  CommandScope,
  Options,
} from '../../../command-builder/command-module';

export default class SetupGeminiCliModule
  extends CommandModule
  implements CommandModuleImplementation
{
  command = 'setup-gemini-cli';
  describe = 'Sets up Gemini CLI with the official Angular extension.';
  longDescriptionPath?: string | undefined;

  override scope = CommandScope.Both;

  builder(localYargs: Argv): Argv {
    return localYargs.strict();
  }

  async run(_options: Options<{}>): Promise<void> {
    const extensionDir = join(__dirname, './extension');
    const extensionUserDir = join(homedir(), '.gemini', 'extensions', 'angular');

    await mkdir(extensionUserDir, { recursive: true });
    await cp(extensionDir, extensionUserDir, { recursive: true, dereference: true });

    this.context.logger.info(`✅ Installed the Angular Gemini CLI extension.`);
  }
}
