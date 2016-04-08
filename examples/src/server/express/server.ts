var express = require('express');
var serveStatic = require('serve-static');
var morgan = require('morgan');
var path = require('path');

module.exports = function(ROOT) {
  var app = express();
  var {expressEngine} = require('angular2-universal');
  // rendering engine
  app.engine('ng2.html', expressEngine);
  app.set('views', path.join(ROOT));
  app.set('view engine', 'ng2.html');
  app.set('view options', { doctype: 'html' });
  app.set('json spaces', 2);

  var routes = require('./routes');
  var api = require('./api');
  var graphApi = require('./graph_api');

  app.use(serveStatic(path.join(ROOT, 'dist'), {index: false}));
  app.use(serveStatic(path.join(ROOT, 'public'), {index: false}));

  app.use('/api', api(ROOT));
  app.use('/graph_api', api(ROOT));
  app.use(routes(ROOT));


  app.use(morgan('dev'));

  app.get('*', function(req, res) {
    res.json({
      'url': req.originalUrl,
      'route': 'Sorry this page does not exist!'
    });
  });

  return app;
};
