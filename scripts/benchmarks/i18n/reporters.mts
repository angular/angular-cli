/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import os from 'node:os';
import type { ScenarioResult } from './harness.mts';

export interface BenchmarkReportData {
  timestamp: string;
  system: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cpus: number;
    cpuModel: string;
    totalMemoryMb: number;
  };
  results: ScenarioResult[];
}

export function buildReportData(results: ScenarioResult[]): BenchmarkReportData {
  const cpus = os.cpus();

  return {
    timestamp: new Date().toISOString(),
    system: {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpus: cpus.length,
      cpuModel: cpus[0]?.model ?? 'unknown',
      totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
    },
    results,
  };
}

export function formatJsonReport(results: ScenarioResult[]): string {
  return JSON.stringify(buildReportData(results), null, 2);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str;
}

export function formatConsoleTable(results: ScenarioResult[]): string {
  const cpus = os.cpus();
  const gcStatus = typeof global.gc === 'function' ? 'active' : 'inactive (run with --expose-gc)';
  const header =
    `================================================================================================================\n` +
    `i18n Inliner Performance Benchmarks (Node ${process.version}, ${cpus.length} CPUs: ${cpus[0]?.model ?? ''} | GC: ${gcStatus})\n` +
    `================================================================================================================\n`;

  const columns = [
    { name: 'Scenario', width: 25 },
    { name: 'Input Size', width: 11 },
    { name: 'Locales', width: 8 },
    { name: 'Mean Latency', width: 13 },
    { name: 'p50 / p95', width: 18 },
    { name: 'Throughput', width: 12 },
    { name: 'Peak Heap', width: 11 },
    { name: 'Peak RSS', width: 11 },
  ];

  const colHeader = columns.map((col) => padRight(col.name, col.width)).join(' ');
  const separator = columns.map((col) => '-'.repeat(col.width)).join(' ');

  const rows = results.map((r) => {
    const inputFormatted = formatBytes(r.inputSizeBytes);
    const meanFormatted = `${r.meanMs.toFixed(1)} ms`;
    const p50p95Formatted = `${r.medianMs.toFixed(0)} ms / ${r.p95Ms.toFixed(0)} ms`;
    const throughputFormatted = `${r.throughputMBps.toFixed(1)} MB/s`;
    const peakHeapFormatted = formatBytes(r.peakHeapBytes ?? 0);
    const peakRssFormatted = formatBytes(r.peakRssBytes);

    return [
      padRight(r.name, columns[0].width),
      padLeft(inputFormatted, columns[1].width),
      padLeft(r.localeCount.toString(), columns[2].width),
      padLeft(meanFormatted, columns[3].width),
      padLeft(p50p95Formatted, columns[4].width),
      padLeft(throughputFormatted, columns[5].width),
      padLeft(peakHeapFormatted, columns[6].width),
      padLeft(peakRssFormatted, columns[7].width),
    ].join(' ');
  });

  return `${header}\n${colHeader}\n${separator}\n${rows.join('\n')}\n${'='.repeat(separator.length)}\n`;
}

export function formatComparisonTable(
  currentResults: ScenarioResult[],
  baselineResults: ScenarioResult[],
): string {
  const header =
    `====================================================================================================\n` +
    `i18n Inliner Benchmark Comparison (Current vs Baseline)\n` +
    `====================================================================================================\n`;

  const columns = [
    { name: 'Scenario', width: 26 },
    { name: 'Baseline Mean', width: 14 },
    { name: 'Current Mean', width: 14 },
    { name: 'Latency Diff', width: 14 },
    { name: 'Baseline MB/s', width: 14 },
    { name: 'Current MB/s', width: 14 },
  ];

  const colHeader = columns.map((col) => padRight(col.name, col.width)).join(' ');
  const separator = columns.map((col) => '-'.repeat(col.width)).join(' ');

  const rows = currentResults.map((curr) => {
    const base = baselineResults.find((b) => b.name === curr.name);
    if (!base) {
      return [
        padRight(curr.name, columns[0].width),
        padLeft('N/A', columns[1].width),
        padLeft(`${curr.meanMs.toFixed(1)} ms`, columns[2].width),
        padLeft('NEW', columns[3].width),
        padLeft('N/A', columns[4].width),
        padLeft(`${curr.throughputMBps.toFixed(1)} MB/s`, columns[5].width),
      ].join(' ');
    }

    const diffPercent = ((curr.meanMs - base.meanMs) / base.meanMs) * 100;
    const diffSign = diffPercent > 0 ? '+' : '';
    const diffText = `${diffSign}${diffPercent.toFixed(1)}% ${diffPercent > 1 ? '(slower)' : diffPercent < -1 ? '(faster)' : '(same)'}`;

    return [
      padRight(curr.name, columns[0].width),
      padLeft(`${base.meanMs.toFixed(1)} ms`, columns[1].width),
      padLeft(`${curr.meanMs.toFixed(1)} ms`, columns[2].width),
      padLeft(diffText, columns[3].width),
      padLeft(`${base.throughputMBps.toFixed(1)} MB/s`, columns[4].width),
      padLeft(`${curr.throughputMBps.toFixed(1)} MB/s`, columns[5].width),
    ].join(' ');
  });

  return `${header}\n${colHeader}\n${separator}\n${rows.join('\n')}\n${'='.repeat(separator.length)}\n`;
}
