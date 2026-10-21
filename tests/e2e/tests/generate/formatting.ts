import assert from 'node:assert/strict';
import { expectFileToMatch, readFile, writeFile } from '../../utils/fs';
import { installPackage, uninstallPackage } from '../../utils/packages';
import { ng } from '../../utils/process';

export default async function () {
  const untouched = 'export const untouched={value:"unchanged"};';
  try {
    await writeFile('src/untouched.ts', untouched);
    await writeFile('.prettierrc', JSON.stringify({ singleQuote: true, semi: false }));
    await ng('generate', 'service', 'prettier-only', '--skip-tests');
    await expectFileToMatch('src/app/prettier-only.ts', "from '@angular/core'\n");

    // Distinct configurations make the selected formatter observable when both are installed.
    await installPackage('oxfmt');
    await writeFile('.oxfmtrc.json', JSON.stringify({ singleQuote: false, semi: false }));
    await ng('generate', 'service', 'both-formatters', '--skip-tests');
    await expectFileToMatch('src/app/both-formatters.ts', "from '@angular/core'\n");

    await uninstallPackage('prettier');
    await ng('generate', 'service', 'oxfmt-only', '--skip-tests');
    await expectFileToMatch('src/app/oxfmt-only.ts', 'from "@angular/core"\n');

    await uninstallPackage('oxfmt');
    await ng('generate', 'service', 'no-formatter', '--skip-tests');
    await expectFileToMatch('src/app/no-formatter.ts', "from '@angular/core';\n");

    assert.equal(await readFile('src/untouched.ts'), untouched);
  } finally {
    await uninstallPackage('oxfmt');
    await installPackage('prettier');
  }
}
