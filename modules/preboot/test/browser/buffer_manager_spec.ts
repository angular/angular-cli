import {state, prep, switchBuffer} from '../../src/browser/buffer_manager';
import { App } from '../../src/interfaces/app';

describe('buffer_manager', function () {
  describe('prep()', function () {
    it('should update the DOM roots with a new client root', function () {
      let clientRoot = {
        style: { display: 'blah' }  
      };
      let serverRoot = {
        cloneNode: function () { return clientRoot; },
        parentNode: {
          insertBefore: function () {}
        }
      };
      let appState = {
          appRoot: serverRoot,
          opts: {},
          freeze: null,
          appRootName: "",
          canComplete: false,      
          completeCalled: false,   
          started: false, 
      };
      
      let app: App = {
          updateAppRoots: function () {}
      };
      
      spyOn(serverRoot, 'cloneNode').and.callThrough();
      spyOn(serverRoot.parentNode, 'insertBefore');
      spyOn(app, 'updateAppRoots');
      
      prep(app, appState);
      
      expect(clientRoot.style.display).toEqual('none');
      expect(serverRoot.cloneNode).toHaveBeenCalled();
      expect(serverRoot.parentNode.insertBefore).toHaveBeenCalledWith(clientRoot, serverRoot);
      expect(app.updateAppRoots).toHaveBeenCalledWith(appState, serverRoot, serverRoot, clientRoot);
    });  
  });
  
  describe('switchBuffer()', function () {
    it('should switch the client and server roots', function () {
      let clientRoot = {
        style: { display: 'none' }
      };
      let serverRoot = {
        nodeName: 'div'
      };
      
      let appState = {
          appRoot: null,
          clientRoot: clientRoot,
          serverRoot: serverRoot,
          opts: {},
          freeze: null,
          appRootName: "",
          canComplete: false,      
          completeCalled: false,   
          started: false, 
      };
      
      let app: App = {
         removeNode: function () {},
         updateAppRoots: function () {}
      };
      

      
      spyOn(app, 'removeNode');
      spyOn(app, 'updateAppRoots');
      state.switched = false;
      
      switchBuffer(app, appState);
      
      expect(clientRoot.style.display).toEqual('block');
      expect(app.removeNode).toHaveBeenCalledWith(serverRoot);
      expect(app.updateAppRoots).toHaveBeenCalledWith(appState, clientRoot, null, clientRoot);
    });

    it('should not switch because already switched', function () {
      let clientRoot = {
        style: { display: 'none' }
      };
      let serverRoot = {
        nodeName: 'div'
      };
      
        let appState = {
          appRoot: null,
          clientRoot: clientRoot,
          serverRoot: serverRoot,
          opts: {},
          freeze: null,
          appRootName: "app",
          canComplete: false,      
          completeCalled: false,   
          started: false, 
          switched: true
      };
      
      let app: App = {
         removeNode: function () {},
         updateAppRoots: function () {}
      };
      
     
      
      spyOn(app, 'removeNode');
      spyOn(app, 'updateAppRoots');
      
      
      switchBuffer(app, appState);
      
      expect(clientRoot.style.display).toEqual('none');
      expect(app.removeNode).not.toHaveBeenCalled();
      expect(app.updateAppRoots).not.toHaveBeenCalled();
    });
    
    it('should not remove server root because it is the body', function () {
      let clientRoot = {
        style: { display: 'none' }
      };
      let serverRoot = {
        nodeName: 'BODY'
      };
      
      let appState = {
          appRoot: null,
          clientRoot: clientRoot,
          serverRoot: serverRoot,
          opts: {},
          freeze: null,
          appRootName: "",
          canComplete: false,      
          completeCalled: false,   
          started: false, 
      };
      
      let app: App = {
         removeNode: function () {},
         updateAppRoots: function () {}
      };
   
      
      spyOn(app, 'removeNode');
      spyOn(app, 'updateAppRoots');
      state.switched = false;
      
      switchBuffer(app, appState);
      
      expect(clientRoot.style.display).toEqual('block');
      expect(app.removeNode).not.toHaveBeenCalled();
      expect(app.updateAppRoots).toHaveBeenCalledWith(appState, clientRoot, null, clientRoot);
    });
    
    it('should not remove server root because it is the body', function () {
      let clientRoot = {
        style: { display: 'none' },
        nodeName: 'DIV'
      };
      
      let appState = {
          appRoot: null,
          clientRoot: clientRoot,
          serverRoot: clientRoot,
          opts: {},
          freeze: null,
          appRootName: "",
          canComplete: false,      
          completeCalled: false,   
          started: false, 
      };
      
      let app: App = {
         removeNode: function () {},
         updateAppRoots: function () {}
         
      };
      
      
      
      spyOn(app, 'removeNode');
      spyOn(app, 'updateAppRoots');
      state.switched = false;
      
      switchBuffer(app, appState);
      
      expect(clientRoot.style.display).toEqual('block');
      expect(app.removeNode).not.toHaveBeenCalled();
      expect(app.updateAppRoots).toHaveBeenCalledWith(appState, clientRoot, null, clientRoot);
    });
  });
});
