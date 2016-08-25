import './polyfills.node';

import {main} from './main.node';


main()
  .then(({serializeDocument}) => {
    console.log('\nPRERENDER HTML\n\n' + serializeDocument() + '\n');
  });

