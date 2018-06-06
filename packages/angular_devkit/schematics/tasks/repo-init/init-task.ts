/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { TaskConfiguration, TaskConfigurationGenerator } from '../../src';
import { RepositoryInitializerName, RepositoryInitializerTaskOptions } from './options';

export interface CommitOptions {
  message?: string;
  name?: string;
  email?: string;
}

export class RepositoryInitializerTask
  implements TaskConfigurationGenerator<RepositoryInitializerTaskOptions> {

  constructor(public workingDirectory?: string, public commitOptions?: CommitOptions) {}

  toConfiguration(): TaskConfiguration<RepositoryInitializerTaskOptions> {
    return {
      name: RepositoryInitializerName,
      options: {
        commit: !!this.commitOptions,
        workingDirectory: this.workingDirectory,
        authorName: this.commitOptions && this.commitOptions.name,
        authorEmail: this.commitOptions && this.commitOptions.email,
        message: this.commitOptions && this.commitOptions.message,
      },
    };
  }
}
