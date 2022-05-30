const express = require('express');
const log = require('loglevel');
const api = require('./lib/api');
const nlu = require('./lib/nlu');
const phoneToStt = require('./lib/phone-to-stt');
const env = require('./lib/env');



// -------------------------------------------------------
//  start up
// -------------------------------------------------------
log.setLevel(log.levels.DEBUG);

env.check();

const app = express();
const PORT = 8080;

phoneToStt.init();
nlu.init();
api.setup(app);

log.info('server will listen on', PORT);
let expressServer = app.listen(PORT);



// -------------------------------------------------------
//  shutdown
// -------------------------------------------------------
function shutdown() {
    log.info('shutting down');

    // don't accept any new client connections
    if (expressServer) {
        expressServer.close();
        expressServer = null;
    }
    // terminate the process
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
