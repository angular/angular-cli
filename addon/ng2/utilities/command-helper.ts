import * as config from '../models/config'

export function loadDefaults(command) {
    command.project.ngConfig = command.project.ngConfig || config.CliConfig.fromProject(); 

    let defaultSettings = command.project.ngConfig.defaults || {};

    let commandOptions = command.availableOptions.map(option => option.key);

    commandOptions.forEach(key => {                
        // only load defaults that are relevant to the command
        if (defaultSettings[key]) {
            command.settings[key] = defaultSettings[key];
        }
    });    
}
