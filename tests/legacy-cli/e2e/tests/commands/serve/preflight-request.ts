import { ngServe } from '../../../utils/project';

export default async function () {
  const port = await ngServe();
  const result = await fetch(`http://localhost:${port}/main.js`, { method: 'OPTIONS' });
  const content = await result.blob();

  if (content.size !== 0) {
    throw new Error(`Expected "size" to be "0" but got "${content.size}".`);
  }

  if (result.status !== 204) {
    throw new Error(`Expected "status" to be "204" but got "${result.status}".`);
  }
}
