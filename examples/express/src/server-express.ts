import './polyfills.node';

import * as path from 'path';
import * as express from 'express';

import { enableProdMode } from '@angular/core';
import { createEngine } from 'angular2-express-engine';
// Angular 2 Universal
enableProdMode();

import { MainModule } from './main.node';

const app = express();
const ROOT = path.join(path.resolve(__dirname, '..'));

// Express View
app.engine('.html', createEngine({ ngModule: MainModule, time: true }));
app.set('views', __dirname);
app.set('view engine', 'html');

// Serve static files
app.use(express.static(ROOT, { index: false }));


app.get('/data.json', function(req: any, res: any) {
  console.log('req.headers.cookie', req.headers.cookie);
  console.log('req.cookies', req.cookies);
  var data = JSON.stringify({ data: true }, null, 2);
  console.log('res', data);
  res.status(200).send(data);
});

app.get('/', function (req, res, next) {
  res.render('index', {
    time: true,
    req,
    res,
    originUrl: 'http://localhost:3000',
    baseUrl: '/',
    requestUrl: '/',
    // preboot: false,
    preboot: { appRoot: ['app'], uglify: true },
  });
});


// Server
app.listen(3000, () => {
  console.log('Listening on: http://localhost:3000');
});
