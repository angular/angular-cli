import { PrebootOptions } from '../interfaces/preboot_options';
import { Element } from '../interfaces/element';
import { GlobalState, AppState } from '../interfaces/app';

// in each client-side module, we store state in an object so we can mock
// it out during testing and easily reset it as necessary

let state: GlobalState = {
   // canComplete: true,      // set to false if preboot paused through an event
  //  completeCalled: false,  // set to true once the completion event has been raised
    apps: <[AppState]>[]
};

export var PrebootState = state;

