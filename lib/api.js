// external dependencies
const express = require('express');
const expressWebSocket = require('express-ws');
// internal dependencies
const sttStore = require('./stt-store');
const phoneToStt = require('./phone-to-stt');
const uiUpdater = require('./ui-updater');
const twilio = require('./twilio');
const nlu = require('./nlu');
const nluConfig = require('./config/nlu');


/**
 * Handles request to get a list of calls that the app has processed.
 *
 *  It will return a JSON response like:
 *
 *    {
 *        "calls": [
 *              { "timestamp": 1653170890054 },
 *              { "timestamp": 1653197110177 }
 *        ]
 *    }
 *
 * @param {Express.Request}  req - expressjs request object
 * @param {Express.Response} res - expressjs response object
 */
function getCalls(req, res) {
    res.json({
        calls: sttStore.getCallTimestamps().map(timestamp => { return { timestamp }; })
    });
}



/**
 * Handles request to get a transcript for a single call.
 *
 *  It will return a Types.CallRecord response
 *
 * @param {Express.Request}  req - expressjs request object
 * @param {Express.Response} res - expressjs response object
 */
function getCallTranscript(req, res) {
    res.json(sttStore.getTranscript(req.params.timestamp));
}



/**
 * Handles request to get an analysis for one speaker in a call.
 *
 *  It will return a JSON response like:
 *
 *   {
 *       "emotion": {
 *           "anger": 0.089678,
 *           "disgust": 0.035038,
 *           "fear": 0.087239,
 *           "joy": 0.379172,
 *           "sadness": 0.176072
 *       }
 *   }
 *
 * @param {Express.Request}  req - expressjs request object
 * @param {Express.Response} res - expressjs response object
 */
function getCallSpeakerAnalysis(req, res) {
    nlu.analyze(req.params.timestamp, req.params.who)
        .then((emotion) => {
            // set cache header to prevent the browser asking
            //  to update this too frequently
            res.set({'Cache-Control' : 'max-age=' + nluConfig.get().CACHING.CACHE_TIME_SECONDS });
            // return the response
            res.json({ emotion });
        });
}



/**
 * Generates a TwiML Bin config XML that defines a routing instruction
 *  for the phone number identified in the query parameter "Digits".
 *
 * @param {Express.Request}  req - expressjs request object
 * @param {Express.Response} res - expressjs response object
 */
function createTwimlBin(req, res) {
    //
    // twilio provides the number that the caller typed into their
    //  phone as a query parameter called "Digits"
    //
    // cf. https://www.twilio.com/docs/voice/twiml/gather#action
    const receiverPhoneNumber = req.query.Digits;

    if (!receiverPhoneNumber) {
        return res.status(400).json({ error: 'Missing required query parameter "Digits"' });
    }
    const twimlbin = twilio.generateTwimlBin(receiverPhoneNumber);
    res.set('Content-Type', 'text/xml');
    res.send(twimlbin);
}



/**
 * Sets up the provided instance of ExpressJS.
 *
 * @param {Express.Application} app - expressjs instance to be configured
 */
function setup(app) {
    // ----------------------------------------------------
    //  WEBSOCKET apis
    // ----------------------------------------------------

    // extend express app so that we can use app.ws()
    expressWebSocket(app, null, {
        // performance improvements
        perMessageDeflate: false,
    });

    // handle incoming calls - two separate routes for connections, one
    //  for receiving the audio stream from the person who started the
    //  call, the other for the audio stream from the person who
    //  received the call
    app.ws('/ws/caller',   phoneToStt.handleIncomingWSConnection);
    app.ws('/ws/receiver', phoneToStt.handleIncomingWSConnection);

    // handle requests from a web-browser to be notified about updates
    app.ws('/ws/updates',  uiUpdater.handleIncomingWSConnection);


    // ----------------------------------------------------
    //  REST apis
    // ----------------------------------------------------

    // support for JSON payloads
    app.use(express.json());

    // API for retrieving calls, transcriptions, and analyses
    app.get('/api/calls',                          getCalls);
    app.get('/api/calls/:timestamp/transcript',    getCallTranscript);
    app.get('/api/calls/:timestamp/analysis/:who', getCallSpeakerAnalysis);


    // support for text payloads
    app.use(express.text());

    // API for generating an XML-config for a TwiML Bin
    app.get('/api/twimlbin', createTwimlBin);


    // ----------------------------------------------------
    //  UI
    // ----------------------------------------------------

    app.use(express.static('ui'));
}




module.exports = {
    setup
};
