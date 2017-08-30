import { bold, green, red, reset, white, yellow } from 'chalk';
import { stripIndents } from 'common-tags';


export type BudgetType = 'bundle' | 'initial';

export interface Budget {
  type: BudgetType;
  budget: number;
  unit: SizeUnit;
  severity: 'Warning' | 'Error';
}

export type SizeUnit = 'bytes' | 'kB' | 'MB' | 'GB';

const sizeUnits = ['bytes', 'kB', 'MB', 'GB'];

function _formatSize(size: number): string {
  if (size <= 0) {
    return '0 bytes';
  }

  const index = Math.floor(Math.log(size) / Math.log(1000));

  return `${+(size / Math.pow(1000, index)).toPrecision(3)} ${sizeUnits[index]}`;
}

function _getSize(size: number, unit: SizeUnit): number {
  const unitMultiplier = sizeUnits.indexOf(unit);
  return size / Math.pow(1000, unitMultiplier);
}

export function statsToString(json: any, statsConfig: any, budgetResults: BudgetResult[] = []) {
  const colors = statsConfig.colors;
  const rs = (x: string) => colors ? reset(x) : x;
  const w = (x: string) => colors ? bold(white(x)) : x;
  const g = (x: string) => colors ? bold(green(x)) : x;
  const y = (x: string) => colors ? bold(yellow(x)) : x;

  return rs(stripIndents`
    Date: ${w(new Date().toISOString())}
    Hash: ${w(json.hash)}
    Time: ${w('' + json.time)}ms
    ${json.chunks.map((chunk: any) => {
      const asset = json.assets.filter((x: any) => x.name == chunk.files[0])[0];
      const size = asset ? ` ${_formatSize(asset.size)}` : '';
      const files = chunk.files.join(', ');
      const names = chunk.names ? ` (${chunk.names.join(', ')})` : '';
      const parents = chunk.parents.map((id: string) => ` {${y(id)}}`).join('');
      const initial = y(chunk.entry ? '[entry]' : chunk.initial ? '[initial]' : '');
      const flags = ['rendered', 'recorded']
        .map(f => f && chunk[f] ? g(` [${f}]`) : '')
        .join('');

      let msg = `chunk {${y(chunk.id)}} ${g(files)}${names}${size}${parents} ${initial}${flags}`;

      const chunkWarnings = budgetResults
        .filter(bbr => bbr.id === chunk.id && bbr.result === 'Warning');
      const chunkErrors = budgetResults
        .filter(bbr => bbr.id === chunk.id && bbr.result === 'Error');

      const chunkBudgetResults = chunkErrors.length > 0 ? chunkErrors : chunkWarnings;

      chunkBudgetResults.forEach(bbr => {
          const color = bbr.result === 'Warning' ? yellow : red;
          const budgetMessage = `Bundle budget size exceeded (${bbr.budget} ${bbr.unit})`;
          msg += `\n${color(budgetMessage)}`;
        });

      return msg;
    }).join('\n')}
    `);
}

export function statsWarningsToString(json: any, statsConfig: any) {
  const colors = statsConfig.colors;
  const rs = (x: string) => colors ? reset(x) : x;
  const y = (x: string) => colors ? bold(yellow(x)) : x;

  return rs('\n' + json.warnings.map((warning: any) => y(`WARNING in ${warning}`)).join('\n\n'));
}

export function statsErrorsToString(json: any, statsConfig: any) {
  const colors = statsConfig.colors;
  const rs = (x: string) => colors ? reset(x) : x;
  const r = (x: string) => colors ? bold(red(x)) : x;

  return rs('\n' + json.errors.map((error: any) => r(`ERROR in ${error}`)).join('\n'));
}

export interface BudgetResult {
  result: 'Error' | 'Warning';
  type: BudgetType;
  budget: number;
  unit: SizeUnit;
  id?: number;
}

export function evaluateBudgets(stats: any, budgets: Budget[]): BudgetResult[] {
  const results: BudgetResult[] = [];

  const bundleBudgets = budgets.filter(b => b.type === 'bundle');
  let initialSize = 0;

  stats.chunks.forEach((chunk: any) => {
    const asset = stats.assets.filter((x: any) => x.name == chunk.files[0])[0];
    const chunkSize = asset.size;

    initialSize += chunk.initial ? chunkSize : 0;

    if (!chunk.initial) {
      bundleBudgets.forEach(budget => {
        const chunkSizeInUnit = _getSize(chunkSize, budget.unit);
        if (chunkSizeInUnit > budget.budget) {
          results.push({
            id: chunk.id,
            type: 'bundle',
            result: budget.severity,
            budget: budget.budget,
            unit: budget.unit
          });
        }
      });
    }
  });

  budgets.filter(b => b.type === 'initial').forEach(budget => {
    const initialSizeInUnit = _getSize(initialSize, budget.unit);
    if (initialSizeInUnit > budget.budget) {
      results.push({
        type: 'initial',
        result: budget.severity,
        budget: budget.budget,
        unit: budget.unit
      });
    }
  });

  return results;
}
