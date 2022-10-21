/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { debugPerformance } from '../../utils/environment-options';

let cumulativeDurations: Map<string, number[]> | undefined;

export function resetCumulativeDurations(): void {
  cumulativeDurations?.clear();
}

export function logCumulativeDurations(): void {
  if (!debugPerformance || !cumulativeDurations) {
    return;
  }

  for (const [name, durations] of cumulativeDurations) {
    let total = 0;
    let min;
    let max;
    for (const duration of durations) {
      total += duration;
      if (min === undefined || duration < min) {
        min = duration;
      }
      if (max === undefined || duration > max) {
        max = duration;
      }
    }
    const average = total / durations.length;
    // eslint-disable-next-line no-console
    console.log(
      `DURATION[${name}]: ${total.toFixed(9)}s [count: ${durations.length}; avg: ${average.toFixed(
        9,
      )}s; min: ${min?.toFixed(9)}s; max: ${max?.toFixed(9)}s]`,
    );
  }
}

function recordDuration(name: string, startTime: bigint, cumulative?: boolean): void {
  const duration = Number(process.hrtime.bigint() - startTime) / 10 ** 9;
  if (cumulative) {
    cumulativeDurations ??= new Map<string, number[]>();
    const durations = cumulativeDurations.get(name) ?? [];
    durations.push(duration);
    cumulativeDurations.set(name, durations);
  } else {
    // eslint-disable-next-line no-console
    console.log(`DURATION[${name}]: ${duration.toFixed(9)}s`);
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
