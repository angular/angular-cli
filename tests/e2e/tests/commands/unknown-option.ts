import { ng } from '../../utils/process';

export default async function() {
  const { stderr } = await ng('build', '--notanoption');

  if (!stderr.match(/Unknown option: '--notanoption'/)) {
    throw new Error(`Expected "Unknown option:", received "${JSON.stringify(stderr)}".`);
  }
}
