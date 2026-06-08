import { ng } from '../../utils/process';

export default async function () {
  await ng('test', '--no-watch', `--include='**/*.spec.ts'`);
}
