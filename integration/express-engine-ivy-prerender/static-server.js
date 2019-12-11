const express = require('express');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, 'dist/express-engine-ivy-prerender/browser/')));
app.listen(3000);
