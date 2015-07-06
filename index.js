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
});
/*
https.createServer(options, server).listen(ssl, function() {
  console.log('Listening on port: ' + ssl + ' in ' + process.env.NODE_ENV);
});
*/
