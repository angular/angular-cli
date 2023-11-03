import { applyJestBuilder } from '../../utils/jest';
import { ng } from '../../utils/process';

export default async function (): Promise<void> {
  // TODO(alanagius): enable once https://github.com/angular/angular/pull/52505 is released.
  return;

  await applyJestBuilder();

  const { stderr } = await ng('test');

  if (!stderr.includes('Jest builder is currently EXPERIMENTAL')) {
    throw new Error(`No experimental notice in stderr.\nSTDERR:\n\n${stderr}`);
  }
}
