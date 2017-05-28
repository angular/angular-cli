import * as express from 'express';
import * as http from 'http';

import {writeFile} from '../../utils/fs';
import {request} from '../../utils/http';
import {killAllProcesses, ng} from '../../utils/process';
import {ngServe} from '../../utils/project';
import {updateJsonFile} from '../../utils/project';
import {expectToFail} from "../../utils/utils";

export default function() {
  // Create an express app that serves as a proxy.
  const app = express();
  const server = http.createServer(app);
  server.listen(0);

  app.set('port', server.address().port);
  app.get('/api/test', function (req, res) {
    res.send('TEST_API_RETURN');
  });

  const backendHost = 'localhost';
  const backendPort = server.address().port;
  const proxyServerUrl = `http://${backendHost}:${backendPort}`;
  const proxyConfigFile = 'proxy.config.json';
  const proxyConfig = {
    '/api/*': {
      target: proxyServerUrl
    }
  };

  return Promise.resolve()
    .then(() => writeFile(proxyConfigFile, JSON.stringify(proxyConfig, null, 2)))
    .then(() => ngServe('--proxy-config', proxyConfigFile))
    .then(() => request('http://localhost:4200/api/test'))
    .then(body => {
      if (!body.match(/TEST_API_RETURN/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; })

    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson.defaults;
      app.serve = {
        proxyConfig: proxyConfigFile
      };
    }))
    .then(() => ngServe())
    .then(() => request('http://localhost:4200/api/test'))
    .then(body => {
      if (!body.match(/TEST_API_RETURN/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; })

    .then(() => server.close(), (err) => { server.close(); throw err; })

    // A non-existing proxy file should error.
    .then(() => expectToFail(() => ng('serve', '--proxy-config', 'proxy.non-existent.json')))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson.defaults;
      app.serve = {
        proxyConfig: 'proxy.non-existent.json'
      };
    }))
    .then(() => expectToFail(() => ng('serve')));
}
