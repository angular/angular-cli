import * as app from '../../src/browser/app_manager';
import { App, AppState } from '../../src/interfaces/app';

describe('app', function () {
  describe('initAppRoot()', function () {
    it('set values based on input', function () {
      let opts = { window:  { document:  { body:  {}}}};
      let appState: AppState =  { 
       freeze: null,
       appRootName: null, 
       opts: null, 
       canComplete: false, 
       completeCalled: false, 
       started: false, 
       window: null, 
       document: null, 
       body: null, 
       appRoot: null, 
       clientRoot: null, 
       serverRoot: null};
       
      app.initAppRoot(appState, opts);
      
      expect(appState.window).toEqual(opts.window);
      expect(appState.document).toEqual(opts.window.document);
      expect(appState.body).toEqual(opts.window.document.body);
      expect(appState.appRoot).toEqual(opts.window.document.body);
      expect(appState.clientRoot).toEqual(opts.window.document.body);
    });  
  });
  
  describe('updateRoots()', function () {
    it('should set the roots in the state', function () {
      let appRoot = {};
      let serverRoot = {};
      let clientRoot = {};
      
      let appState: AppState =  { 
       freeze: null,
       appRootName: null, 
       opts: null, 
       canComplete: false, 
       completeCalled: false, 
       started: false, 
       window: null, 
       document: null, 
       body: null, 
       appRoot: null, 
       clientRoot: null, 
       serverRoot: null};
       
      app.updateAppRoots(appState, appRoot, serverRoot, clientRoot);
      
      expect(appState.appRoot).toBe(appRoot);
      expect(appState.serverRoot).toBe(serverRoot);
      expect(appState.clientRoot).toBe(clientRoot);  
    });  
  });
  
  describe('getAppNode()', function () {
    it('should call appRoot querySelector', function () {
      let selector = 'foo > man > choo';
      let appRoot = { querySelector:  function () {} };
      spyOn(appRoot, 'querySelector');
      
      let appState: AppState =  { 
       freeze: null,
       appRootName: null, 
       opts: null, 
       canComplete: false, 
       completeCalled: false, 
       started: false, 
       appRoot: appRoot
      };
      app.getAppNode(appState, selector);
      
      expect(appRoot.querySelector).toHaveBeenCalledWith(selector);
    });  
  });
  
  describe('getAllAppNodes()', function () {
    it('should call appRoot querySelectorAll', function () {
      let selector = 'foo > man > choo';
      let appRoot = { querySelectorAll:  function () {} };
      spyOn(appRoot, 'querySelectorAll');
      
         let appState: AppState =  { 
       freeze: null,
       appRootName: null, 
       opts: null, 
       canComplete: false, 
       completeCalled: false, 
       started: false, 
       appRoot: appRoot
      };
            
      app.getAllAppNodes(appState, selector);
      expect(appRoot.querySelectorAll).toHaveBeenCalledWith(selector);
    });  
  });
  
  describe('getClientNodes()', function () {
    it('should call clientRoot querySelectorAll', function () {
      let selector = 'foo > man > choo';
      let clientRoot = { querySelectorAll:  function () {} };
      spyOn(clientRoot, 'querySelectorAll');
      
      let appState: AppState =  { 
        freeze: null,
        appRootName: null, 
        opts: null, 
        canComplete: false, 
        completeCalled: false, 
        started: false, 
        clientRoot: clientRoot
      };
      
      app.getClientNodes(appState, selector);
      expect(clientRoot.querySelectorAll).toHaveBeenCalledWith(selector);
    });  
  });
  
  describe('onLoad()', function () {
    it('should call window addEventListener for load event', function () {
      let handler = function () {};
      let window = { addEventListener:  function () {} };
      let document = { addEventListener:  function () {} };
      spyOn(document, 'addEventListener');
      
      let appState: AppState =  { 
       freeze: null,
       appRootName: null, 
       opts: null, 
       canComplete: false, 
       completeCalled: false, 
       started: false, 
       window: window, 
       document: document
      };
      app.onLoad(appState, handler);
      expect(document.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', jasmine.any(Function));
    });  
  });
  
  describe('on()', function () {
    it('should call document addEventListener', function () {
      let eventName = 'boo';
      let handler = function () {};
      let document = { addEventListener:  function () {} };
      spyOn(document, 'addEventListener');
     
      let appState: AppState =  { 
       freeze:  null,
       appRootName:  null, 
       opts:  null, 
       canComplete:  false, 
       completeCalled: false, 
       started: false, 
       document: document
      };
      
      app.on(appState, eventName, handler);
      expect(document.addEventListener).toHaveBeenCalledWith(eventName, jasmine.any(Function));
    });  
  });
  
  describe('dispatchGlobalEvent()', function () {
    it('should call document dispatchEvent', function () {
      let eventName = 'boo';
      let window = { Event:  function () {} };
      let document = { dispatchEvent:  function () {} };
      spyOn(document, 'dispatchEvent');
      
      let appState: AppState =  { 
       freeze: null,
       appRootName: null, 
       opts: null, 
       canComplete: false, 
       completeCalled: false, 
       started: false, 
       window: window,
       document: document
      };
      
      app.dispatchGlobalEvent(appState, eventName);
      expect(document.dispatchEvent).toHaveBeenCalled();
    });  
  });
  
  describe('dispatchNodeEvent()', function () {
    it('should call node dispatchEvent', function () {
      let node = { dispatchEvent:  function () {} };
      let eventName = 'boo';
      let window = { Event:  function () {} };
      spyOn(node, 'dispatchEvent');
      
      let appState: AppState =  { 
       freeze: null,
       appRootName: null, 
       opts: null, 
       canComplete: false, 
       completeCalled: false, 
       started: false, 
       window: window
      };
      
      app.dispatchNodeEvent(appState, node, eventName);
      expect(node.dispatchEvent).toHaveBeenCalled();
    });  
  });
  
  describe('addNodeToBody()', function () {
    it('should create node, add styles and append to body', function () {
      let type = 'div';
      let className = 'foo';
      let styles = { display:  'none', width:  '300px' };
      
      let newElem = { className:  '', style:  { display:  'block', height:  '200px' } };
      let document = {
        createElement:  function () {
          return newElem;
        }
      };
      let body = { appendChild:  function () {} };
      
      spyOn(body, 'appendChild');
      spyOn(document, 'createElement').and.callThrough();
      
     let appState: AppState =  { 
       freeze: null,
       appRootName: null, 
       opts: null, 
       canComplete: false, 
       completeCalled: false, 
       started: false, 
       document: document, 
       body: body
      };
     
      
      app.addNodeToBody(appState, type, className, styles);
      
      expect(document.createElement).toHaveBeenCalledWith(type);
      expect(newElem.className).toEqual(className);
      expect(newElem.style).toEqual({ display:  'none', width:  '300px', height:  '200px' });
      expect(body.appendChild).toHaveBeenCalledWith(newElem);
    });  
  });
  
  describe('removeNode()', function () {
    it('should not do anything if nothing passed in', function () {
      app.removeNode(null);  
    });
    
    it('should call remove on node if it exists', function () {
      let node = { remove:  function () {} };
      spyOn(node, 'remove');
      app.removeNode(node);
      expect(node.remove).toHaveBeenCalled();  
    });
    
    it('should set display none when remove not there', function () {
      let node = { style:  { display:  '' }};
      app.removeNode(node);
      expect(node.style.display).toEqual('none');
    });
  });
  
  describe('getSelection', function() {
    it('should return zero if nothing passed in', function() {
      expect(app.getSelection(null)).toEqual({
        start:  0,
        end:  0,
        direction:  'forward'
      });
    });
    
    it('should return the length of the node text if nothing else', function() {
      let node = { focus:  function() { }, value:  'booyeah' };
      let expected = { start:  7, end:  7, direction:  'forward' };
      let actual = app.getSelection(node);
      expect(actual).toEqual(expected);
    });
    
    it('should return if node.selectionStart exists', function() {
      let node = { 
        value:  'boo', 
        selectionStart:  1,
        selectionEnd:  3,
        selectionDirection:  'backward'
      };
      
      let expected = { start:  1, end:  3, direction:  'backward' };
      let actual = app.getSelection(node);
      expect(actual).toEqual(expected);
    });
  });
  
  describe('setSelection()', function() {
    it('should do nothing if no node passed in', function() {
      app.setSelection(null, null);
    });
    
    it('should use setSelectionRange on node if available', function() {
      let node = { 
        focus:  function() { }, 
        setSelectionRange:  function() {}
      };
      let selection = {
        start:  4,
        end:  7,
        direction:  'forward'
      };
      
      spyOn(node, 'focus');
      spyOn(node, 'setSelectionRange');
      
      app.setSelection(node, selection);
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
   
    let node = { nodeName:  'DIV' };
    let document = {
      childNodes:  [{}, {}, {
        childNodes:  [{}, {
          childNodes:  [{}, {}, {}, node]
        }]
      }]
    };
    let rootNode = document.childNodes[2];
    let expectedNodeKey = 'DIV_app_s2_s4';
      let appState = {
          appRoot:  null,
          opts: {},
          freeze: null,
          appRootName: "app",
          canComplete:  false,      
          completeCalled:  false,   
          started: false, 
      };
    
    addParent(document);
    
    describe('getNodeKey()', function () {
      it('should generate a key based of the node structure', function () {
        let actual = app.getNodeKey(appState, node, rootNode);
        expect(actual).toEqual(expectedNodeKey);
      });
    });
    
    describe('findClientNode()', function () {
      it('should return null if no serverNode passed in', function () {
        expect(app.findClientNode(null, null)).toBeNull();
      });
      
      it('should get a node from cache', function () {
        let clientNode = { name:  'zoo' };
        app.nodeCache[expectedNodeKey] = [{
          serverNode:  node,
          clientNode:  clientNode
        }];
         let appState: AppState =  { 
           freeze: null,
           appRootName: "app", 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false,
           serverRoot: rootNode
         };
   
        let actual = app.findClientNode(appState, node);
        expect(actual).toBe(clientNode);
      });
      
      // todo:  other test cases for when not using cache
    });
  });
});
