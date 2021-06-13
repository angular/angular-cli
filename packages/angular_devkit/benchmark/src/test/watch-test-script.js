const { closeSync, openSync } = require('fs');

// touch file
closeSync(openSync(require.resolve('./watch-test-file.txt'), 'w'));
