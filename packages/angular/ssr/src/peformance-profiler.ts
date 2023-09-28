/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

const PERFORMANCE_MARK_PREFIX = '🅰️';

export function printPerformanceLogs(): void {
  let maxWordLength = 0;
  const benchmarks: [step: string, value: string][] = [];

  for (const { name, duration } of performance.getEntriesByType('measure')) {
    if (!name.startsWith(PERFORMANCE_MARK_PREFIX)) {
      continue;
    }

    // `🅰️:Retrieve SSG Page` -> `Retrieve SSG Page:`
    const step = name.slice(PERFORMANCE_MARK_PREFIX.length + 1) + ':';
    if (step.length > maxWordLength) {
      maxWordLength = step.length;
    }

    benchmarks.push([step, `${duration.toFixed(1)}ms`]);
    performance.clearMeasures(name);
  }

  /* eslint-disable no-console */
  console.log('********** Performance results **********');
  for (const [step, value] of benchmarks) {
    const spaces = maxWordLength - step.length + 5;
    console.log(step + ' '.repeat(spaces) + value);
  }
  console.log('*****************************************');
  /* eslint-enable no-console */
}

export async function runMethodAndMeasurePerf<T>(
  label: string,
  asyncMethod: () => Promise<T>,
): Promise<T> {
  const labelName = `${PERFORMANCE_MARK_PREFIX}:${label}`;
  const startLabel = `start:${labelName}`;
  const endLabel = `end:${labelName}`;

  try {
    performance.mark(startLabel);

    return await asyncMethod();
  } finally {
    performance.mark(endLabel);
    performance.measure(labelName, startLabel, endLabel);
    performance.clearMarks(startLabel);
    performance.clearMarks(endLabel);
  }
}

export function noopRunMethodAndMeasurePerf<T>(
  label: string,
  asyncMethod: () => Promise<T>,
): Promise<T> {
  return asyncMethod();
}
