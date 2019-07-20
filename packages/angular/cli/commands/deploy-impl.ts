/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { Arguments } from '../models/interface';
import { Schema as DeployCommandSchema } from './deploy';

const BuilderMissing = `

Cannot find "deploy" target for the specified project.

You should add a package that implements deployment capabilities for your
favorite platform.

For example:
  ng add @angular/fire
  ng add @azure/ng-deploy
  ng add @zeit/ng-deploy

Find more packages on npm https://www.npmjs.com/search?q=ng%20deploy
`;

export class DeployCommand extends ArchitectCommand<DeployCommandSchema> {
  public readonly target = 'deploy';
  public readonly missingTargetError = BuilderMissing;

  public async run(options: ArchitectCommandOptions & Arguments) {
    return this.runArchitectTarget(options);
  }

  public async initialize(options: DeployCommandSchema & Arguments): Promise<void> {
    if (!options.help) {
      return super.initialize(options);
    }
  }

  async reportAnalytics(
    paths: string[],
    options: DeployCommandSchema & Arguments,
    dimensions: (boolean | number | string)[] = [],
    metrics: (boolean | number | string)[] = [],
  ): Promise<void> {
    return super.reportAnalytics(paths, options, dimensions, metrics);
  }
}
