(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.preboot = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./listen/listen_by_attributes":9,"./listen/listen_by_event_bindings":9,"./listen/listen_by_selectors":5,"./replay/replay_after_hydrate":9,"./replay/replay_after_rerender":8}],4:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
/**
 * This is the main entry point for preboot on the client side.
 * The primary methods are:
 *    init() - called automatically to initialize preboot according to options
 *    start() - when preboot should start listening to events
 *    done() - when preboot should start replaying events
 */
var dom = require('./dom');
var eventManager = require('./event_manager');
var bufferManager = require('./buffer_manager');
var logManager = require('./log');
var freezeSpin = require('./freeze/freeze_with_spinner');
// this is an impl of PrebootRef which can be passed into other client modules
// so they don't have to directly ref dom or log. this used so that users can
// write plugin strategies which get this object as an input param.
// note that log is defined this way because browserify can blank it out.
/* tslint:disable:no-empty */
var preboot = {
    dom: dom,
    log: logManager.log || function () { }
};
// in each client-side module, we store state in an object so we can mock
// it out during testing and easily reset it as necessary
var state = {
    canComplete: true,
    completeCalled: false,
    freeze: null,
    opts: null,
    started: false
};
/**
 * Once bootstrap has compled, we replay events,
 * switch buffer and then cleanup
 */
function complete() {
    preboot.log(2, eventManager.state.events);
    // track that complete has been called
    state.completeCalled = true;
    // if we can't complete (i.e. preboot paused), just return right away
    if (!state.canComplete) {
        return;
    }
    // else we can complete, so get started with events
    var opts = state.opts;
    eventManager.replayEvents(preboot, opts); // replay events on client DOM
    if (opts.buffer) {
        bufferManager.switchBuffer(preboot);
    } // switch from server to client buffer
    if (opts.freeze) {
        state.freeze.cleanup(preboot);
    } // cleanup freeze divs like overlay
    eventManager.cleanup(preboot, opts); // cleanup event listeners
}
exports.complete = complete;
/**
 * Get function to run once window has loaded
 */
function load() {
    var opts = state.opts;
    // re-initialize dom now that we have the body
    dom.init({ window: window });
    // make sure the app root is set
    dom.updateRoots(dom.getDocumentNode(opts.appRoot));
    // if we are buffering, need to switch around the divs
    if (opts.buffer) {
        bufferManager.prep(preboot);
    }
    // if we could potentially freeze the UI, we need to prep (i.e. to add divs for overlay, etc.)
    // note: will need to alter this logic when we have more than one freeze strategy
    if (opts.freeze) {
        state.freeze = opts.freeze.name === 'spinner' ? freezeSpin : opts.freeze;
        state.freeze.prep(preboot, opts);
    }
    // start listening to events
    eventManager.startListening(preboot, opts);
}
;
/**
 * Resume the completion process; if complete already called,
 * call it again right away
 */
function resume() {
    state.canComplete = true;
    if (state.completeCalled) {
        // using setTimeout to fix weird bug where err thrown on
        // serverRoot.remove() in buffer switch
        setTimeout(complete, 10);
    }
}
/**
 * Initialization is really simple. Just save the options and set
 * the window object. Most stuff happens with start()
 */
function init(opts) {
    state.opts = opts;
    preboot.log(1, opts);
    dom.init({ window: window });
}
exports.init = init;
/**
 * Start preboot by starting to record events
 */
function start() {
    var opts = state.opts;
    // we can only start once, so don't do anything if called multiple times
    if (state.started) {
        return;
    }
    // initialize the window
    dom.init({ window: window });
    // if body there, then run load handler right away, otherwise register for onLoad
    dom.state.body ? load() : dom.onLoad(load);
    // set up other handlers
    dom.on(opts.pauseEvent, function () { return state.canComplete = false; });
    dom.on(opts.resumeEvent, resume);
    dom.on(opts.completeEvent, complete);
}
exports.start = start;

},{"./buffer_manager":1,"./dom":2,"./event_manager":3,"./freeze/freeze_with_spinner":4,"./log":6}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){

},{}]},{},[7])(7)
});

preboot.init({"appRoot":"app","freeze":{"name":"spinner","styles":{"overlay":{"className":"preboot-overlay","style":{"position":"absolute","display":"none","zIndex":"9999999","top":"0","left":"0","width":"100%","height":"100%"}},"spinner":{"className":"preboot-spinner","style":{"position":"absolute","display":"none","zIndex":"99999999"}}},"eventName":"PrebootFreeze","timeout":5000,"doBlur":true},"replay":[{"name":"rerender"}],"buffer":true,"debug":true,"uglify":false,"presets":["keyPress","buttonPress","focus"],"pauseEvent":"PrebootPause","resumeEvent":"PrebootResume","completeEvent":"BootstrapComplete","listen":[{"name":"selectors","eventsBySelector":{"input[type=\"text\"],textarea":["keypress","keyup","keydown"]}},{"name":"selectors","preventDefault":true,"eventsBySelector":{"input[type=\"submit\"],button":["click"]},"dispatchEvent":"PrebootFreeze"},{"name":"selectors","eventsBySelector":{"input[type=\"text\"],textarea":["focusin","focusout"]},"trackFocus":true,"doNotReplay":true}]});

