import {isMobileTest} from '../utils';


export function() {
  if (!isMobileTest()) {
    return;
  }


  let index = fs.readFileSync(path.join(process.cwd(), 'dist/index.html'), 'utf-8');
  // Service Worker
  expect(index.includes('if (\'serviceWorker\' in navigator) {')).to.be.equal(false);
  expect(existsSync(path.join(process.cwd(), 'dist/worker.js'))).to.be.equal(false);

  // Asynchronous bundle
  expect(index.includes('<script src="/app-concat.js" async></script>')).to.be.equal(false);
  expect(existsSync(path.join(process.cwd(), 'dist/app-concat.js'))).to.be.equal(false);
}
