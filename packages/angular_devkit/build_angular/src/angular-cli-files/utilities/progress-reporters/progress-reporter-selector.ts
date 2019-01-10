/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ProgressReporter } from './progress-reporter';
import { SimpleProgressReporter } from './simple-progress-reporter';
import { VerboseProgressReporter } from './verbose-progress-reporter';
import { WebpackDefaultProgressReporter } from './webpack-default-progress-reporter';

const defaultProgressReporter = 'webpack-default';

const factories: {
  // Mapping of string key to factory of a ProgressReporter
  [key: string]: (() => ProgressReporter),
} = {
  'webpack-default': () => new WebpackDefaultProgressReporter(),
  'verbose-colors': () => new VerboseProgressReporter(true),
  'verbose-plain': () => new VerboseProgressReporter(false),
  'simple-plain': () => new SimpleProgressReporter(false),
  'simple-colors': () => new SimpleProgressReporter(true),

};

const aliases: {
  // Mapping of default to factory
  [key: string]: (string),
} = {
  'ci-friendly': 'simple',
  'verbose': 'verbose-colors',
  'simple': 'simple-colors',
  'non-tty': 'simple',
  'tty': 'webpack-default',
};

export function selectProgressReporter(userInput?: string): ProgressReporter {
  if (userInput) {
    if (factories[userInput]) {
      return factories[userInput]();
    }
    if (aliases[userInput]) {
      return selectProgressReporter(aliases[userInput]);
    }
    throw new Error('Could not find progress reporter: ' + userInput);
  } else {
    return selectProgressReporter(defaultProgressReporter);
  }
}
