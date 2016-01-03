/// <reference path="../../../custom_typings/_custom.d.ts" />

var express = require('express');
var serveStatic = require('serve-static');
var morgan = require('morgan');
var path = require('path');

module.exports = function(ROOT) {
  var app = express();
  var universal = require(`${ROOT}/dist/modules/universal/server`);
  // rendering engine

  app.engine('ng2.html', universal.ng2engine);
  app.set('views', path.join(ROOT, 'examples'));
  app.set('view engine', 'ng2.html');
  app.set('view options', { doctype: 'html' });

  var routes = require('./routes');
  var api = require('./api');


  app.use(serveStatic(`${ROOT}/dist`));
  app.use(serveStatic(`${ROOT}/examples/app/public`));

  app.use('/api', api(ROOT));
  app.use(routes(ROOT));


  app.use(morgan('dev'));

  app.get('*', function(req, res) {
    res.json({
      'route': 'Sorry this page does not exist!'
    });
  });

  return app;
};
