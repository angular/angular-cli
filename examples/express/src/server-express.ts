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
app.engine('.html', createEngine({ time: true }));
app.set('views', __dirname);
app.set('view engine', 'html');

// Serve static files
app.use(express.static(ROOT, { index: false }));

app.get('/', function (req, res, next) {
  res.render('index', {
    req,
    res,
    ngModule: MainModule,
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
