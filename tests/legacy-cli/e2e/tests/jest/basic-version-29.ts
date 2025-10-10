import { applyJestBuilder } from '../../utils/jest';
import { ng, silentNpm } from '../../utils/process';

export default async function (): Promise<void> {
  await applyJestBuilder();
  await silentNpm('install', 'jest@29.5.0', 'jest-environment-jsdom@29.5.0', '--save-dev');

  const { stderr } = await ng('test');

  if (!stderr.includes('Jest builder is currently EXPERIMENTAL')) {
    throw new Error(`No experimental notice in stderr.\nSTDERR:\n\n${stderr}`);
  }
}
