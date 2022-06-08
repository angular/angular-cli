import express from 'express';
import * as http from 'http';

import { writeFile } from '../../utils/fs';
import fetch from 'node-fetch';
import { killAllProcesses, ng } from '../../utils/process';
import { ngServe } from '../../utils/project';
import { AddressInfo } from 'net';
import * as assert from 'assert';

export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  // Create an express app that serves as a proxy.
  const app = express();
  const server = http.createServer(app);
  server.listen(0);

  app.set('port', (server.address() as AddressInfo).port);
  app.get('/api/test', function (req, res) {
    res.send('TEST_API_RETURN');
  });

  const backendHost = 'localhost';
  const backendPort = (server.address() as AddressInfo).port;
  const proxyServerUrl = `http://${backendHost}:${backendPort}`;
  const proxyConfigFile = 'proxy.config.json';
  const proxyConfig = {
    '/api/*': {
      target: proxyServerUrl,
    },
  };

  return Promise.resolve()
    .then(() => writeFile(proxyConfigFile, JSON.stringify(proxyConfig, null, 2)))
    .then(() => ngServe('--proxy-config', proxyConfigFile))
    .then((port) => fetch(`http://localhost:${port}/api/test`))
    .then(async (response) => {
      assert.strictEqual(response.status, 200);
      assert.match(await response.text(), /TEST_API_RETURN/);
    })
    .finally(async () => {
      await killAllProcesses();
      server.close();
    });
}
