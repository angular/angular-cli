
interface Styles {
  className?: string;
  style?: Object;
}

interface FreezeStyles {
    overlay?: Styles;
    spinner?: Styles;
}

// interface simply for type checking options values passed into preboot
export interface PrebootOptions {
    listen?: any;                 // can be string (name of strategy), object (custom) or array of either
    replay?: any;                 // same as listen
    freeze?: any;                 // same as listen
    appRoot?: string;             // a selector for the root of the application
    pauseEvent?: string;          // name of event that when dispatched on document will cause preboot to pause
    resumeEvent?: string;         // when this event dispatched on document, preboot will resume
    completeEvent?: string;       // instead of calling complete(), can just raise this event
    presets?: any;                // each string represents a preset value
    uglify?: boolean;             // if true, client code generated will be uglified
    buffer?: boolean;             // if true, attempt to buffer client rendering to hidden div
    debug?: boolean;              // if true, output console logs on the client with runtime info about preboot
}
