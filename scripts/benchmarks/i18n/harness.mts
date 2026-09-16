/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import './init-env.mts';

export interface BenchmarkScenario {
  name: string;
  description: string;
  inputSizeBytes: number;
  localeCount: number;
  run(iteration: number): Promise<void>;
  setup?(): Promise<void>;
  teardown?(): Promise<void>;
}

export interface ScenarioResult {
  name: string;
  description: string;
  inputSizeBytes: number;
  localeCount: number;
  iterations: number;
  warmup: number;
  durationsMs: number[];
  minMs: number;
  maxMs: number;
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  stdDevMs: number;
  throughputMBps: number;
  peakRssBytes: number;
  peakHeapBytes: number;
  rssDeltaBytes: number;
  heapUsedDeltaBytes: number;
}

export interface BenchmarkRunOptions {
  warmup?: number;
  iterations?: number;
}

function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

export async function runScenario(
  scenario: BenchmarkScenario,
  options: BenchmarkRunOptions = {},
): Promise<ScenarioResult> {
  const warmup = options.warmup ?? 2;
  const iterations = options.iterations ?? 5;

  try {
    await scenario.setup?.();

    // Warmup phase
    for (let w = 0; w < warmup; w++) {
      // Force GC if available between warmups
      global.gc?.();
      await scenario.run(-(w + 1));
    }

    // Measurement phase
    const durationsMs: number[] = [];
    let peakRssBytes = 0;
    let peakHeapBytes = 0;
    let maxRssDeltaBytes = 0;
    let initialHeap = 0;
    let finalHeap = 0;

    for (let i = 0; i < iterations; i++) {
      global.gc?.();

      const memBefore = process.memoryUsage();
      if (i === 0) {
        initialHeap = memBefore.heapUsed;
      }

      const start = performance.now();
      await scenario.run(i);
      const duration = performance.now() - start;

      durationsMs.push(duration);

      const memAfter = process.memoryUsage();
      if (memAfter.rss > peakRssBytes) {
        peakRssBytes = memAfter.rss;
      }
      if (memAfter.heapUsed > peakHeapBytes) {
        peakHeapBytes = memAfter.heapUsed;
      }
      const rssDelta = Math.max(0, memAfter.rss - memBefore.rss);
      if (rssDelta > maxRssDeltaBytes) {
        maxRssDeltaBytes = rssDelta;
      }

      // Force GC immediately after iteration to clean main thread isolate
      global.gc?.();
      finalHeap = process.memoryUsage().heapUsed;
    }

    // Sort ascending for percentile computation
    const sorted = [...durationsMs].sort((a, b) => a - b);
    const minMs = sorted[0];
    const maxMs = sorted[sorted.length - 1];
    const meanMs = durationsMs.reduce((sum, d) => sum + d, 0) / durationsMs.length;
    const medianMs = calculatePercentile(sorted, 50);
    const p95Ms = calculatePercentile(sorted, 95);

    const variance =
      durationsMs.reduce((sum, d) => sum + Math.pow(d - meanMs, 2), 0) / durationsMs.length;
    const stdDevMs = Math.sqrt(variance);

    // Throughput: total effective processed code volume in MB / mean seconds
    const totalProcessedMb = (scenario.inputSizeBytes * scenario.localeCount) / (1024 * 1024);
    const meanSeconds = meanMs / 1000;
    const throughputMBps = meanSeconds > 0 ? totalProcessedMb / meanSeconds : 0;

    return {
      name: scenario.name,
      description: scenario.description,
      inputSizeBytes: scenario.inputSizeBytes,
      localeCount: scenario.localeCount,
      iterations,
      warmup,
      durationsMs,
      minMs,
      maxMs,
      meanMs,
      medianMs,
      p95Ms,
      stdDevMs,
      throughputMBps,
      peakRssBytes,
      peakHeapBytes,
      rssDeltaBytes: maxRssDeltaBytes,
      heapUsedDeltaBytes: Math.max(0, finalHeap - initialHeap),
    };
  } finally {
    await scenario.teardown?.();
  }
}
