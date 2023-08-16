var http = require('http');
const { URL } = require('url');
http
  .createServer(function (req, res) {
    console.log(req.originalUrl);
  })
  .listen(4210);
