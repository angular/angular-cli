const { Engine } = require('@nguniversal/common/clover/server');
const { join } = require('path');
const { format } = require('url');

const DIST = join(__dirname, 'dist/clover/browser');

const ssr = new Engine();
ssr.render({
  publicPath: DIST,
  url: format({
    protocol: 'http',
    host: 'localhost:8000',
    pathname: '',
  }),
})
  .then(html => {
    if (html.includes('Hello world')) {
      console.log(`Response contained "Hello world"`)
    } else {
      console.log(html);
      throw new Error(`Response didn't include "Hello world"`);
    }
  })
  .catch(err => {
   console.error(err);
   process.exit(1);
  });