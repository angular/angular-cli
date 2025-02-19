import { loopbackAddr } from '../../../utils/env';
import { ngServe } from '../../../utils/project';

export default async function () {
  const port = await ngServe();
  // HTML
  await checkHeadForUrl(`http://${loopbackAddr}:${port}/index.html`);
  // Generated JS
  await checkHeadForUrl(`http://${loopbackAddr}:${port}/main.js`);
  // Generated CSS
  await checkHeadForUrl(`http://${loopbackAddr}:${port}/styles.css`);
  // Configured asset
  await checkHeadForUrl(`http://${loopbackAddr}:${port}/favicon.ico`);
}

async function checkHeadForUrl(url: string): Promise<void> {
  const result = await fetch(url, { method: 'HEAD' });
  const content = await result.blob();

  if (content.size !== 0) {
    throw new Error(`Expected "size" to be "0" but got "${content.size}".`);
  }
  if (result.status !== 200) {
    throw new Error(`Expected "status" to be "200" but got "${result.status}".`);
  }
}
