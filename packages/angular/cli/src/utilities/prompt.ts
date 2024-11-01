/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { isTTY } from './tty';

export async function askConfirmation(
  message: string,
  defaultResponse: boolean,
  noTTYResponse?: boolean,
): Promise<boolean> {
  if (!isTTY()) {
    return noTTYResponse ?? defaultResponse;
  }

  const { confirm } = await import('@inquirer/prompts');
  const answer = await confirm({
    message,
    default: defaultResponse,
    theme: {
      prefix: '',
    },
  });

  return answer;
}

export async function askQuestion(
  message: string,
  choices: { name: string; value: string | null }[],
  defaultResponseIndex: number,
  noTTYResponse: null | string,
): Promise<string | null> {
  if (!isTTY()) {
    return noTTYResponse;
  }

  const { select } = await import('@inquirer/prompts');
  const answer = await select({
    message,
    choices,
    default: defaultResponseIndex,
    theme: {
      prefix: '',
    },
  });

  return answer;
}

export async function askChoices(
  message: string,
  choices: { name: string; value: string; checked?: boolean }[],
  noTTYResponse: string[] | null,
): Promise<string[] | null> {
  if (!isTTY()) {
    return noTTYResponse;
  }

  const { checkbox } = await import('@inquirer/prompts');
  const answers = await checkbox({
    message,
    choices,
    theme: {
      prefix: '',
    },
  });

  return answers;
}
