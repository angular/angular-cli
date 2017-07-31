import { bold, green, red, reset, white, yellow } from 'chalk';
import { stripIndents } from 'common-tags';


function _formatSize(size: number): string {
  if (size <= 0) {
    return '0 bytes';
  }

  const abbreviations = ['bytes', 'kB', 'MB', 'GB'];
  const index = Math.floor(Math.log(size) / Math.log(1000));

  return `${+(size / Math.pow(1000, index)).toPrecision(3)} ${abbreviations[index]}`;
}


export function statsToString(json: any, statsConfig: any) {
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

      return `chunk {${y(chunk.id)}} ${g(files)}${names}${size}${parents} ${initial}${flags}`;
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
