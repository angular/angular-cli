/// <reference path="../../../../tsd_typings/tsd.d.ts"/>

import * as dom from '../../src/client/dom';

describe('dom', function () {
  describe('init()', function () {
    it('set values based on input', function () {
      let opts = { window: { document: { body: {}}}};
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
      let appRoot = {};
      let serverRoot = {};
      let clientRoot = {};
      dom.updateRoots(appRoot, serverRoot, clientRoot);
      expect(dom.state.appRoot).toBe(appRoot);
      expect(dom.state.serverRoot).toBe(serverRoot);
      expect(dom.state.clientRoot).toBe(clientRoot);  
    });  
  });
  
  describe('getAppNode()', function () {
    it('should call appRoot querySelector', function () {
      let selector = 'foo > man > choo';
      let appRoot = { querySelector: function () {} };
      spyOn(appRoot, 'querySelector');
      dom.state.appRoot = appRoot;
      dom.getAppNode(selector);
      expect(appRoot.querySelector).toHaveBeenCalledWith(selector);
    });  
  });
  
  describe('getAllAppNodes()', function () {
    it('should call appRoot querySelectorAll', function () {
      let selector = 'foo > man > choo';
      let appRoot = { querySelectorAll: function () {} };
      spyOn(appRoot, 'querySelectorAll');
      dom.state.appRoot = appRoot;
      dom.getAllAppNodes(selector);
      expect(appRoot.querySelectorAll).toHaveBeenCalledWith(selector);
    });  
  });
  
  describe('getClientNodes()', function () {
    it('should call clientRoot querySelectorAll', function () {
      let selector = 'foo > man > choo';
      let clientRoot = { querySelectorAll: function () {} };
      spyOn(clientRoot, 'querySelectorAll');
      dom.state.clientRoot = clientRoot;
      dom.getClientNodes(selector);
      expect(clientRoot.querySelectorAll).toHaveBeenCalledWith(selector);
    });  
  });
  
  describe('onLoad()', function () {
    it('should call window addEventListener for load event', function () {
      let handler = function () {};
      let window = { addEventListener: function () {} };
      spyOn(window, 'addEventListener');
      dom.state.window = window;
      dom.onLoad(handler);
      expect(window.addEventListener).toHaveBeenCalledWith('load', handler);
    });  
  });
  
  describe('on()', function () {
    it('should call document addEventListener', function () {
      let eventName = 'boo';
      let handler = function () {};
      let document = { addEventListener: function () {} };
      spyOn(document, 'addEventListener');
      dom.state.document = document;
      dom.on(eventName, handler);
      expect(document.addEventListener).toHaveBeenCalledWith(eventName, handler);
    });  
  });
  
  describe('dispatchGlobalEvent()', function () {
    it('should call document dispatchEvent', function () {
      let eventName = 'boo';
      let window = { Event: function () {} };
      let document = { dispatchEvent: function () {} };
      spyOn(document, 'dispatchEvent');
      dom.state.window = window;
      dom.state.document = document;
      dom.dispatchGlobalEvent(eventName);
      expect(document.dispatchEvent).toHaveBeenCalled();
    });  
  });
  
  describe('dispatchNodeEvent()', function () {
    it('should call node dispatchEvent', function () {
      let node = { dispatchEvent: function () {} };
      let eventName = 'boo';
      let window = { Event: function () {} };
      spyOn(node, 'dispatchEvent');
      dom.state.window = window;
      dom.dispatchNodeEvent(node, eventName);
      expect(node.dispatchEvent).toHaveBeenCalled();
    });  
  });
  
  describe('addNodeToBody()', function () {
    it('should create node, add styles and append to body', function () {
      let type = 'div';
      let className = 'foo';
      let styles = { display: 'none', width: '300px' };
      
      let newElem = { className: '', style: { display: 'block', height: '200px' } };
      let document = {
        createElement: function () {
          return newElem;
        }
      };
      let body = { appendChild: function () {} };
      
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
      let node = { remove: function () {} };
      spyOn(node, 'remove');
      dom.removeNode(node);
      expect(node.remove).toHaveBeenCalled();  
    });
    
    it('should set display none when remove not there', function () {
      let node = { style: { display: '' }};
      dom.removeNode(node);
      expect(node.style.display).toEqual('none');
    });
  });
  
  describe('getSelection', function() {
    it('should return zero if nothing passed in', function() {
      expect(dom.getSelection(null)).toEqual({
        start: 0,
        end: 0,
        direction: 'forward'
      });
    });
    
    it('should return the length of the node text if nothing else', function() {
      let node = { focus: function() { }, value: 'booyeah' };

      dom.state.document = {};
      
      let expected = { start: 7, end: 7, direction: 'forward' };
      let actual = dom.getSelection(node);
      expect(actual).toEqual(expected);
    });
    
    it('should return if node.selectionStart exists', function() {
      let node = { 
        value: 'boo', 
        selectionStart: 1,
        selectionEnd: 3,
        selectionDirection: 'backward'
      };
      
      let expected = { start: 1, end: 3, direction: 'backward' };
      let actual = dom.getSelection(node);
      expect(actual).toEqual(expected);
    });
  });
  
  describe('setSelection()', function() {
    it('should do nothing if no node passed in', function() {
      dom.setSelection(null, null);
    });
    
    it('should use setSelectionRange on node if available', function() {
      let node = { 
        focus: function() { }, 
        setSelectionRange: function() {}
      };
      let selection = {
        start: 4,
        end: 7,
        direction: 'forward'
      };
      
      spyOn(node, 'focus');
      spyOn(node, 'setSelectionRange');
      
      dom.setSelection(node, selection);
      expect(node.focus).toHaveBeenCalled();
      expect(node.setSelectionRange).toHaveBeenCalledWith(selection.start, selection.end, selection.direction);
    });
  });
  
  describe('node tree fns', function () {
    
    // this is used to help with the testing of this function
    // create tree like structure
    function addParent(anode) {
      if (anode && anode.childNodes) {
        for (let childNode of anode.childNodes) {
          childNode.parentNode = anode;
          addParent(childNode);  
        }
      }
    }
   
    let node = { nodeName: 'DIV' };
    let document = {
      childNodes: [{}, {}, {
        childNodes: [{}, {
          childNodes: [{}, {}, {}, node]
        }]
      }]
    };
    let rootNode = document.childNodes[2];
    let expectedNodeKey = 'DIV_s2_s4';

    addParent(document);
    
    describe('getNodeKey()', function () {
      it('should generate a key based of the node structure', function () {
        let actual = dom.getNodeKey(node, rootNode);
        expect(actual).toEqual(expectedNodeKey);
      });
    });
    
    describe('findClientNode()', function () {
      it('should return null if no serverNode passed in', function () {
        expect(dom.findClientNode(null)).toBeNull();
      });
      
      it('should get a node from cache', function () {
        let clientNode = { name: 'zoo' };
        dom.nodeCache[expectedNodeKey] = [{
          serverNode: node,
          clientNode: clientNode
        }];
        dom.state.serverRoot = rootNode;
        
        let actual = dom.findClientNode(node);
        expect(actual).toBe(clientNode);
      });
      
      // todo: other test cases for when not using cache
    });
  });
});
