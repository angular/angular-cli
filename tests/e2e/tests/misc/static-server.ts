import { writeFile } from '../../utils/fs';
import { request } from '../../utils/http';
import { killAllProcesses, ng } from '../../utils/process';
import { ngServe } from '../../utils/project';
import { expectToFail } from '../../utils/utils';


export default function() {
  // const app = express();
  const serverConfigFile = 'server.config.js';
  const serverConfig = `module.exports = function(app){ 
    app.get('/api/test', function(req, res){
      res.json({ status:'TEST_API_RETURN' });
    });
  };`;

  return Promise.resolve()
    .then(() => writeFile(serverConfigFile, serverConfig))
    .then(() => ngServe('--server-config', serverConfigFile))
    .then(() => request('http://localhost:4200/api/test'))
    .then(body => {
      if (!body.match(/TEST_API_RETURN/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; })

    // A non-existing proxy file should error.
    .then(() => expectToFail(() => ng('serve', '--server-config', 'config.non-existent.js')));
}
