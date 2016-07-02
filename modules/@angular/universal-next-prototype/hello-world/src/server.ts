import './polyfills.node';

import {main} from './main.node';


main()
  .then(html => {
    console.log('\nPRERENDER HTML\n\n' + html + '\n');
  });

