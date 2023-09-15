import { ng } from '../../utils/process';
import { applyWtrBuilder } from '../../utils/web-test-runner';

export default async function () {
  await applyWtrBuilder();

  const { stderr } = await ng('test');

  if (!stderr.includes('Web Test Runner builder is currently EXPERIMENTAL')) {
    throw new Error(`No experimental notice in stderr.\nSTDERR:\n\n${stderr}`);
  }
}
