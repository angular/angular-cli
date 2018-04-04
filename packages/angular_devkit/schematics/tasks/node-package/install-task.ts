/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { TaskConfiguration, TaskConfigurationGenerator } from '../../src';
import { NodePackageName, NodePackageTaskOptions } from './options';

export class NodePackageInstallTaskOptions {
  packageManager: string;
  workingDirectory: string;
  quiet: boolean;
}

export class NodePackageInstallTask implements TaskConfigurationGenerator<NodePackageTaskOptions> {
  quiet = true;
  workingDirectory?: string;
  packageManager?: string;

  constructor(workingDirectory?: string);
  constructor(options: Partial<NodePackageInstallTaskOptions>);
  constructor(options?: string | Partial<NodePackageInstallTaskOptions>) {
    if (typeof options === 'string') {
      this.workingDirectory = options;
    } else if (typeof options === 'object') {
      if (options.quiet != undefined) {
        this.quiet = options.quiet;
      }
      if (options.workingDirectory != undefined) {
        this.workingDirectory = options.workingDirectory;
      }
      if (options.packageManager != undefined) {
        this.packageManager = options.packageManager;
      }
    }
  }

  toConfiguration(): TaskConfiguration<NodePackageTaskOptions> {
    return {
      name: NodePackageName,
      options: {
        command: 'install',
        quiet: this.quiet,
        workingDirectory: this.workingDirectory,
        packageManager: this.packageManager,
      },
    };
  }
}
