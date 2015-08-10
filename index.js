var port = process.env.PORT    || 3000;
// var ssl  = process.env.SSLPORT || 4000;

// Module dependencies
var http = require('http');
// var https = require('https');

/*
var options = {
  key:  fs.readFileSync('/private/etc/apache2/ssl/ssl.key'),
  cert: fs.readFileSync('/private/etc/apache2/ssl/ssl.crt')
};
*/

var server = require('./dist/examples/app/server/server')(__dirname);

// Start server
http.createServer(server).listen(port, function() {
  console.log('Listening on port: ' + port);

  /*
  // for smoke testing

  var req = http.get({
    host: 'localhost',
    port: 3000,
    path: '/?server=true&client=false&preboot=false&bootstrap=false'
  }, function(res) {
    console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));

    // Buffer the body entirely for processing as a whole.
    var bodyChunks = [];
    res.on('data', function(chunk) {
      // You can process streamed parts here...
      bodyChunks.push(chunk);
    }).on('end', function() {
      var body = Buffer.concat(bodyChunks);
      console.log('GOOD');
      // ...and/or process the entire body here.
    })
  });

  req.on('error', function(e) {
    console.log('ERROR: ' + e.message);
  });

  */

});
/*
https.createServer(options, server).listen(ssl, function() {
  console.log('Listening on port: ' + ssl + ' in ' + process.env.NODE_ENV);
});
*/
