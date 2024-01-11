import { deleteFile, writeFile } from '../../utils/fs';
import { applyJestBuilder } from '../../utils/jest';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function (): Promise<void> {
  await applyJestBuilder();

  {
    // Users may incorrectly write a Jest config believing it to be used by Angular.
    await writeFile(
      'jest.config.mjs',
      `
  export default {
    runner: 'does-not-exist',
  };
    `.trim(),
    );

    // Should not fail from the above (broken) configuration. Shouldn't use it at all.
    const { stderr } = await ng('test');

    // Should warn that a Jest configuration was found but not used.
    if (!stderr.includes('A custom Jest config was found')) {
      throw new Error(`No warning about custom Jest config:\nSTDERR:\n\n${stderr}`);
    }
    if (!stderr.includes('jest.config.mjs')) {
      throw new Error(`Warning did not call out 'jest.config.mjs':\nSTDERR:\n\n${stderr}`);
    }

    await deleteFile('jest.config.mjs');
  }

  {
    // Use `package.json` configuration instead of a `jest.config` file.
    await updateJsonFile('package.json', (json) => {
      json['jest'] = {
        runner: 'does-not-exist',
      };
    });

    // Should not fail from the above (broken) configuration. Shouldn't use it at all.
    const { stderr } = await ng('test');

    // Should warn that a Jest configuration was found but not used.
    if (!stderr.includes('A custom Jest config was found')) {
      throw new Error(`No warning about custom Jest config:\nSTDERR:\n\n${stderr}`);
    }
    if (!stderr.includes('package.json')) {
      throw new Error(`Warning did not call out 'package.json':\nSTDERR:\n\n${stderr}`);
    }
  }
}
