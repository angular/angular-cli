import fetch from 'node-fetch';
import { ngServe } from '../../../utils/project';

export default async function () {
  const port = await ngServe();
  const { size, status } = await fetch(`http://localhost:${port}/main.js`, { method: 'OPTIONS' });

  if (size !== 0) {
    throw new Error(`Expected "size" to be "0" but got "${size}".`);
  }

  if (status !== 204) {
    throw new Error(`Expected "status" to be "204" but got "${status}".`);
  }
}
