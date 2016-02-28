var express = require('express');
var serveStatic = require('serve-static');
var morgan = require('morgan');
var path = require('path');

module.exports = function(ROOT) {
  var app = express();
  var {ng2ExpressEngine} = require('angular2-universal-preview');
  // rendering engine

  app.engine('ng2.html', ng2ExpressEngine);
  app.set('views', path.join(ROOT, 'examples'));
  app.set('view engine', 'ng2.html');
  app.set('view options', { doctype: 'html' });

  console.log(__dirname);

  var routes = require('./routes');
  var api = require('./api');
  var graphApi = require('./graph_api');


  app.use(serveStatic(`${ROOT}/dist`));
  app.use(serveStatic(`${ROOT}/examples/app/public`));

  app.use('/api', api(ROOT));
  app.use('/graph_api', api(ROOT));
  app.use(routes(ROOT));


  app.use(morgan('dev'));

  app.get('*', function(req, res) {
    res.json({
      'route': 'Sorry this page does not exist!'
    });
  });

  return app;
};
