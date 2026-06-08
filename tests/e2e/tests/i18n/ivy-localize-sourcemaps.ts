import { readFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { langTranslations, setupI18nConfig } from './setup';

export default async function () {
  // Setup i18n tests and config.
  await setupI18nConfig();

  await ng('build', '--source-map');

  for (const { outputPath } of langTranslations) {
    // Ensure sourcemap for modified file contains content
    const mainSourceMap = JSON.parse(await readFile(`${outputPath}/main.js.map`));
    if (
      mainSourceMap.version !== 3 ||
      !Array.isArray(mainSourceMap.sources) ||
      typeof mainSourceMap.mappings !== 'string'
    ) {
      throw new Error('invalid localized sourcemap for main.js');
    }
  }
}
