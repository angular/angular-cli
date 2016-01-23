import {PrebootRef} from '../../interfaces/preboot_ref';
import {PrebootOptions} from '../../interfaces/preboot_options';

// overlay and spinner nodes stored in memory in between prep and cleanup
export let state = {
    overlay: null,
    spinner: null
};

/**
 * Clean up the freeze elements from the DOM
 */
export function cleanup(preboot: PrebootRef) {
  preboot.dom.removeNode(state.overlay);
  preboot.dom.removeNode(state.spinner);

  state.overlay = null;
  state.spinner = null;
}

/**
 * Prepare for freeze by adding elements to the DOM and adding an event handler
 */
export function prep(preboot: PrebootRef, opts: PrebootOptions) {
  let freezeOpts = opts.freeze || {};
  let freezeStyles = freezeOpts.styles || {};
  let overlayStyles = freezeStyles.overlay || {};
  let spinnerStyles = freezeStyles.spinner || {};

  // add the overlay and spinner to the end of the body
  state.overlay = preboot.dom.addNodeToBody('div', overlayStyles.className, overlayStyles.style);
  state.spinner = preboot.dom.addNodeToBody('div', spinnerStyles.className, spinnerStyles.style);

  // when a freeze event occurs, show the overlay and spinner
  preboot.dom.on(freezeOpts.eventName, function () {

    // if there is an active node, position spinner on top of it and blur the focus
    let activeNode = preboot.activeNode;
    if (activeNode) {
      state.spinner.style.top = activeNode.offsetTop;
      state.spinner.style.left = activeNode.offsetLeft;

      if (freezeOpts.doBlur) {
        activeNode.blur();
      }
    }

    // display the overlay and spinner
    state.overlay.style.display = 'block';
    state.spinner.style.display = 'block';

    // preboot should end in under 5 seconds, but if it doesn't unfreeze just in case  
    setTimeout(() => cleanup(preboot), freezeOpts.timeout);
  });
}
