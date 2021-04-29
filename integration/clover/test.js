const { join } = require('path');
const glob = require('glob');
const { readFileSync } = require('fs');

const DIST = join(__dirname, 'dist/clover/browser');
const pages = glob.sync('**/index.html', {
  cwd: DIST,
});

console.log({
  pages,
});

const expectedNumberOfPages = 5;
if (pages.length !== expectedNumberOfPages) {
  throw new Error(`Expected to have ${expectedNumberOfPages} index pages, but got ${pages.length}`);
}

for (const page of pages) {
  const content = readFileSync(join(DIST, page), 'utf8');
  if (!content.includes('ng-clover')) {
    throw new Error(`Page ${page} didn't contain ng-clover marker.`);
  }
}
