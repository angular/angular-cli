/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { TargetSpecifier } from '@angular-devkit/architect';
import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { Arguments } from '../models/interface';
import { Schema as LintCommandSchema } from './lint';

export class LintCommand extends ArchitectCommand<LintCommandSchema> {
  public readonly target = 'lint';
  public readonly multiTarget = true;

  protected async runSingleTarget(targetSpec: TargetSpecifier, options: string[]) {
    this.logger.info(`Linting ${JSON.stringify(targetSpec.project)}...`);

    return super.runSingleTarget(targetSpec, options);
  }

  public async run(options: ArchitectCommandOptions & Arguments) {
    return this.runArchitectTarget(options);
  }
}
