/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { CommandModuleConstructor } from '../command-builder/utilities/command';

export type CommandNames =
  | 'add'
  | 'analytics'
  | 'build'
  | 'cache'
  | 'completion'
  | 'config'
  | 'deploy'
  | 'doc'
  | 'e2e'
  | 'extract-i18n'
  | 'generate'
  | 'lint'
  | 'make-this-awesome'
  | 'new'
  | 'run'
  | 'serve'
  | 'test'
  | 'update'
  | 'version';

export interface CommandConfig {
  aliases?: string[];
  factory: () => Promise<{ default: CommandModuleConstructor }>;
}

export const RootCommands: Record<
  /* Command */ CommandNames & string,
  /* Command Config */ CommandConfig
> = {
  'add': {
    factory: () => import('./add/cli'),
  },
  'analytics': {
    factory: () => import('./analytics/cli'),
  },
  'build': {
    factory: () => import('./build/cli'),
    aliases: ['b'],
  },
  'cache': {
    factory: () => import('./cache/cli'),
  },
  'completion': {
    factory: () => import('./completion/cli'),
  },
  'config': {
    factory: () => import('./config/cli'),
  },
  'deploy': {
    factory: () => import('./deploy/cli'),
  },
  'doc': {
    factory: () => import('./doc/cli'),
    aliases: ['d'],
  },
  'e2e': {
    factory: () => import('./e2e/cli'),
    aliases: ['e'],
  },
  'extract-i18n': {
    factory: () => import('./extract-i18n/cli'),
  },
  'generate': {
    factory: () => import('./generate/cli'),
    aliases: ['g'],
  },
  'lint': {
    factory: () => import('./lint/cli'),
  },
  'make-this-awesome': {
    factory: () => import('./make-this-awesome/cli'),
  },
  'new': {
    factory: () => import('./new/cli'),
    aliases: ['n'],
  },
  'run': {
    factory: () => import('./run/cli'),
  },
  'serve': {
    factory: () => import('./serve/cli'),
    aliases: ['s'],
  },
  'test': {
    factory: () => import('./test/cli'),
    aliases: ['t'],
  },
  'update': {
    factory: () => import('./update/cli'),
  },
  'version': {
    factory: () => import('./version/cli'),
    aliases: ['v'],
  },
};

export const RootCommandsAliases = Object.values(RootCommands).reduce((prev, current) => {
  current.aliases?.forEach((alias) => {
    prev[alias] = current;
  });

  return prev;
}, {} as Record<string, CommandConfig>);
