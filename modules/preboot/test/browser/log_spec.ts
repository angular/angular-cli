import {log} from '../../src/browser/log';

describe('log', function () {
  describe('log()', function () {
    it('chould call replaySuccess w appropriate console.logs', function () {
      let consoleLog = console.log;
      spyOn(console, 'log');
      
      let serverNode = { name: 'serverNode' };
      let clientNode = { name: 'clientNode' };
      let evt = { name: 'evt1' };
      
      log(3, serverNode, clientNode, evt);
      
      expect(console.log).toHaveBeenCalledWith('replaying:');
      expect(console.log).toHaveBeenCalledWith({
        serverNode: serverNode,
        clientNode: clientNode,
        event: evt
      });
      
      console.log = consoleLog;
    });  
  });
});
