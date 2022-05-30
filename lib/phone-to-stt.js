// external dependencies
const nodeWs = require('ws');
const Transform = require('stream').Transform;
const { IamAuthenticator } = require('ibm-watson/auth');
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');
// internal dependencies
const sttStore = require('./stt-store');
const uiUpdater = require('./ui-updater');
const config = require('./config/stt');
// logging
const log = require('loglevel');



/**
 * Speech to text client instance for transcribing utterances from
 *  the person who started the phone call.
 */
let callerStt;
/**
 * Speech to text client instance for transcribing utterances from
 *  the person who received the phone call.
 */
let receiverStt;

/**
 * Timestamp for the start of the current call. (ms since epoch)
 * @type {number} - ms since epoch
 */
let currentCallStartTime;




/**
 * Prepares the Speech to Text client.
 */
function init() {
    // log current STT config to help with debugging
    log.debug('Speech to Text setup:', config.get());

    // prepare STT instances - one for each audio stream
    callerStt = createSpeechToTextClient();
    receiverStt = createSpeechToTextClient();
}



/**
 * Creates the instance of the Watson Speech to Text
 *  client library that will be used.
 */
function createSpeechToTextClient() {
    return new SpeechToTextV1({
        // this isn't used until the first time we start
        //  streaming audio to it so you don't know if
        //  the credentials are valid until the first
        //  call goes through
        authenticator: new IamAuthenticator({
            apikey: process.env.STT_API_KEY,
        }),
        serviceUrl: process.env.STT_INSTANCE_URL
    });
}



/**
 * Process a stream from a new call, which comes over a websocket connection.
 *
 *  Two separate connections will be made for each call, one for each
 *  direction.
 *
 *  They can be identified by the path that the connection went to - /inbound
 *  or /outbound.
 *
 * @param {nodeWs.WebSocket} ws - reference to a websocket that the call audio
 *                                  will be received through
 * @param {Express.Request} req - expressjs request reference for the incoming
 *                                  connection
 */
function handleIncomingWSConnection(ws, req) {
    log.debug('received new ws connection from twilio', req.originalUrl);
    const who = req.originalUrl.includes('caller') ? 'caller' : 'receiver';

    // inbound track always connects first, because they are the
    //  one who initiates the phone call
    if (who === 'caller') {
        newCall();
    }

    // Wrap the websocket in a Node stream
    const mediaStreamClient = nodeWs.createWebSocketStream(ws, { encoding : 'utf-8' });

    // expected websocket data from Twilio is a string containing JSON data like this:
    //  {
    //      "event": <type of event - e.g. "media" for audio data, "connected" for new calls, >,
    //
    //      "media": {
    //           "payload": <base64-encoded audio data>,
    //           "track": <inbound/outbound>
    //      }
    //  }
    //
    //   cf. https://www.twilio.com/docs/voice/twiml/stream#message-media
    const mediaDecoderStreamClient = new Transform({
        transform: (chunk, encoding, callback) => {
            const msg = JSON.parse(chunk.toString('utf8'));

            // skip any events that aren't media as we don't
            //  want to pass them to the speech-to-text service
            // calling callback() with no payload means we send
            //  nothing down the pipe
            if (msg.event !== 'media') return callback();

            // if we're here, we want to send the audio data to STT
            const audio = Buffer.from(msg.media.payload, 'base64');
            return callback(null, audio);
        }
    });


    const recognizeStreamClient = (who === 'caller') ?
        callerStt.recognizeUsingWebSocket(config.get().STT_CONFIG) :
        receiverStt.recognizeUsingWebSocket(config.get().STT_CONFIG);

    // start from the twilio audio stream
    mediaStreamClient
        // extract the audio data, skipping any non-media events
        .pipe(mediaDecoderStreamClient)
        // send what is left to the speech-to-text service
        .pipe(recognizeStreamClient);

    recognizeStreamClient.on('error', (msg) => { handleSttError(msg, who); });
    recognizeStreamClient.on('close', (msg) => { handleSttClose(msg, who); });
    recognizeStreamClient.on('data',  (msg) => { handleSttData(msg,  who); });
}


/**
 * Called at the start of a new phone call.
 */
function newCall() {
    currentCallStartTime = Date.now();
    uiUpdater.newCall(currentCallStartTime);
}


/**
 * Transcription has been received from the Speech to Text service.
 *
 * @param {SpeechRecognitionResults} msg - Watson Speech to Text results
 * @param {string} who - 'caller' if this is transcription data from
 *                          the person who made the phone call,
 *                       'receiver' if this is transcription data from
 *                          the person who received the phone call
 *
 * see https://cloud.ibm.com/apidocs/speech-to-text?code=node#recognize-audio-websockets
 */
function handleSttData(msg, who) {
    if (containsTranscript(msg)) {
        const transcription = {
            who,
            timestamp: Date.now(),
            transcript: msg.results[0].alternatives[0].transcript,
        };

        if (msg.results[0].final) {
            sttStore.addFinalTranscription(currentCallStartTime, transcription);
            uiUpdater.newFinalTranscription(currentCallStartTime, transcription);
        }
        else {
            sttStore.updateLiveTranscription(currentCallStartTime, transcription);
            uiUpdater.newInterimTranscription(currentCallStartTime, transcription);
        }
    }
}

/**
 * Checks if an update from the Speech to Text service includes a transcript.
 *  Sometimes the service will send interim payloads that don't contain
 *  any results or interim results without transcriptions.
 *
 * @param {SpeechRecognitionResults} msg - Watson Speech to Text results
 * @returns {boolean} - true if the API response includes a transcription
 */
function containsTranscript(msg) {
    return msg &&
           msg.results &&
           msg.results.length > 0 &&
           msg.results[0].alternatives &&
           msg.results[0].alternatives.length > 0;

}


/**
 * Called when the Watson Speech to Text service throws an error
 *
 * @param {object} msg - error payload from the Watson Speech to Text service
 * @param {string} who - 'caller' if this is an error in transcribing speech
 *                          from the person who made the phone call,
 *                       'receiver' if this is an error in transcribing speech
 *                          from the person who received the phone call
 */
function handleSttError(msg, who) {
    log.error('stt error', { who, msg });
}

/**
 * Called when the connection to the STT service is closed.
 *
 * @param {JSON} msg - log message from STT
 * @param {string} who - 'caller' if the connection was closed to the
 *                          person who made the phone call,
 *                       'receiver' if the connection was closed to
 *                          the person who received the phone call
 */
function handleSttClose(msg, who) {
    log.debug('stt close', { msg, who });
    uiUpdater.endCall(currentCallStartTime);
}




/**
 * Mocks a callback from the Watson Speech to Text service. Used for
 *  unit tests only.
 *
 * @param {SpeechRecognitionResults} msg - Watson Speech to Text results
 * @param {string} who - 'caller' if this is transcription data from
 *                          the person who made the phone call,
 *                       'receiver' if this is transcription data from
 *                          the person who received the phone call
 */
function _testInjectMockSttData(msg, who) {
    handleSttData(msg, who);
}

/**
 * Mocks the start of a new call. Used for unit tests only.
 *
 * @returns {number} timestamp - timestamp for new call
 */
function _testNewCall() {
    newCall();
    return currentCallStartTime;
}

module.exports = {
    init,
    handleIncomingWSConnection,


    _testInjectMockSttData,
    _testNewCall
};
