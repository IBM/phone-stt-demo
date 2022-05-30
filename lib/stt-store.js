/**
 * Cache of all transcriptions for all calls received since the app
 *  was started.
 *
 * It is an object, indexed by the time the call was started (represented
 *  by the milliseconds-since-epoch timestamp).
 * (These keys will be coerced to strings when stored, but for the purposes
 *  of this module, we treat them as numbers)
 *
 * @type {Object.<number, import('./types').Types.CallRecord>}
 */
const calls = {};



/**
 * Returns a list of timestamps for all calls stored in this cache.
 *
 * @returns Array<number> - each number is a milliseconds-since-epoch
 *                           timestamp, representing the time a call
 *                           was first stored
 */
function getCallTimestamps() {
    return Object.keys(calls).map(ts => parseInt(ts, 10));
}



/**
 * Store a transcription.
 *
 * This should be used for final transcriptions, where the transcription
 *  will not be changed again because the STT service has moved on to the
 *  next utterance.
 *
 * @param {number} callTimestamp - timestamp for the call that this
 *                                  transcription is from
 * @param {import('./types').Types.Transcription} transcription
 */
function addFinalTranscription(callTimestamp, transcription) {
    if (!(callTimestamp in calls)) {
        prepareNewCallRecord(callTimestamp);
    }
    calls[callTimestamp].history.push(transcription);
    calls[callTimestamp].live[transcription.who] = { ...transcription, transcript: '' };
}



/**
 * Store a transcription.
 *
 * This should be used for interim transcriptions, where the transcription
 *  may be changed because the STT service is still actively transcribing
 *  this utterance.
 *
 * @param {number} callTimestamp - timestamp for the call that this
 *                                  transcription is from
 * @param {import('./types').Types.Transcription} transcription
 */
function updateLiveTranscription(callTimestamp, transcription) {
    if (!(callTimestamp in calls)) {
        prepareNewCallRecord(callTimestamp);
    }
    calls[callTimestamp].live[transcription.who] = transcription;
}



/**
 * Returns the full record for a single call.
 *
 * @param {number} callTimestamp - timestamp to retrieve a transcript for
 * @returns {import('./types').Types.CallRecord}
 */
function getTranscript(callTimestamp) {
    if (!(callTimestamp in calls)) {
        prepareNewCallRecord(callTimestamp);
    }
    return calls[callTimestamp];
}



/**
 * Prepares an object to store a new call record.
 *
 * @param {number} timestamp - milliseconds since epoch representing
 *                              the start of the call
 */
function prepareNewCallRecord(timestamp) {
    calls[timestamp] = {
        history: [],
        live: {
            caller: {
                timestamp,
                who: 'caller',
                transcript: ''
            },
            receiver: {
                timestamp,
                who: 'receiver',
                transcript: ''
            }
        }
    };
}



/**
 * Test function - resets the calls cache.
 */
function _reset() {
    for (const key in calls) {
        delete calls[key];
    }
}



module.exports = {
    _reset,

    getCallTimestamps,

    addFinalTranscription,
    updateLiveTranscription,

    getTranscript
};
