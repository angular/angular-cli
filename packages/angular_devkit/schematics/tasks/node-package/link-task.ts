/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { TaskConfiguration, TaskConfigurationGenerator } from '../../src';
import { NodePackageName, NodePackageTaskOptions } from './options';

export class NodePackageLinkTask implements TaskConfigurationGenerator<NodePackageTaskOptions> {
  quiet = true;

  constructor(public packageName?: string, public workingDirectory?: string) {}

  toConfiguration(): TaskConfiguration<NodePackageTaskOptions> {
    return {
      name: NodePackageName,
      options: {
        command: 'link',
        quiet: this.quiet,
        workingDirectory: this.workingDirectory,
        packageName: this.packageName,
      },
    };
  }
}
