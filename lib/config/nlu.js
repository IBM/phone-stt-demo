// configuration for Watson Natural Language Understanding
//
//  see https://cloud.ibm.com/apidocs/natural-language-understanding#analyze
//   for more details about the options

const NLU_CONFIG = {
    // text to analyze - this is a placeholder that will get
    //  replaced by calling functions
    text: '',

    // assume that we're only transcribing English conversations
    language: 'en',

    // which analyses we want to perform on the transcripts
    features: {

        // if you want tone analysis...
        //
        //  (this gives you assessments like polite / excited /
        //    sympatheic / satisfied / etc. with a score for each)
        // ---
        //
        // classifications: {
        //     model: 'tone-classifications-en-v1'
        // },

        // if you want sentiment analysis...
        //
        //  (this gives you a positive/neutral/negative
        //    assessment and a score)
        // ---
        //
        // sentiment: {},

        // if you want emotion analysis...
        //
        //  (this gives you assessments like sadness / joy /
        //    fear / anger / etc. with a score for each)
        // ---
        //
        emotion: {}
    }
};

/**
 * To avoid expensively calling the Natural Language Understanding
 *  service frequently with very similar text, we cache and reuse
 *  responses from the service for a certain interval.
 *
 * This variable controls how long we will reuse an NLU analysis
 *  for, before requesting a new one.
 */
const CACHE_TIME_SECONDS = 15;


const CACHE_TIME_MS = CACHE_TIME_SECONDS * 1000;


module.exports = {
    get: () => {
        return {
            CACHING: { CACHE_TIME_SECONDS, CACHE_TIME_MS },
            NLU_CONFIG
        };
    }
};
