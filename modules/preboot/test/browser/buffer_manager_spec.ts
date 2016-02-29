import {state, prep, switchBuffer} from '../../src/browser/buffer_manager';

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
      let preboot = {
        dom: {
          state: { appRoot: serverRoot },
          updateRoots: function () {}
        }
      };
      
      spyOn(serverRoot, 'cloneNode').and.callThrough();
      spyOn(serverRoot.parentNode, 'insertBefore');
      spyOn(preboot.dom, 'updateRoots');
      
      prep(preboot);
      
      expect(clientRoot.style.display).toEqual('none');
      expect(serverRoot.cloneNode).toHaveBeenCalled();
      expect(serverRoot.parentNode.insertBefore).toHaveBeenCalledWith(clientRoot, serverRoot);
      expect(preboot.dom.updateRoots).toHaveBeenCalledWith(serverRoot, serverRoot, clientRoot);
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
      let preboot = {
        dom: {
          state: { clientRoot: clientRoot, serverRoot: serverRoot },
          removeNode: function () {},
          updateRoots: function () {}
        }
      };
      
      spyOn(preboot.dom, 'removeNode');
      spyOn(preboot.dom, 'updateRoots');
      state.switched = false;
      
      switchBuffer(preboot);
      
      expect(clientRoot.style.display).toEqual('block');
      expect(preboot.dom.removeNode).toHaveBeenCalledWith(serverRoot);
      expect(preboot.dom.updateRoots).toHaveBeenCalledWith(clientRoot, null, clientRoot);
    });

    it('should not switch because already switched', function () {
      let clientRoot = {
        style: { display: 'none' }
      };
      let serverRoot = {
        nodeName: 'div'
      };
      let preboot = {
        dom: {
          state: { clientRoot: clientRoot, serverRoot: serverRoot },
          removeNode: function () {},
          updateRoots: function () {}
        }
      };
      
      spyOn(preboot.dom, 'removeNode');
      spyOn(preboot.dom, 'updateRoots');
      state.switched = true;
      
      switchBuffer(preboot);
      
      expect(clientRoot.style.display).toEqual('none');
      expect(preboot.dom.removeNode).not.toHaveBeenCalled();
      expect(preboot.dom.updateRoots).not.toHaveBeenCalled();
    });
    
    it('should not remove server root because it is the body', function () {
      let clientRoot = {
        style: { display: 'none' }
      };
      let serverRoot = {
        nodeName: 'BODY'
      };
      let preboot = {
        dom: {
          state: { clientRoot: clientRoot, serverRoot: serverRoot },
          removeNode: function () {},
          updateRoots: function () {}
        }
      };
      
      spyOn(preboot.dom, 'removeNode');
      spyOn(preboot.dom, 'updateRoots');
      state.switched = false;
      
      switchBuffer(preboot);
      
      expect(clientRoot.style.display).toEqual('block');
      expect(preboot.dom.removeNode).not.toHaveBeenCalled();
      expect(preboot.dom.updateRoots).toHaveBeenCalledWith(clientRoot, null, clientRoot);
    });
    
    it('should not remove server root because it is the body', function () {
      let clientRoot = {
        style: { display: 'none' },
        nodeName: 'DIV'
      };
      let preboot = {
        dom: {
          state: { clientRoot: clientRoot, serverRoot: clientRoot },
          removeNode: function () {},
          updateRoots: function () {}
        }
      };
      
      spyOn(preboot.dom, 'removeNode');
      spyOn(preboot.dom, 'updateRoots');
      state.switched = false;
      
      switchBuffer(preboot);
      
      expect(clientRoot.style.display).toEqual('block');
      expect(preboot.dom.removeNode).not.toHaveBeenCalled();
      expect(preboot.dom.updateRoots).toHaveBeenCalledWith(clientRoot, null, clientRoot);
    });
  });
});
