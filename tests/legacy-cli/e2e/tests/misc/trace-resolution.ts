import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  await updateJsonFile('tsconfig.json', tsconfig => {
    tsconfig.compilerOptions.traceResolution = true;
  });

  const { stdout: stdoutTraced } = await ng('build');
  if (!/Resolving module/.test(stdoutTraced)) {
    throw new Error(`Modules resolutions must be printed when 'traceResolution' is enabled.`);
  }

  await updateJsonFile('tsconfig.json', tsconfig => {
    tsconfig.compilerOptions.traceResolution = false;
  });

  const { stdout: stdoutUnTraced } = await ng('build');
  if (/Resolving module/.test(stdoutUnTraced)) {
    throw new Error(`Modules resolutions must not be printed when 'traceResolution' is disabled.`);
  }
}
