/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { debugPerformance } from '../../utils/environment-options';

let cumulativeDurations: Map<string, number> | undefined;

export function resetCumulativeDurations(): void {
  cumulativeDurations?.clear();
}

export function logCumulativeDurations(): void {
  if (!debugPerformance || !cumulativeDurations) {
    return;
  }

  for (const [name, duration] of cumulativeDurations) {
    // eslint-disable-next-line no-console
    console.log(`DURATION[${name}]: ${duration} seconds`);
  }
}

function recordDuration(name: string, startTime: bigint, cumulative?: boolean): void {
  const duration = Number(process.hrtime.bigint() - startTime) / 10 ** 9;
  if (cumulative) {
    cumulativeDurations ??= new Map<string, number>();
    cumulativeDurations.set(name, (cumulativeDurations.get(name) ?? 0) + duration);
  } else {
    // eslint-disable-next-line no-console
    console.log(`DURATION[${name}]: ${duration} seconds`);
  }
}

export async function profileAsync<T>(
  name: string,
  action: () => Promise<T>,
  cumulative?: boolean,
): Promise<T> {
  if (!debugPerformance) {
    return action();
  }

  const startTime = process.hrtime.bigint();
  try {
    return await action();
  } finally {
    recordDuration(name, startTime, cumulative);
  }
}

export function profileSync<T>(name: string, action: () => T, cumulative?: boolean): T {
  if (!debugPerformance) {
    return action();
  }

  const startTime = process.hrtime.bigint();
  try {
    return action();
  } finally {
    recordDuration(name, startTime, cumulative);
  }
}
