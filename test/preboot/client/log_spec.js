/// <reference path="../../typings/tsd.d.ts"/>
var log_1 = require('../../../dist/preboot/src/client/log');
describe('log', function () {
    describe('log()', function () {
        it('chould call replaySuccess w appropriate console.logs', function () {
            var consoleLog = console.log;
            spyOn(console, 'log');
            var serverNode = { name: 'serverNode' };
            var clientNode = { name: 'clientNode' };
            var evt = { name: 'evt1' };
            log_1.log(3, serverNode, clientNode, evt);
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
//# sourceMappingURL=log_spec.js.map