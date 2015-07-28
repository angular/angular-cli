/// <reference path="../../typings/tsd.d.ts"/>
var buffer_manager_1 = require('../../../dist/preboot/src/client/buffer_manager');
describe('buffer_manager', function () {
    describe('prep()', function () {
        it('should update the DOM roots with a new client root', function () {
            var clientRoot = {
                style: { display: 'blah' }
            };
            var serverRoot = {
                cloneNode: function () { return clientRoot; },
                parentNode: {
                    insertBefore: function () { }
                }
            };
            var preboot = {
                dom: {
                    state: { appRoot: serverRoot },
                    updateRoots: function () { }
                }
            };
            spyOn(serverRoot, 'cloneNode').and.callThrough();
            spyOn(serverRoot.parentNode, 'insertBefore');
            spyOn(preboot.dom, 'updateRoots');
            buffer_manager_1.prep(preboot);
            expect(clientRoot.style.display).toEqual('none');
            expect(serverRoot.cloneNode).toHaveBeenCalled();
            expect(serverRoot.parentNode.insertBefore).toHaveBeenCalledWith(clientRoot, serverRoot);
            expect(preboot.dom.updateRoots).toHaveBeenCalledWith(serverRoot, serverRoot, clientRoot);
        });
    });
    describe('switchBuffer()', function () {
        it('should switch the client and server roots', function () {
            var clientRoot = {
                style: { display: 'none' }
            };
            var serverRoot = {
                nodeName: 'div'
            };
            var preboot = {
                dom: {
                    state: { clientRoot: clientRoot, serverRoot: serverRoot },
                    removeNode: function () { },
                    updateRoots: function () { }
                }
            };
            spyOn(preboot.dom, 'removeNode');
            spyOn(preboot.dom, 'updateRoots');
            buffer_manager_1.state.switched = false;
            buffer_manager_1.switchBuffer(preboot);
            expect(clientRoot.style.display).toEqual('block');
            expect(preboot.dom.removeNode).toHaveBeenCalledWith(serverRoot);
            expect(preboot.dom.updateRoots).toHaveBeenCalledWith(clientRoot, null, clientRoot);
        });
        it('should not switch because already switched', function () {
            var clientRoot = {
                style: { display: 'none' }
            };
            var serverRoot = {
                nodeName: 'div'
            };
            var preboot = {
                dom: {
                    state: { clientRoot: clientRoot, serverRoot: serverRoot },
                    removeNode: function () { },
                    updateRoots: function () { }
                }
            };
            spyOn(preboot.dom, 'removeNode');
            spyOn(preboot.dom, 'updateRoots');
            buffer_manager_1.state.switched = true;
            buffer_manager_1.switchBuffer(preboot);
            expect(clientRoot.style.display).toEqual('none');
            expect(preboot.dom.removeNode).not.toHaveBeenCalled();
            expect(preboot.dom.updateRoots).not.toHaveBeenCalled();
        });
        it('should not remove server root because it is the body', function () {
            var clientRoot = {
                style: { display: 'none' }
            };
            var serverRoot = {
                nodeName: 'BODY'
            };
            var preboot = {
                dom: {
                    state: { clientRoot: clientRoot, serverRoot: serverRoot },
                    removeNode: function () { },
                    updateRoots: function () { }
                }
            };
            spyOn(preboot.dom, 'removeNode');
            spyOn(preboot.dom, 'updateRoots');
            buffer_manager_1.state.switched = false;
            buffer_manager_1.switchBuffer(preboot);
            expect(clientRoot.style.display).toEqual('block');
            expect(preboot.dom.removeNode).not.toHaveBeenCalled();
            expect(preboot.dom.updateRoots).toHaveBeenCalledWith(clientRoot, null, clientRoot);
        });
        it('should not remove server root because it is the body', function () {
            var clientRoot = {
                style: { display: 'none' },
                nodeName: 'DIV'
            };
            var preboot = {
                dom: {
                    state: { clientRoot: clientRoot, serverRoot: clientRoot },
                    removeNode: function () { },
                    updateRoots: function () { }
                }
            };
            spyOn(preboot.dom, 'removeNode');
            spyOn(preboot.dom, 'updateRoots');
            buffer_manager_1.state.switched = false;
            buffer_manager_1.switchBuffer(preboot);
            expect(clientRoot.style.display).toEqual('block');
            expect(preboot.dom.removeNode).not.toHaveBeenCalled();
            expect(preboot.dom.updateRoots).toHaveBeenCalledWith(clientRoot, null, clientRoot);
        });
    });
});
//# sourceMappingURL=buffer_manager_spec.js.map