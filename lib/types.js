/**
 * Transcriptions received for a whole phone call.
 *
 * @typedef {object} Types.CallRecord
 * @property {Array<Types.Transcription>} history - array of transcriptions,
 *                                                  sorted by timestamp.
 *                                                  only final transcriptions
 *                                                  are added to this array
 * @property {Types.LiveTranscription} live - current interim transcriptions
 *                                            for each end of the phone call
 */


/**
 * A transcription for a single utterance from one of the
 *  phone callers.
 *
 * @typedef {object} Types.Transcription
 * @property {string} who - either "caller" or "receiver" depending on whether
 *                          this is a transcription of the person who made or
 *                          received the phone call
 * @property {number} timestamp - the time the transcription was received, in
 *                                milliseconds since epoch
 * @property {string} transcript - the transcription text
 */


/**
 * Current live, in-progress, transcriptions for what each caller is
 *  currently saying. These are subject to being revised.
 *
 * @typedef {object} Types.LiveTranscription
 * @property {Types.Transcription} caller - current interim transcription for
 *                                          the person who made the phone call
 * @property {Types.Transcription} receiver - current interim transcription
 *                                            for the person who received the
 *                                            phone call
 */



/**
 * Emotion analysis for a phone conversation.
 *
 * @typedef {object} Types.ConversationEmotion
 * @property {Types.EmotionData} caller - analysis for the person who
 *                                          made the phone call
 * @property {Types.EmotionData} receiver - analysis for the person who
 *                                           received the phone call
 */


/**
 * Emotion analysis for a text passage.
 *
 * @typedef {object} Types.EmotionData
 * @property {number} timestamp - time (milliseconds since epoch) that the
 *                                  analysis was generated
 * @property {number} anger - likelihood that the text passage conveys anger
 *                              (score between 0 and 1)
 * @property {number} disgust - likelihood that the text passage conveys disgust
 *                              (score between 0 and 1)
 * @property {number} fear - likelihood that the text passage conveys fear
 *                              (score between 0 and 1)
 * @property {number} joy - likelihood that the text passage conveys joy
 *                              (score between 0 and 1)
 * @property {number} sadness - likelihood that the text passage conveys sadness
 *                              (score between 0 and 1)
 */





const Types = true;
module.exports = {
    Types
}
