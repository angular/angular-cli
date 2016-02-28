var SERVER_IP = '127.0.0.1';

var port = process.env.PORT || 3000;
// var ssl  = process.env.SSLPORT || 4000;

// Module dependencies
var http = require('http');
// require('nocycle').detect();
// var https = require('https');

/*
var options = {
  key:  fs.readFileSync('/private/etc/apache2/ssl/ssl.key'),
  cert: fs.readFileSync('/private/etc/apache2/ssl/ssl.crt')
};
*/

// Start server
var framework = process.argv[2] || 'express';
var server = null;
var example = '';

if (framework === 'hapi') {
  // hapi

  example = `./dist/examples/app/server/hapi/server`;
  server = require(example)(__dirname, {
    port,
    address: SERVER_IP
  });
  module.exports.Server = server.start(() => {
    console.log(`Listening on port: ${port}`);
    // for smoke testing
    // smokeTest();
  });

} else {
  // express or other express compliant frameworks

  example = `./dist/examples/app/server/${framework}/server`;
  try {
    server = require(example)(__dirname);
  } catch (e) {
    console.trace(e);
    process.exit(1);
  }

  module.exports.Server = http.createServer(server).listen(port, SERVER_IP,
    function() {
      console.log(`Listening on port: ${port}`);
      // for smoke testing
      // smokeTest();
    });

}
console.log(`Using framework: ${framework}`);


/*
https.createServer(options, server).listen(ssl, function() {
  console.log('Listening on port: ' + ssl + ' in ' + process.env.NODE_ENV);
});
*/


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
    })
  });

  req.on('error', function(e) {
    console.error('ERROR: ' + e.message);
  });
}
