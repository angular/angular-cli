const fs = require('fs');
const { AppModuleNgFactory } = require('./dist/app.main');
const { renderModuleFactory } = require('@angular/platform-server');

require('zone.js/dist/zone-node');

renderModuleFactory(AppModuleNgFactory, {
  url: '/',
  document: '<app-root></app-root>'
}).then(html => {
  fs.writeFileSync('dist/index.html', html);
})
