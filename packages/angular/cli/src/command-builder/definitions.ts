/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import type { Argv, CamelCaseKey } from 'yargs';
import { AngularWorkspace } from '../utilities/config';
import { PackageManagerUtils } from '../utilities/package-manager';

export enum CommandScope {
  /** Command can only run inside an Angular workspace. */
  In,

  /** Command can only run outside an Angular workspace. */
  Out,

  /** Command can run inside and outside an Angular workspace. */
  Both,
}

export interface CommandContext {
  currentDirectory: string;
  root: string;
  workspace?: AngularWorkspace;
  globalConfiguration: AngularWorkspace;
  logger: logging.Logger;
  packageManager: PackageManagerUtils;
  yargsInstance: Argv<{}>;

  /** Arguments parsed in free-from without parser configuration. */
  args: {
    positional: string[];
    options: {
      help: boolean;
      jsonHelp: boolean;
      getYargsCompletions: boolean;
    } & Record<string, unknown>;
  };
}

export type Options<T> = { [key in keyof T as CamelCaseKey<key>]: T[key] };

export type OtherOptions = Record<string, unknown>;
