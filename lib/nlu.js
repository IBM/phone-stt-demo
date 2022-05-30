// external dependencies
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1');
const { IamAuthenticator } = require('ibm-watson/auth');
// internal dependencies
const sttStore = require('./stt-store');
const config = require('./config/nlu');
// logging
const log = require('loglevel');


/**
 * Client for submitting API calls to Watson Natural Language Understanding
 */
let nlu;


/**
 * Cache of API responses from Natural Language Understanding, to allow us
 *  to reuse previous responses and avoid making too many requests.
 *
 * It is an object, indexed by the time the call was started (represented
 *  by the milliseconds-since-epoch timestamp).
 * (These keys will be coerced to strings when stored, but for the purposes
 *  of this module, we treat them as numbers)
 *
 * @type {Object.<number, import('./types').Types.ConversationEmotion>}
 */
const nluCache = {};



/**
 * Prepares the Natural Language Understanding client.
 */
function init() {
    // log current NLU config to help with debugging
    log.debug('Natural Language Understanding setup:', config.get());

    nlu = new NaturalLanguageUnderstandingV1({
        authenticator: new IamAuthenticator({
            apikey: process.env.NLU_API_KEY
        }),
        version: '2021-08-01',
        serviceUrl: process.env.NLU_INSTANCE_URL
    });
}



/**
 * Return an analysis of the transcripts for a particular caller from
 *  a particular call.
 *
 * The analysis will be returned from an in-memory cache if a recent
 *  analysis is available, which means the analysis might be for
 *  an older, less-complete version of the transcript.
 *
 * @param {number} callTimestamp - timestamp for the call to analyze the
 *                                  transcriptions for
 * @param {string} who - 'caller' to analyze the transcriptions for
 *                          the person who made the phone call,
 *                       'receiver' to analyze the transcriptions for
 *                          the person who received the phone call
 *
 * @returns {Promise<import('./types').Types.EmotionData>} emotion analysis
 */
function analyze(callTimestamp, who) {
    // get the last analysis retrieved from NLU
    const cached = getConversationEmotionFromCache(callTimestamp);
    const cachedAnalysis = cached[who];

    // check it is old enough that it's worth fetching a new analysis
    if (shouldGetNewAnalysis(cachedAnalysis)) {

        // get the record of everything the person has said
        const callRecord = sttStore.getTranscript(callTimestamp);

        // combine the transcriptions into a single string for analysis
        const transcription = getTranscriptString(callRecord);

        // if they have said something, submit it to NLU for analysis
        if (transcription) {
            return submitToWatson(transcription)
                .then((emotion) => {
                    // add the response to the cache so it can be reused
                    emotion.timestamp = Date.now();
                    nluCache[callTimestamp][who] = emotion;

                    // return to the client
                    return emotion;
                });
        }
    }

    // otherwise, return the previously cached analysis
    return Promise.resolve(cachedAnalysis);
}


/**
 * Checks if the last NLU analysis performed was long enough ago that
 *  it is worth us requesting a new one.
 *
 * @param {import('./types').Types.EmotionData} lastAnalysis - the last
 *      analysis fetched from the NLU service
 * @returns {boolean} true if the last analysis was older than the
 *            max caching age, false otherwise
 */
function shouldGetNewAnalysis(lastAnalysis) {
    return Date.now() - config.get().CACHING.CACHE_TIME_MS > lastAnalysis.timestamp;
}


/**
 * Combines everything this person has said in the whole call into
 *  a single newline-separated string.
 *
 * Returns undefined if they haven't said anything yet
 *
 * @param {import('./types').Types.CallRecord} callRecord
 * @returns {string|null}
 */
function getTranscriptString(callRecord) {
    if (callRecord.history.length > 0) {
        return callRecord.history.map(t => { return t.transcript; }).join("\n");
    }
}



/**
 * Analyze the provided text.
 *
 * @param {String} text - text to analyse
 * @returns {Promise<object>}
 */
function submitToWatson(text) {
    return nlu.analyze({ ...config.get().NLU_CONFIG, text })
        .then((response) => {
            return response.result.emotion.document.emotion;
        });
}



/**
 * @param {number} timestamp
 * @returns {import('./types').Types.ConversationEmotion}
 */
function getConversationEmotionFromCache(timestamp) {
    if (!(timestamp in nluCache)) {
        nluCache[timestamp] = {
            caller:   { timestamp: 0, anger: 0, disgust: 0, fear: 0, joy: 0, sadness: 0 },
            receiver: { timestamp: 0, anger: 0, disgust: 0, fear: 0, joy: 0, sadness: 0 },
        };
    }
    return nluCache[timestamp];
}


module.exports = {
    init,
    analyze
};
