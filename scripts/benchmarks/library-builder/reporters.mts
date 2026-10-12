/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// Pure output formatting for the library-builder benchmark's measurements. No console/file I/O
// here -- `index.mts` owns deciding when and where to print or write what this module formats.

import type { BuildMeasurement } from './harness.mts';

export function formatJsonReport(measurements: BuildMeasurement[]): string {
  return JSON.stringify(measurements, null, 2);
}

export function formatCsvReport(measurements: BuildMeasurement[]): string {
  const header = 'layout,entryPoints,iteration,durationMs,status';
  const rows = measurements.map((m) =>
    [m.layout, m.entryPoints, m.iteration, m.durationMs.toFixed(2), m.status].join(','),
  );

  return [header, ...rows].join('\n') + '\n';
}
