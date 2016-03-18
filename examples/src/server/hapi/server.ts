var serveStatic = require('serve-static');
var morgan = require('morgan');
var path = require('path');
const Hapi = require('hapi');
const Vision = require('vision');
const Inert = require('inert');

module.exports = function(ROOT, serverOptions) {

  var {hapiEngine} = require('angular2-hapi-engine');
  var app = new Hapi.Server();
  app.connection(serverOptions);
  app.register([Vision, Inert], (err) => {

    if (err) {
      throw err;
    }

    // rendering engine
    app.views({
      defaultExtension: 'ng2.html',
      engines: {
        'ng2.html': {
          module: new hapiEngine(),
          compileMode: 'async'
        }
      },
      relativeTo: __dirname,
      path: path.join(ROOT, 'examples')
    });

  });

  var routes = require('./routes');
  app.route(routes(ROOT));

  var api = require('./api');
  app.route(api(ROOT));


  // TODO: is this script being used?
  // var graphApi = require('./graph_api');
  // app.use('/graph_api', api(ROOT));

  // TODO: what route is this?
  // app.use(serveStatic(`${ROOT}/dist`));

  // TODO: figure out how to use morgan with Hapi
  // app.use(morgan('dev'));


  return app;
};
