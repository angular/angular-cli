/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Question } from 'inquirer';
import { isTTY } from './tty';

export async function askConfirmation(
  message: string,
  defaultResponse: boolean,
  noTTYResponse?: boolean,
): Promise<boolean> {
  if (!isTTY()) {
    return noTTYResponse ?? defaultResponse;
  }
  const question: Question = {
    type: 'confirm',
    name: 'confirmation',
    prefix: '',
    message,
    default: defaultResponse,
  };

  const { prompt } = await import('inquirer');
  const answers = await prompt([question]);

  return answers['confirmation'];
}
