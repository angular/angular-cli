var SERVER_IP = 'localhost';

import 'angular2-universal/polyfills';

var port = process.env.PORT || 3000;

// Module dependencies
import http = require('http');
import path = require('path');


// Start server
var framework = process.argv[2] || 'express';
var server = null;
var example = '';
var ROOT = path.join(__dirname, '..');

if (framework === 'hapi') {
  // hapi

  example = `./server/hapi/server`;
  server = require(example)(ROOT, {
    port,
    address: SERVER_IP
  });
  module.exports.Server = server
    .start(() => {
      console.log(`Listening on port: ${port}`);
      // for smoke testing
      // smokeTest();
    });

} else {
  // express or other express compliant frameworks

  example = `./server/${framework}/server`;
  try {
    server = require(example)(ROOT);
  } catch (e) {
    console.trace(e);
    process.exit(1);
  }

  module.exports.Server = http
    .createServer(server)
    .listen(port, SERVER_IP, function() {
      console.log(`Listening on port: ${port}`);
      // for smoke testing
      // smokeTest();
    });

}
console.log(`Using framework: "${framework}"`);


function smokeTest() {
  var req = http.get({
    host: 'localhost',
    port: 3000,
    path: '/?server=true&client=false&preboot=false&bootstrap=false',
  }, function(res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers, null, 2));

    // Buffer the body entirely for processing as a whole.
    var bodyChunks = [];
    res.
    on('data', function(chunk) {
      // You can process streamed parts here...
      bodyChunks.push(chunk);
    }).
    on('end', function() {
      var body = Buffer.concat(bodyChunks);
      // console.log('GOOD' /*, body.toString()*/ );
      // ...and/or process the entire body here.
    });
  });

  req.on('error', function(e) {
    console.error('ERROR: ' + e.message);
  });
}
