/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import './init-env.mts';

import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { type ScenarioResult, runScenario } from './harness.mts';
import {
  buildReportData,
  formatComparisonTable,
  formatConsoleTable,
  formatJsonReport,
} from './reporters.mts';
import { type ScenarioFactoryOptions, getAllScenarios, getScenarioByName } from './scenarios.mts';

export interface BenchmarkCliOptions extends ScenarioFactoryOptions {
  scenario?: string;
  iterations?: number;
  warmup?: number;
  verbose?: boolean;
  json?: boolean;
  inProcess?: boolean;
  saveBaseline?: string;
  compareBaseline?: string;
}

export async function runI18nBenchmarks(
  options: BenchmarkCliOptions = {},
): Promise<{ results: ScenarioResult[]; exitCode: number }> {
  const warmup = options.warmup ?? 2;
  const iterations = options.iterations ?? 5;

  let scenariosToRun = getAllScenarios({ concurrency: options.concurrency });

  if (options.scenario) {
    const single = getScenarioByName(options.scenario, { concurrency: options.concurrency });
    if (!single) {
      // eslint-disable-next-line no-console
      console.error(
        `Unknown scenario: "${options.scenario}".\nAvailable scenarios: ${scenariosToRun.map((s) => s.name).join(', ')}`,
      );

      return { results: [], exitCode: 1 };
    }
    scenariosToRun = [single];
  }

  const results: ScenarioResult[] = [];

  // When running multiple scenarios in a suite, isolate each scenario into its own child process
  // so operating system memory and thread caches are not accumulated across scenarios.
  if (scenariosToRun.length > 1 && !options.inProcess) {
    for (const scenario of scenariosToRun) {
      if (!options.json) {
        // eslint-disable-next-line no-console
        console.log(
          `Running scenario: ${scenario.name} (${warmup} warmups, ${iterations} iterations)...`,
        );
      }

      const args = [
        '--no-warnings=ExperimentalWarning',
        '--experimental-transform-types',
        '--expose-gc',
        path.resolve(import.meta.dirname, '../../devkit-admin.mts'),
        'benchmark',
        'i18n',
        `--scenario=${scenario.name}`,
        `--warmup=${warmup}`,
        `--iterations=${iterations}`,
        '--json',
      ];
      if (options.concurrency !== undefined) {
        args.push(`--concurrency=${options.concurrency}`);
      }

      const proc = spawnSync(process.execPath, args, { encoding: 'utf-8' });
      if (proc.status !== 0) {
        // eslint-disable-next-line no-console
        console.error(`Error running scenario ${scenario.name}:\n${proc.stderr || proc.stdout}`);

        return { results, exitCode: 1 };
      }

      try {
        const parsed = JSON.parse(proc.stdout);
        const scenarioResult: ScenarioResult | undefined = Array.isArray(parsed)
          ? parsed[0]
          : parsed.results?.[0];
        if (scenarioResult) {
          results.push(scenarioResult);
        }
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Failed to parse result for scenario ${scenario.name}:\n${proc.stdout}`);

        return { results, exitCode: 1 };
      }
    }
  } else {
    for (const scenario of scenariosToRun) {
      if (!options.json) {
        // eslint-disable-next-line no-console
        console.log(
          `Running scenario: ${scenario.name} (${warmup} warmups, ${iterations} iterations)...`,
        );
      }

      try {
        const result = await runScenario(scenario, { warmup, iterations });
        results.push(result);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error running scenario ${scenario.name}:`, error);

        return { results, exitCode: 1 };
      }
    }
  }

  if (options.json) {
    // eslint-disable-next-line no-console
    console.log(formatJsonReport(results));
  } else {
    // eslint-disable-next-line no-console
    console.log('\n' + formatConsoleTable(results));
  }

  if (options.saveBaseline) {
    const reportData = buildReportData(results);
    await fs.writeFile(options.saveBaseline, JSON.stringify(reportData, null, 2), 'utf-8');
    if (!options.json) {
      // eslint-disable-next-line no-console
      console.log(`Saved baseline to: ${options.saveBaseline}`);
    }
  }

  if (options.compareBaseline) {
    try {
      const baselineContent = await fs.readFile(options.compareBaseline, 'utf-8');
      const baselineData = JSON.parse(baselineContent);
      const baselineResults: ScenarioResult[] = Array.isArray(baselineData)
        ? baselineData
        : (baselineData.results ?? []);

      if (!options.json) {
        // eslint-disable-next-line no-console
        console.log(formatComparisonTable(results, baselineResults));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to load baseline from ${options.compareBaseline}:`, error);
    }
  }

  return { results, exitCode: 0 };
}
