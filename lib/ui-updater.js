// logging
const log = require('loglevel');


/**
 * list of WebSocket clients from front-end UI pages that
 *  have requested to be notified of updates
 */
const browserConnections = [];


/**
 * Registers a new connection from a front-end UI, which should be a
 *  webpage asking to be notified about phone call updates.
 *
 * @param {nodeWs.WebSocket} ws - reference to a websocket to the UI
 * @param {Express.Request} req - expressjs request reference
 */
function handleIncomingWSConnection(ws, req) {
    log.debug('received new ws connection from UI', req.originalUrl);
    browserConnections.push(ws);

    // if the web browser closes the connection, we should
    //  stop trying to send notifications to it
    ws.on('close', () => {
        log.debug('closing connection to UI');
        const idx = browserConnections.indexOf(ws);
        if (idx > -1) {
            browserConnections.splice(idx, 1);
        }
    });
}



/**
 * Notify registered web-browsers about a new call.
 *
 * @param {number} callTimestamp - timestamp for the start of a new call
 */
function newCall(callTimestamp) {
    sendNotification({
        event: 'new-call',
        timestamp : callTimestamp
    });
}



/**
 * Notify registered web-browsers that a call has ended.
 *
 * @param {number} callTimestamp - timestamp for the ended call
 */
 function endCall(callTimestamp) {
    sendNotification({
        event: 'end-call',
        timestamp : callTimestamp
    });
}



/**
 * Notify registered web-browsers about a new transcription.
 *
 * This should be used for final transcriptions, where the transcription
 *  will not be changed again because the STT service has moved on to the
 *  next utterance.
 *
 * @param {number} callTimestamp - timestamp for the call that this
 *                                  transcription is from
 * @param {import('./types').Types.Transcription} transcription
 */
function newFinalTranscription(callTimestamp, transcription) {
    sendNotification({
        event: 'final-transcription',
        callTimestamp,
        transcription
    });
}

/**
 * Notify registered web-browsers about a new transcription.
 *
 * This should be used for interim transcriptions, where the transcription
 *  may be changed because the STT service is still actively transcribing
 *  this utterance.
 *
 * @param {number} callTimestamp - timestamp for the call that this
 *                                  transcription is from
 * @param {import('./types').Types.Transcription} transcription
 */
 function newInterimTranscription(callTimestamp, transcription) {
    sendNotification({
        event: 'interim-transcription',
        callTimestamp,
        transcription
    });
}



/**
 * Send a notification to all web browsers that have registered to
 *  receive updates.
 *
 * @param {object} notification
 */
function sendNotification(notification) {
    browserConnections.forEach((ws) => {
        try {
            ws.send(JSON.stringify(notification));
        }
        catch (err) {
            log.error('failed to send notification to UI', err);
        }
    });
}



module.exports = {
    handleIncomingWSConnection,

    newCall,
    endCall,

    newFinalTranscription,
    newInterimTranscription
};
