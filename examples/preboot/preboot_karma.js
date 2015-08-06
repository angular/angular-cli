(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// expose state for testing purposes
exports.state = { switched: false };
/**
 * Create a second div that will be the client root for an app
 */
function prep(preboot) {
    // server root is the app root when we get started
    var serverRoot = preboot.dom.state.appRoot;
    // client root is going to be a shallow clone of the server root
    var clientRoot = serverRoot.cloneNode(false);
    // client in the DOM, but not displayed until time for switch
    clientRoot.style.display = 'none';
    // insert the client root right before the server root
    serverRoot.parentNode.insertBefore(clientRoot, serverRoot);
    // update the dom manager to store the server and client roots (first param is appRoot)
    preboot.dom.updateRoots(serverRoot, serverRoot, clientRoot);
}
exports.prep = prep;
/**
 * We want to simultaneously remove the server node from the DOM
 * and display the client node
 */
function switchBuffer(preboot) {
    var domState = preboot.dom.state;
    // get refs to the roots
    var clientRoot = domState.clientRoot || domState.appRoot;
    var serverRoot = domState.serverRoot || domState.appRoot;
    // don't do anything if already switched
    if (exports.state.switched) {
        return;
    }
    // remove the server root if not same as client and not the body
    if (serverRoot !== clientRoot && serverRoot.nodeName !== 'BODY') {
        preboot.dom.removeNode(serverRoot);
    }
    // display the client
    clientRoot.style.display = 'block';
    // update the roots; first param is the new appRoot; serverRoot now null
    preboot.dom.updateRoots(clientRoot, null, clientRoot);
    // finally mark state as switched
    exports.state.switched = true;
}
exports.switchBuffer = switchBuffer;

},{}],2:[function(require,module,exports){
exports.nodeCache = {};
exports.state = {
    window: null,
    document: null,
    body: null,
    appRoot: null,
    serverRoot: null,
    clientRoot: null
};
/**
 * Initialize the DOM state based on input
 */
function init(opts) {
    exports.state.window = opts.window || exports.state.window || {};
    exports.state.document = opts.document || (exports.state.window && exports.state.window.document) || {};
    exports.state.body = opts.body || (exports.state.document && exports.state.document.body);
    exports.state.appRoot = opts.appRoot || exports.state.body;
    exports.state.serverRoot = exports.state.clientRoot = exports.state.appRoot;
}
exports.init = init;
/**
 * Setter for app root
 */
function updateRoots(appRoot, serverRoot, clientRoot) {
    exports.state.appRoot = appRoot;
    exports.state.serverRoot = serverRoot;
    exports.state.clientRoot = clientRoot;
}
exports.updateRoots = updateRoots;
/**
 * Get a node in the document
 */
function getDocumentNode(selector) {
    return exports.state.document.querySelector(selector);
}
exports.getDocumentNode = getDocumentNode;
/**
 * Get one app node
 */
function getAppNode(selector) {
    return exports.state.appRoot.querySelector(selector);
}
exports.getAppNode = getAppNode;
/**
 * Get all app nodes for a given selector
 */
function getAllAppNodes(selector) {
    return exports.state.appRoot.querySelectorAll(selector);
}
exports.getAllAppNodes = getAllAppNodes;
/**
 * Get all nodes under the client root
 */
function getClientNodes(selector) {
    return exports.state.clientRoot.querySelectorAll(selector);
}
exports.getClientNodes = getClientNodes;
/**
 * Add event listener at window level
 */
function onLoad(handler) {
    exports.state.window.addEventListener('load', handler);
}
exports.onLoad = onLoad;
/**
 * These are global events that get passed around. Currently
 * we use the document to do this.
 */
function on(eventName, handler) {
    exports.state.document.addEventListener(eventName, handler);
}
exports.on = on;
/**
 * Dispatch an event on the document
 */
function dispatchGlobalEvent(eventName) {
    exports.state.document.dispatchEvent(new exports.state.window.Event(eventName));
}
exports.dispatchGlobalEvent = dispatchGlobalEvent;
/**
 * Dispatch an event on a specific node
 */
function dispatchNodeEvent(node, eventName) {
    node.dispatchEvent(new exports.state.window.Event(eventName));
}
exports.dispatchNodeEvent = dispatchNodeEvent;
/**
 * Check to see if the app contains a particular node
 */
function appContains(node) {
    return exports.state.appRoot.contains(node);
}
exports.appContains = appContains;
/**
 * Create a new element
 */
function addNodeToBody(type, className, styles) {
    var elem = exports.state.document.createElement(type);
    elem.className = className;
    if (styles) {
        for (var key in styles) {
            if (styles.hasOwnProperty(key)) {
                elem.style[key] = styles[key];
            }
        }
    }
    return exports.state.body.appendChild(elem);
}
exports.addNodeToBody = addNodeToBody;
/**
 * Remove a node since we are done with it
 */
function removeNode(node) {
    if (!node) {
        return;
    }
    node.remove ?
        node.remove() :
        node.style.display = 'none';
}
exports.removeNode = removeNode;
/**
 * Get a unique key for a node in the DOM
 */
function getNodeKey(node, rootNode) {
    var ancestors = [];
    var temp = node;
    while (temp && temp !== rootNode) {
        ancestors.push(temp);
        temp = temp.parentNode;
    }
    // push the rootNode on the ancestors
    if (temp) {
        ancestors.push(temp);
    }
    // now go backwards starting from the root
    var key = node.nodeName;
    var len = ancestors.length;
    for (var i = (len - 1); i >= 0; i--) {
        temp = ancestors[i];
        if (temp.childNodes && i > 0) {
            for (var j = 0; j < temp.childNodes.length; j++) {
                if (temp.childNodes[j] === ancestors[i - 1]) {
                    key += '_s' + (j + 1);
                    break;
                }
            }
        }
    }
    return key;
}
exports.getNodeKey = getNodeKey;
/**
 * Given a node from the server rendered view, find the equivalent
 * node in the client rendered view.
 */
function findClientNode(serverNode) {
    // if nothing passed in, then no client node
    if (!serverNode) {
        return null;
    }
    // we use the string of the node to compare to the client node & as key in cache
    var serverNodeKey = getNodeKey(serverNode, exports.state.serverRoot);
    // first check to see if we already mapped this node
    var nodes = exports.nodeCache[serverNodeKey] || [];
    for (var _i = 0; _i < nodes.length; _i++) {
        var nodeMap = nodes[_i];
        if (nodeMap.serverNode === serverNode) {
            return nodeMap.clientNode;
        }
    }
    // todo: improve this algorithm in the future so uses fuzzy logic (i.e. not necessarily perfect match)
    var selector = serverNode.tagName;
    var className = (serverNode.className || '').replace('ng-binding', '').trim();
    if (serverNode.id) {
        selector += '#' + serverNode.id;
    }
    else if (className) {
        selector += '.' + className.replace(/ /g, '.');
    }
    var clientNodes = getClientNodes(selector);
    for (var _a = 0; _a < clientNodes.length; _a++) {
        var clientNode = clientNodes[_a];
        // todo: this assumes a perfect match which isn't necessarily true
        if (getNodeKey(clientNode, exports.state.clientRoot) === serverNodeKey) {
            // add the client/server node pair to the cache
            exports.nodeCache[serverNodeKey] = exports.nodeCache[serverNodeKey] || [];
            exports.nodeCache[serverNodeKey].push({
                clientNode: clientNode,
                serverNode: serverNode
            });
            return clientNode;
        }
    }
    // if we get here it means we couldn't find the client node
    return null;
}
exports.findClientNode = findClientNode;

},{}],3:[function(require,module,exports){
// import all the listen and replay strategies here
// note: these will get filtered out by browserify at build time
var listenAttr = require('./listen/listen_by_attributes');
var listenEvt = require('./listen/listen_by_event_bindings');
var listenSelect = require('./listen/listen_by_selectors');
var replayHydrate = require('./replay/replay_after_hydrate');
var replayRerender = require('./replay/replay_after_rerender');
// export state for testing purposes
exports.state = {
    eventListeners: [],
    events: [],
    listening: false
};
exports.strategies = {
    listen: {
        'attributes': listenAttr,
        'event_bindings': listenEvt,
        'selectors': listenSelect
    },
    replay: {
        'hydrate': replayHydrate,
        'rerender': replayRerender
    }
};
/**
 * For a given node, add an event listener based on the given attribute. The attribute
 * must match the Angular pattern for event handlers (i.e. either (event)='blah()' or
 * on-event='blah'
 */
function getEventHandler(preboot, strategy, node, eventName) {
    return function (event) {
        // if we aren't listening anymore (i.e. bootstrap complete) then don't capture any more events
        if (!exports.state.listening) {
            return;
        }
        // we want to wait until client bootstraps so don't allow default action
        if (strategy.preventDefault) {
            event.preventDefault();
        }
        // if we want to raise an event that others can listen for
        if (strategy.dispatchEvent) {
            preboot.dom.dispatchGlobalEvent(strategy.dispatchEvent);
        }
        // if callback provided for a custom action when an event occurs
        if (strategy.action) {
            strategy.action(preboot, node, event);
        }
        // when tracking focus keep a ref to the last active node
        if (strategy.trackFocus) {
            preboot.activeNode = (event.type === 'focusin') ? event.target : null;
        }
        // todo: need another solution for this hack
        if (eventName === 'keyup' && event.which === 13 && node.attributes['(keyup.enter)']) {
            preboot.dom.dispatchGlobalEvent('PrebootFreeze');
        }
        // we will record events for later replay unless explicitly marked as doNotReplay
        if (!strategy.doNotReplay) {
            exports.state.events.push({
                node: node,
                event: event,
                name: eventName,
                time: preboot.time || (new Date()).getTime()
            });
        }
    };
}
exports.getEventHandler = getEventHandler;
/**
 * Loop through node events and add listeners
 */
function addEventListeners(preboot, nodeEvents, strategy) {
    for (var _i = 0; _i < nodeEvents.length; _i++) {
        var nodeEvent = nodeEvents[_i];
        var node = nodeEvent.node;
        var eventName = nodeEvent.eventName;
        var handler = getEventHandler(preboot, strategy, node, eventName);
        // add the actual event listener and keep a ref so we can remove the listener during cleanup
        node.addEventListener(eventName, handler);
        exports.state.eventListeners.push({
            node: node,
            name: eventName,
            handler: handler
        });
    }
}
exports.addEventListeners = addEventListeners;
/**
 * Add event listeners based on node events found by the listen strategies.
 * Note that the getNodeEvents fn is gathered here without many safety
 * checks because we are doing all of those in src/server/normalize.ts.
 */
function startListening(preboot, opts) {
    exports.state.listening = true;
    for (var _i = 0, _a = opts.listen; _i < _a.length; _i++) {
        var strategy = _a[_i];
        var getNodeEvents = strategy.getNodeEvents || exports.strategies.listen[strategy.name].getNodeEvents;
        var nodeEvents = getNodeEvents(preboot, strategy);
        addEventListeners(preboot, nodeEvents, strategy);
    }
}
exports.startListening = startListening;
/**
 * Loop through replay strategies and call replayEvents functions. In most cases
 * there will be only one replay strategy, but users may want to add multiple in
 * some cases with the remaining events from one feeding into the next.
 * Note that as with startListening() above, there are very little safety checks
 * here in getting the replayEvents fn because those checks are in normalize.ts.
 */
function replayEvents(preboot, opts) {
    exports.state.listening = false;
    for (var _i = 0, _a = opts.replay; _i < _a.length; _i++) {
        var strategy = _a[_i];
        var replayEvts = strategy.replayEvents || exports.strategies.replay[strategy.name].replayEvents;
        exports.state.events = replayEvts(preboot, strategy, exports.state.events);
    }
    // it is probably an error if there are remaining events, but just log for now
    preboot.log(5, exports.state.events);
}
exports.replayEvents = replayEvents;
/**
 * Go through all the event listeners and clean them up
 * by removing them from the given node (i.e. element)
 */
function cleanup(preboot, opts) {
    var activeNode = preboot.activeNode;
    // if there is an active node set, it means focus was tracked in one or more of the listen strategies
    if (activeNode) {
        var activeClientNode = preboot.dom.findClientNode(activeNode);
        if (activeClientNode) {
            activeClientNode.focus();
        }
        else {
            preboot.log(6, activeNode);
        }
    }
    // cleanup the event listeners
    for (var _i = 0, _a = exports.state.eventListeners; _i < _a.length; _i++) {
        var listener = _a[_i];
        listener.node.removeEventListener(listener.name, listener.handler);
    }
    // finally clear out the events
    exports.state.events = [];
}
exports.cleanup = cleanup;

},{"./listen/listen_by_attributes":5,"./listen/listen_by_event_bindings":6,"./listen/listen_by_selectors":7,"./replay/replay_after_hydrate":9,"./replay/replay_after_rerender":10}],4:[function(require,module,exports){
// overlay and spinner nodes stored in memory in between prep and cleanup
exports.state = {
    overlay: null,
    spinner: null
};
/**
 * Clean up the freeze elements from the DOM
 */
function cleanup(preboot) {
    preboot.dom.removeNode(exports.state.overlay);
    preboot.dom.removeNode(exports.state.spinner);
    exports.state.overlay = null;
    exports.state.spinner = null;
}
exports.cleanup = cleanup;
/**
 * Prepare for freeze by adding elements to the DOM and adding an event handler
 */
function prep(preboot, opts) {
    var freezeOpts = opts.freeze || {};
    var freezeStyles = freezeOpts.styles || {};
    var overlayStyles = freezeStyles.overlay || {};
    var spinnerStyles = freezeStyles.spinner || {};
    // add the overlay and spinner to the end of the body
    exports.state.overlay = preboot.dom.addNodeToBody('div', overlayStyles.className, overlayStyles.style);
    exports.state.spinner = preboot.dom.addNodeToBody('div', spinnerStyles.className, spinnerStyles.style);
    // when a freeze event occurs, show the overlay and spinner
    preboot.dom.on(freezeOpts.eventName, function () {
        // if there is an active node, position spinner on top of it and blur the focus
        var activeNode = preboot.activeNode;
        if (activeNode) {
            exports.state.spinner.style.top = activeNode.offsetTop;
            exports.state.spinner.style.left = activeNode.offsetLeft;
            if (freezeOpts.doBlur) {
                activeNode.blur();
            }
        }
        // display the overlay and spinner
        exports.state.overlay.style.display = 'block';
        exports.state.spinner.style.display = 'block';
        // preboot should end in under 5 seconds, but if it doesn't unfreeze just in case  
        setTimeout(function () { return cleanup(preboot); }, freezeOpts.timeout);
    });
}
exports.prep = prep;

},{}],5:[function(require,module,exports){
/**
 * This listen strategy will look for a specific attribute which contains all the elements
 * that a given element is listening to. For ex. <div preboot-events="click,focus,touch">
 */
function getNodeEvents(preboot, strategy) {
    var attributeName = strategy.attributeName || 'preboot-events';
    var elems = preboot.dom.getAllAppNodes('[' + attributeName + ']');
    // if no elements found, return empty array since no node events
    if (!elems) {
        return [];
    }
    // else loop through all the elems and add node events
    var nodeEvents = [];
    for (var _i = 0; _i < elems.length; _i++) {
        var elem = elems[_i];
        var events = elem.getAttribute(attributeName).split(',');
        for (var _a = 0; _a < events.length; _a++) {
            var eventName = events[_a];
            nodeEvents.push({
                node: elem,
                eventName: eventName
            });
        }
    }
    return nodeEvents;
}
exports.getNodeEvents = getNodeEvents;

},{}],6:[function(require,module,exports){
// regex for how events defined in Angular 2 templates; for example:
//    <div on-click="blah()">
//    <div (click)="blah()">
var ngEventPattern = /^(on\-.*)|(\(.*\))$/;
// state for this module just includes the nodeEvents (exported for testing purposes)
exports.state = { nodeEvents: [] };
/**
 * This is from Crockford to walk the DOM (http://whlp.ly/1Ii6YbR).
 * Recursively walk DOM tree and execute input param function at
 * each node.
 */
function walkDOM(node, func) {
    if (!node) {
        return;
    }
    func(node);
    node = node.firstChild;
    while (node) {
        walkDOM(node, func);
        node = node.nextSibling;
    }
}
exports.walkDOM = walkDOM;
/**
 * This is function called at each node while walking DOM.
 * Will add node event if events defined on element.
 */
function addNodeEvents(node) {
    var attrs = node.attributes;
    // if no attributes, return without doing anything
    if (!attrs) {
        return;
    }
    // otherwise loop through attributes to try and find an Angular 2 event binding
    for (var _i = 0; _i < attrs.length; _i++) {
        var attr = attrs[_i];
        var name_1 = attr.name;
        // if attribute name is an Angular 2 event binding
        if (ngEventPattern.test(name_1)) {
            // extract event name from the () or on- (TODO: replace this w regex)
            name_1 = name_1.charAt(0) === '(' ?
                name_1.substring(1, name_1.length - 1) :
                name_1.substring(3); // remove on-
            exports.state.nodeEvents.push({
                node: node,
                eventName: name_1
            });
        }
    }
}
exports.addNodeEvents = addNodeEvents;
/**
 * This listen strategy will look for a specific attribute which contains all the elements
 * that a given element is listening to.
 */
function getNodeEvents(preboot, strategy) {
    exports.state.nodeEvents = [];
    walkDOM(preboot.dom.state.body, addNodeEvents);
    return exports.state.nodeEvents;
}
exports.getNodeEvents = getNodeEvents;

},{}],7:[function(require,module,exports){
/**
 * This listen strategy uses a list of selectors maped to events. For example:
 *    {
 *      'input[type="text"],textarea': ['focusin', 'focusout'],
 *      'button': ['click']
 *    }
 */
function getNodeEvents(preboot, strategy) {
    var nodeEvents = [];
    var eventsBySelector = strategy.eventsBySelector || {};
    var selectors = Object.keys(eventsBySelector);
    // loop through selectors
    for (var _i = 0; _i < selectors.length; _i++) {
        var selector = selectors[_i];
        var events = eventsBySelector[selector];
        var elems = preboot.dom.getAllAppNodes(selector);
        // if no elems, go to next iteration in for loop
        if (!elems) {
            continue;
        }
        // for each node and eventName combo, add a nodeEvent
        for (var _a = 0; _a < elems.length; _a++) {
            var elem = elems[_a];
            for (var _b = 0; _b < events.length; _b++) {
                var eventName = events[_b];
                nodeEvents.push({
                    node: elem,
                    eventName: eventName
                });
            }
        }
    }
    return nodeEvents;
}
exports.getNodeEvents = getNodeEvents;

},{}],8:[function(require,module,exports){
function logOptions(opts) {
    console.log('preboot options are:');
    console.log(opts);
}
function logEvents(events) {
    console.log('preboot events captured are:');
    console.log(events);
}
function replaySuccess(serverNode, clientNode, event) {
    console.log('replaying:');
    console.log({
        serverNode: serverNode,
        clientNode: clientNode,
        event: event
    });
}
function missingClientNode(serverNode) {
    console.log('preboot could not find client node for:');
    console.log(serverNode);
}
function remainingEvents(events) {
    if (events && events.length) {
        console.log('the following events were not replayed:');
        console.log(events);
    }
}
function noRefocus(serverNode) {
    console.log('Could not find node on client to match server node for refocus:');
    console.log(serverNode);
}
var logMap = {
    '1': logOptions,
    '2': logEvents,
    '3': replaySuccess,
    '4': missingClientNode,
    '5': remainingEvents,
    '6': noRefocus
};
/**
 * Idea here is simple. If debugging turned on and this module exists, we
 * log various things that happen in preboot. The calling code only references
 * a number (keys in logMap) to a handling function. By doing this, we are
 * able to cut down on the amount of logging code in preboot when no in debug mode.
 */
function log() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i - 0] = arguments[_i];
    }
    if (!args.length) {
        return;
    }
    var id = args[0] + '';
    var fn = logMap[id];
    if (fn) {
        fn.apply(void 0, args.slice(1));
    }
    else {
        console.log('log: ' + JSON.stringify(args));
    }
}
exports.log = log;

},{}],9:[function(require,module,exports){
/**
 * this replay strategy assumes that the client did not blow away
 * the server generated HTML and that the elements in memory for
 * preboot can be used to replay the events.
 *
 * any events that could not be replayed for whatever reason are returned.
 */
function replayEvents(preboot, strategy, events) {
    var remainingEvents = [];
    events = events || [];
    for (var _i = 0; _i < events.length; _i++) {
        var eventData = events[_i];
        var event_1 = eventData.event;
        var node = eventData.node;
        // if we should check to see if the node exists in the DOM before dispatching
        // note: this can be expensive so this option is false by default
        if (strategy.checkIfExists && !preboot.dom.appContains(node)) {
            remainingEvents.push(eventData);
        }
        else {
            node.dispatchEvent(event_1);
        }
    }
    return remainingEvents;
}
exports.replayEvents = replayEvents;

},{}],10:[function(require,module,exports){
/**
 * This replay strategy assumes that the client completely re-rendered
 * the page so reboot will need to find the element in the new client
 * rendered DOM that matches the element it has in memory.
 *
 * Any events that could not be replayed for whatever reason are returned.
 */
function replayEvents(preboot, strategy, events) {
    var remainingEvents = [];
    events = events || [];
    // loop through the events, find the appropriate client node and dispatch the event
    for (var _i = 0; _i < events.length; _i++) {
        var eventData = events[_i];
        var event_1 = eventData.event;
        var serverNode = eventData.node;
        var clientNode = preboot.dom.findClientNode(serverNode);
        // if client node found, need to explicitly set value and then dispatch event
        if (clientNode) {
            clientNode.value = serverNode.value;
            clientNode.dispatchEvent(event_1);
            preboot.log(3, serverNode, clientNode, event_1);
        }
        else {
            remainingEvents.push(eventData);
            preboot.log(4, serverNode);
        }
    }
    return remainingEvents;
}
exports.replayEvents = replayEvents;

},{}],11:[function(require,module,exports){
/// <reference path="../../../../tsd_typings/tsd.d.ts"/>
var buffer_manager_1 = require('../../src/client/buffer_manager');
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

},{"../../src/client/buffer_manager":1}],12:[function(require,module,exports){
/// <reference path="../../../../tsd_typings/tsd.d.ts"/>
var dom = require('../../src/client/dom');
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

},{"../../src/client/dom":2}],13:[function(require,module,exports){
/// <reference path="../../../../tsd_typings/tsd.d.ts"/>
var eventManager = require('../../src/client/event_manager');
describe('event_manager', function () {
    describe('getEventHandler()', function () {
        it('should do nothing if not listening', function () {
            var preboot = { dom: {} };
            var strategy = {};
            var node = {};
            var eventName = 'click';
            var event = {};
            eventManager.state.listening = false;
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
        });
        it('should call preventDefault', function () {
            var preboot = { dom: {} };
            var strategy = { preventDefault: true };
            var node = {};
            var eventName = 'click';
            var event = { preventDefault: function () { } };
            spyOn(event, 'preventDefault');
            eventManager.state.listening = true;
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
            expect(event.preventDefault).toHaveBeenCalled();
        });
        it('should dispatch global event', function () {
            var preboot = {
                dom: {
                    dispatchGlobalEvent: function () { }
                }
            };
            var strategy = { dispatchEvent: 'yo yo yo' };
            var node = {};
            var eventName = 'click';
            var event = {};
            spyOn(preboot.dom, 'dispatchGlobalEvent');
            eventManager.state.listening = true;
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
            expect(preboot.dom.dispatchGlobalEvent).toHaveBeenCalledWith(strategy.dispatchEvent);
        });
        it('should call action', function () {
            var preboot = { dom: {} };
            var strategy = { action: function () { } };
            var node = {};
            var eventName = 'click';
            var event = {};
            spyOn(strategy, 'action');
            eventManager.state.listening = true;
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
            expect(strategy.action).toHaveBeenCalledWith(preboot, node, event);
        });
        it('should track focus', function () {
            var preboot = { dom: {}, activeNode: null };
            var strategy = { trackFocus: true };
            var node = {};
            var eventName = 'click';
            var event = { type: 'focusin', target: { name: 'foo' } };
            eventManager.state.listening = true;
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
            expect(preboot.activeNode).toEqual(event.target);
        });
        it('should add to events', function () {
            var preboot = { dom: {}, time: (new Date()).getTime() };
            var strategy = {};
            var node = {};
            var eventName = 'click';
            var event = { type: 'focusin', target: { name: 'foo' } };
            eventManager.state.listening = true;
            eventManager.state.events = [];
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
            expect(eventManager.state.events).toEqual([{
                    node: node,
                    event: event,
                    name: eventName,
                    time: preboot.time
                }]);
        });
        it('should not add events if doNotReplay', function () {
            var preboot = { dom: {}, time: (new Date()).getTime() };
            var strategy = { doNotReplay: true };
            var node = {};
            var eventName = 'click';
            var event = { type: 'focusin', target: { name: 'foo' } };
            eventManager.state.listening = true;
            eventManager.state.events = [];
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
            expect(eventManager.state.events).toEqual([]);
        });
    });
    describe('addEventListeners()', function () {
        it('should add nodeEvents to listeners', function () {
            var preboot = { dom: {} };
            var nodeEvent1 = { node: { name: 'zoo', addEventListener: function () { } }, eventName: 'foo' };
            var nodeEvent2 = { node: { name: 'shoo', addEventListener: function () { } }, eventName: 'moo' };
            var nodeEvents = [nodeEvent1, nodeEvent2];
            var strategy = {};
            spyOn(nodeEvent1.node, 'addEventListener');
            spyOn(nodeEvent2.node, 'addEventListener');
            eventManager.state.eventListeners = [];
            eventManager.addEventListeners(preboot, nodeEvents, strategy);
            expect(nodeEvent1.node.addEventListener).toHaveBeenCalled();
            expect(nodeEvent2.node.addEventListener).toHaveBeenCalled();
            expect(eventManager.state.eventListeners.length).toEqual(2);
            expect(eventManager.state.eventListeners[0].name).toEqual(nodeEvent1.eventName);
        });
    });
    describe('startListening()', function () {
        it('should set the listening state', function () {
            var preboot = { dom: {} };
            var opts = { listen: [] };
            eventManager.state.listening = false;
            eventManager.startListening(preboot, opts);
            expect(eventManager.state.listening).toEqual(true);
        });
    });
    describe('replayEvents()', function () {
        it('should set listening to false', function () {
            var preboot = { dom: {}, log: function () { } };
            var opts = { replay: [] };
            var evts = [{ foo: 'choo' }];
            spyOn(preboot, 'log');
            eventManager.state.listening = true;
            eventManager.state.events = evts;
            eventManager.replayEvents(preboot, opts);
            expect(eventManager.state.listening).toEqual(false);
            expect(preboot.log).toHaveBeenCalledWith(5, evts);
        });
    });
    describe('cleanup()', function () {
        it('should set events to empty array', function () {
            var preboot = { dom: {} };
            var opts = {};
            eventManager.state.eventListeners = [];
            eventManager.state.events = [{ foo: 'moo' }];
            eventManager.cleanup(preboot, opts);
            expect(eventManager.state.events).toEqual([]);
        });
    });
});

},{"../../src/client/event_manager":3}],14:[function(require,module,exports){
/// <reference path="../../../../../tsd_typings/tsd.d.ts"/>
var freeze_with_spinner_1 = require('../../../src/client/freeze/freeze_with_spinner');
describe('freeze_with_spinner', function () {
    describe('cleanup()', function () {
        it('should call removeNode and null out overlay and spinner', function () {
            var preboot = { dom: { removeNode: null } };
            freeze_with_spinner_1.state.overlay = 'boo';
            freeze_with_spinner_1.state.spinner = 'food';
            spyOn(preboot.dom, 'removeNode');
            freeze_with_spinner_1.cleanup(preboot);
            expect(preboot.dom.removeNode).toHaveBeenCalledWith('boo');
            expect(preboot.dom.removeNode).toHaveBeenCalledWith('food');
            expect(freeze_with_spinner_1.state.overlay).toBeNull();
            expect(freeze_with_spinner_1.state.spinner).toBeNull();
        });
    });
    describe('prep()', function () {
        it('should call preboot fns trying to freeze UI', function () {
            var preboot = {
                dom: {
                    addNodeToBody: function () { return { style: {} }; },
                    on: function () { },
                    removeNode: function () { }
                }
            };
            var opts = {};
            spyOn(preboot.dom, 'addNodeToBody');
            spyOn(preboot.dom, 'on');
            spyOn(preboot.dom, 'removeNode');
            freeze_with_spinner_1.prep(preboot, opts);
            expect(preboot.dom.addNodeToBody).toHaveBeenCalled();
            expect(preboot.dom.on).toHaveBeenCalled();
        });
    });
});

},{"../../../src/client/freeze/freeze_with_spinner":4}],15:[function(require,module,exports){
/// <reference path="../../../../../tsd_typings/tsd.d.ts"/>
var listen_by_attributes_1 = require('../../../src/client/listen/listen_by_attributes');
describe('listen_by_attributes', function () {
    describe('getNodeEvents()', function () {
        it('should return nothing if no selection found', function () {
            var preboot = {
                dom: {
                    getAllAppNodes: function () { return null; }
                }
            };
            var strategy = {};
            var expected = [];
            var actual = listen_by_attributes_1.getNodeEvents(preboot, strategy);
            expect(actual).toEqual(expected);
        });
        it('should return node events for elems with attribute', function () {
            var nodes = [
                { name: 'one', getAttribute: function () { return 'yo,mo'; } },
                { name: 'two', getAttribute: function () { return 'shoo,foo'; } }
            ];
            var preboot = {
                dom: {
                    getAllAppNodes: function () { return nodes; }
                }
            };
            var strategy = {};
            var expected = [
                { node: nodes[0], eventName: 'yo' },
                { node: nodes[0], eventName: 'mo' },
                { node: nodes[1], eventName: 'shoo' },
                { node: nodes[1], eventName: 'foo' }
            ];
            var actual = listen_by_attributes_1.getNodeEvents(preboot, strategy);
            expect(actual).toEqual(expected);
        });
    });
});

},{"../../../src/client/listen/listen_by_attributes":5}],16:[function(require,module,exports){
/// <reference path="../../../../../tsd_typings/tsd.d.ts"/>
var listen_by_event_bindings_1 = require('../../../src/client/listen/listen_by_event_bindings');
describe('listen_by_event_bindings', function () {
    describe('walkDOM', function () {
        it('should not do anything if no node passed in', function () {
            listen_by_event_bindings_1.walkDOM(null, null);
        });
        it('should walk a fake DOM', function () {
            var node4 = {};
            var node3 = { nextSibling: node4 };
            var node2 = { nextSibling: node3 };
            var node1 = { firstChild: node2 };
            var obj = { cb: function () { } };
            spyOn(obj, 'cb');
            listen_by_event_bindings_1.walkDOM(node1, obj.cb);
            expect(obj.cb).toHaveBeenCalledWith(node1);
            expect(obj.cb).toHaveBeenCalledWith(node2);
            expect(obj.cb).toHaveBeenCalledWith(node3);
            expect(obj.cb).toHaveBeenCalledWith(node4);
        });
    });
    describe('addNodeEvents', function () {
        it('should not do anything with no attrs', function () {
            var node = {};
            listen_by_event_bindings_1.addNodeEvents(node);
            expect(node).toEqual({});
        });
        it('should add node events', function () {
            var node = {
                attributes: [
                    { name: '(click)' },
                    { name: 'zoo' },
                    { name: 'on-foo' }
                ]
            };
            var expected = [
                { node: node, eventName: 'click' },
                { node: node, eventName: 'foo' }
            ];
            listen_by_event_bindings_1.addNodeEvents(node);
            expect(listen_by_event_bindings_1.state.nodeEvents).toEqual(expected);
        });
    });
    describe('getNodeEvents()', function () {
        it('should return an empty array if no body', function () {
            var preboot = {
                dom: {
                    state: {}
                }
            };
            var strategy = {};
            var expected = [];
            var actual = listen_by_event_bindings_1.getNodeEvents(preboot, strategy);
            expect(actual).toEqual(expected);
        });
    });
});

},{"../../../src/client/listen/listen_by_event_bindings":6}],17:[function(require,module,exports){
/// <reference path="../../../../../tsd_typings/tsd.d.ts"/>
var listen_by_selectors_1 = require('../../../src/client/listen/listen_by_selectors');
describe('listen_by_selectors', function () {
    describe('getNodeEvents()', function () {
        it('should return nothing if nothing from query', function () {
            var preboot = {
                dom: {
                    getAllAppNodes: function () { return null; }
                }
            };
            var strategy = {
                eventsBySelector: { 'div.blah': ['evt1', 'evt2'] }
            };
            var expected = [];
            var actual = listen_by_selectors_1.getNodeEvents(preboot, strategy);
            expect(actual).toEqual(expected);
        });
        it('should return node events', function () {
            var preboot = {
                dom: {
                    getAllAppNodes: function () { return [{ name: 'one' }, { name: 'two' }]; }
                }
            };
            var strategy = {
                eventsBySelector: { 'div.blah': ['evt1', 'evt2'] }
            };
            var expected = [
                { node: { name: 'one' }, eventName: 'evt1' },
                { node: { name: 'one' }, eventName: 'evt2' },
                { node: { name: 'two' }, eventName: 'evt1' },
                { node: { name: 'two' }, eventName: 'evt2' }
            ];
            var actual = listen_by_selectors_1.getNodeEvents(preboot, strategy);
            expect(actual).toEqual(expected);
        });
    });
});

},{"../../../src/client/listen/listen_by_selectors":7}],18:[function(require,module,exports){
/// <reference path="../../../../tsd_typings/tsd.d.ts"/>
var log_1 = require('../../src/client/log');
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

},{"../../src/client/log":8}],19:[function(require,module,exports){
/// <reference path="../../../../../tsd_typings/tsd.d.ts"/>
var replay_after_hydrate_1 = require('../../../src/client/replay/replay_after_hydrate');
describe('replay_after_hydrate', function () {
    describe('replayEvents()', function () {
        it('should do nothing and return empty array if no params', function () {
            var preboot = { dom: {} };
            var strategy = {};
            var events = [];
            var expected = [];
            var actual = replay_after_hydrate_1.replayEvents(preboot, strategy, events);
            expect(actual).toEqual(expected);
        });
        it('should dispatch all events w/o checkIfExists', function () {
            var node1 = { name: 'node1', dispatchEvent: function (evt) { } };
            var node2 = { name: 'node2', dispatchEvent: function (evt) { } };
            var preboot = {
                dom: {
                    appContains: function () { return false; }
                }
            };
            var strategy = {
                checkIfExists: false
            };
            var events = [
                { name: 'evt1', event: { name: 'evt1' }, node: node1 },
                { name: 'evt2', event: { name: 'evt2' }, node: node2 }
            ];
            var expected = [];
            spyOn(node1, 'dispatchEvent');
            spyOn(node2, 'dispatchEvent');
            spyOn(preboot.dom, 'appContains');
            var actual = replay_after_hydrate_1.replayEvents(preboot, strategy, events);
            expect(actual).toEqual(expected);
            expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
            expect(node2.dispatchEvent).toHaveBeenCalledWith(events[1].event);
            expect(preboot.dom.appContains).not.toHaveBeenCalled();
        });
        it('should checkIfExists and only dispatch on 1 node, return other', function () {
            var node1 = { name: 'node1', dispatchEvent: function (evt) { } };
            var node2 = { name: 'node2', dispatchEvent: function (evt) { } };
            var preboot = {
                dom: {
                    appContains: function (node) {
                        return node.name === 'node1';
                    }
                }
            };
            var strategy = {
                checkIfExists: true
            };
            var events = [
                { name: 'evt1', event: { name: 'evt1' }, node: node1 },
                { name: 'evt2', event: { name: 'evt2' }, node: node2 }
            ];
            var expected = [
                { name: 'evt2', event: { name: 'evt2' }, node: node2 }
            ];
            spyOn(node1, 'dispatchEvent');
            spyOn(node2, 'dispatchEvent');
            spyOn(preboot.dom, 'appContains').and.callThrough();
            var actual = replay_after_hydrate_1.replayEvents(preboot, strategy, events);
            expect(actual).toEqual(expected);
            expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
            expect(node2.dispatchEvent).not.toHaveBeenCalled();
            expect(preboot.dom.appContains).toHaveBeenCalledWith(node1);
            expect(preboot.dom.appContains).toHaveBeenCalledWith(node2);
        });
    });
});

},{"../../../src/client/replay/replay_after_hydrate":9}],20:[function(require,module,exports){
/// <reference path="../../../../../tsd_typings/tsd.d.ts"/>
var replay_after_rerender_1 = require('../../../src/client/replay/replay_after_rerender');
describe('replay_after_rerender', function () {
    describe('replayEvents()', function () {
        it('should do nothing and return empty array if no params', function () {
            var preboot = { dom: {} };
            var strategy = {};
            var events = [];
            var expected = [];
            var actual = replay_after_rerender_1.replayEvents(preboot, strategy, events);
            expect(actual).toEqual(expected);
        });
        it('should dispatch all events', function () {
            var node1 = { name: 'node1', dispatchEvent: function (evt) { } };
            var node2 = { name: 'node2', dispatchEvent: function (evt) { } };
            var preboot = {
                dom: {
                    findClientNode: function (node) { return node; }
                },
                log: function () { }
            };
            var strategy = {};
            var events = [
                { name: 'evt1', event: { name: 'evt1' }, node: node1 },
                { name: 'evt2', event: { name: 'evt2' }, node: node2 }
            ];
            var expected = [];
            spyOn(node1, 'dispatchEvent');
            spyOn(node2, 'dispatchEvent');
            spyOn(preboot.dom, 'findClientNode').and.callThrough();
            spyOn(preboot, 'log');
            var actual = replay_after_rerender_1.replayEvents(preboot, strategy, events);
            expect(actual).toEqual(expected);
            expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
            expect(node2.dispatchEvent).toHaveBeenCalledWith(events[1].event);
            expect(preboot.dom.findClientNode).toHaveBeenCalledWith(node1);
            expect(preboot.dom.findClientNode).toHaveBeenCalledWith(node2);
            expect(preboot.log).toHaveBeenCalledWith(3, node1, node1, events[0].event);
            expect(preboot.log).toHaveBeenCalledWith(3, node2, node2, events[1].event);
        });
        it('should dispatch one event and return the other', function () {
            var node1 = { name: 'node1', dispatchEvent: function (evt) { } };
            var node2 = { name: 'node2', dispatchEvent: function (evt) { } };
            var preboot = {
                dom: {
                    findClientNode: function (node) {
                        return node.name === 'node1' ? node : null;
                    }
                },
                log: function () { }
            };
            var strategy = {};
            var events = [
                { name: 'evt1', event: { name: 'evt1' }, node: node1 },
                { name: 'evt2', event: { name: 'evt2' }, node: node2 }
            ];
            var expected = [
                { name: 'evt2', event: { name: 'evt2' }, node: node2 }
            ];
            spyOn(node1, 'dispatchEvent');
            spyOn(node2, 'dispatchEvent');
            spyOn(preboot.dom, 'findClientNode').and.callThrough();
            spyOn(preboot, 'log');
            var actual = replay_after_rerender_1.replayEvents(preboot, strategy, events);
            expect(actual).toEqual(expected);
            expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
            expect(node2.dispatchEvent).not.toHaveBeenCalled();
            expect(preboot.dom.findClientNode).toHaveBeenCalledWith(node1);
            expect(preboot.dom.findClientNode).toHaveBeenCalledWith(node2);
            expect(preboot.log).toHaveBeenCalledWith(3, node1, node1, events[0].event);
            expect(preboot.log).toHaveBeenCalledWith(4, node2);
        });
    });
});

},{"../../../src/client/replay/replay_after_rerender":10}],21:[function(require,module,exports){
// this is the entry point for karma tests
require('./client/freeze/freeze_with_spinner_spec');
require('./client/listen/listen_by_attributes_spec');
require('./client/listen/listen_by_event_bindings_spec');
require('./client/listen/listen_by_selectors_spec');
require('./client/replay/replay_after_hydrate_spec');
require('./client/replay/replay_after_rerender_spec');
require('./client/buffer_manager_spec');
require('./client/dom_spec');
require('./client/event_manager_spec');
require('./client/log_spec');

},{"./client/buffer_manager_spec":11,"./client/dom_spec":12,"./client/event_manager_spec":13,"./client/freeze/freeze_with_spinner_spec":14,"./client/listen/listen_by_attributes_spec":15,"./client/listen/listen_by_event_bindings_spec":16,"./client/listen/listen_by_selectors_spec":17,"./client/log_spec":18,"./client/replay/replay_after_hydrate_spec":19,"./client/replay/replay_after_rerender_spec":20}]},{},[21]);
