/// <reference path="../../typings/tsd.d.ts"/>
var dom = require('../../../dist/preboot/src/client/dom');
describe('dom', function () {
    describe('init()', function () {
        it('set values based on input', function () {
            var opts = { window: { document: { body: {} } } };
            dom.init(opts);
            expect(dom.state.window).toEqual(opts.window);
            expect(dom.state.document).toEqual(opts.window.document);
            expect(dom.state.body).toEqual(opts.window.document.body);
            expect(dom.state.appRoot).toEqual(opts.window.document.body);
            expect(dom.state.clientRoot).toEqual(opts.window.document.body);
        });
    });
    describe('updateRoots()', function () {
        it('should set the roots in the state', function () {
            var appRoot = {};
            var serverRoot = {};
            var clientRoot = {};
            dom.updateRoots(appRoot, serverRoot, clientRoot);
            expect(dom.state.appRoot).toBe(appRoot);
            expect(dom.state.serverRoot).toBe(serverRoot);
            expect(dom.state.clientRoot).toBe(clientRoot);
        });
    });
    describe('getAppNode()', function () {
        it('should call appRoot querySelector', function () {
            var selector = 'foo > man > choo';
            var appRoot = { querySelector: function () { } };
            spyOn(appRoot, 'querySelector');
            dom.state.appRoot = appRoot;
            dom.getAppNode(selector);
            expect(appRoot.querySelector).toHaveBeenCalledWith(selector);
        });
    });
    describe('getAllAppNodes()', function () {
        it('should call appRoot querySelectorAll', function () {
            var selector = 'foo > man > choo';
            var appRoot = { querySelectorAll: function () { } };
            spyOn(appRoot, 'querySelectorAll');
            dom.state.appRoot = appRoot;
            dom.getAllAppNodes(selector);
            expect(appRoot.querySelectorAll).toHaveBeenCalledWith(selector);
        });
    });
    describe('getClientNodes()', function () {
        it('should call clientRoot querySelectorAll', function () {
            var selector = 'foo > man > choo';
            var clientRoot = { querySelectorAll: function () { } };
            spyOn(clientRoot, 'querySelectorAll');
            dom.state.clientRoot = clientRoot;
            dom.getClientNodes(selector);
            expect(clientRoot.querySelectorAll).toHaveBeenCalledWith(selector);
        });
    });
    describe('onLoad()', function () {
        it('should call window addEventListener for load event', function () {
            var handler = function () { };
            var window = { addEventListener: function () { } };
            spyOn(window, 'addEventListener');
            dom.state.window = window;
            dom.onLoad(handler);
            expect(window.addEventListener).toHaveBeenCalledWith('load', handler);
        });
    });
    describe('on()', function () {
        it('should call document addEventListener', function () {
            var eventName = 'boo';
            var handler = function () { };
            var document = { addEventListener: function () { } };
            spyOn(document, 'addEventListener');
            dom.state.document = document;
            dom.on(eventName, handler);
            expect(document.addEventListener).toHaveBeenCalledWith(eventName, handler);
        });
    });
    describe('dispatchGlobalEvent()', function () {
        it('should call document dispatchEvent', function () {
            var eventName = 'boo';
            var window = { Event: function () { } };
            var document = { dispatchEvent: function () { } };
            spyOn(document, 'dispatchEvent');
            dom.state.window = window;
            dom.state.document = document;
            dom.dispatchGlobalEvent(eventName);
            expect(document.dispatchEvent).toHaveBeenCalled();
        });
    });
    describe('dispatchNodeEvent()', function () {
        it('should call node dispatchEvent', function () {
            var node = { dispatchEvent: function () { } };
            var eventName = 'boo';
            var window = { Event: function () { } };
            spyOn(node, 'dispatchEvent');
            dom.state.window = window;
            dom.dispatchNodeEvent(node, eventName);
            expect(node.dispatchEvent).toHaveBeenCalled();
        });
    });
    describe('addNodeToBody()', function () {
        it('should create node, add styles and append to body', function () {
            var type = 'div';
            var className = 'foo';
            var styles = { display: 'none', width: '300px' };
            var newElem = { className: '', style: { display: 'block', height: '200px' } };
            var document = {
                createElement: function () {
                    return newElem;
                }
            };
            var body = { appendChild: function () { } };
            spyOn(body, 'appendChild');
            spyOn(document, 'createElement').and.callThrough();
            dom.state.document = document;
            dom.state.body = body;
            dom.addNodeToBody(type, className, styles);
            expect(document.createElement).toHaveBeenCalledWith(type);
            expect(newElem.className).toEqual(className);
            expect(newElem.style).toEqual({ display: 'none', width: '300px', height: '200px' });
            expect(body.appendChild).toHaveBeenCalledWith(newElem);
        });
    });
    describe('removeNode()', function () {
        it('should not do anything if nothing passed in', function () {
            dom.removeNode(null);
        });
        it('should call remove on node if it exists', function () {
            var node = { remove: function () { } };
            spyOn(node, 'remove');
            dom.removeNode(node);
            expect(node.remove).toHaveBeenCalled();
        });
        it('should set display none when remove not there', function () {
            var node = { style: { display: '' } };
            dom.removeNode(node);
            expect(node.style.display).toEqual('none');
        });
    });
    describe('node tree fns', function () {
        // this is used to help with the testing of this function
        // create tree like structure
        function addParent(anode) {
            if (anode && anode.childNodes) {
                for (var _i = 0, _a = anode.childNodes; _i < _a.length; _i++) {
                    var childNode = _a[_i];
                    childNode.parentNode = anode;
                    addParent(childNode);
                }
            }
        }
        var node = { nodeName: 'DIV' };
        var document = {
            childNodes: [{}, {}, {
                    childNodes: [{}, {
                            childNodes: [{}, {}, {}, node]
                        }]
                }]
        };
        var rootNode = document.childNodes[2];
        var expectedNodeKey = 'DIV_s2_s4';
        addParent(document);
        describe('getNodeKey()', function () {
            it('should generate a key based of the node structure', function () {
                var actual = dom.getNodeKey(node, rootNode);
                expect(actual).toEqual(expectedNodeKey);
            });
        });
        describe('findClientNode()', function () {
            it('should return null if no serverNode passed in', function () {
                expect(dom.findClientNode(null)).toBeNull();
            });
            it('should get a node from cache', function () {
                var clientNode = { name: 'zoo' };
                dom.nodeCache[expectedNodeKey] = [{
                        serverNode: node,
                        clientNode: clientNode
                    }];
                dom.state.serverRoot = rootNode;
                var actual = dom.findClientNode(node);
                expect(actual).toBe(clientNode);
            });
            // todo: other test cases for when not using cache
        });
    });
});
//# sourceMappingURL=dom_spec.js.map