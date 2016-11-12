/**
 * the polyfills must be the first thing imported
 */
import 'angular2-universal-polyfills';
import './polyfills.ts';
import * as path from 'path';
import * as express from 'express';
import { enableProdMode } from '@angular/core';
import { createEngine } from 'angular2-express-engine';
import { AppModule } from './app/app.node.module';
import { environment } from './environments/environment';

const app = express();
const ROOT = path.join(path.resolve(__dirname, '..'));
const port = process.env.PORT || 4200;

/**
 * enable prod mode for production environments
 */
if (environment.production) {
  enableProdMode();
}

/**
 * Express View
 */
app.engine('.html', createEngine({}));
app.set('views', __dirname);
app.set('view engine', 'html');

/**
 * serve static files
 */
app.use(express.static(path.join(ROOT, 'dist'), {index: false}));

/**
 * place your api routes here
 */
// app.use('/api', api);

/**
 * bootstrap universal app
 * @param req
 * @param res
 */
function ngApp(req: any, res: any) {
  res.render('index', {
    req,
    res,
    ngModule: AppModule,
    preboot: false,
    baseUrl: '/',
    requestUrl: req.originalUrl,
    originUrl: req.hostname
  });
}

/**
 * use universal for specific routes
 */
app.get('/', ngApp);
app.get('/about', ngApp);
app.get('/about/*', ngApp);

/**
 * if you want to use universal for all routes, you can use the '*' wildcard
 */
// app.get('*', ngApp);

app.get('*', function(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  const pojo = { status: 404, message: 'No Content' };
  const json = JSON.stringify(pojo, null, 2);
  res.status(404).send(json);
});

app.listen(port);
