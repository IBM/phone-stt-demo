const REQUIRED_ENVIRONMENT_VARIABLES = {
    STT_API_KEY : 'API key for an instance of Watson Speech to Text. It should be a 44-character string.',
    STT_INSTANCE_URL : 'URL for a specific instance of Watson Speech to Text. ' +
                        'It should look something like https://api.eu-gb.speech-to-text.watson.cloud.ibm.com/instances/00000000-0000-0000-0000-000000000000',

    NLU_API_KEY : 'API key for an instance of Watson Natural Language Understanding. It should be a 44-character string.',
    NLU_INSTANCE_URL : 'URL for a specific instance of Watson Natural Language Understanding. ' +
                        'It should look something like https://api.eu-gb.natural-language-understanding.watson.cloud.ibm.com/instances/00000000-0000-0000-0000-000000000000',
};


/**
 * Checks that all required environment variables are set, and throws
 *  an exception if any are missing.
 */
function check() {
    for (const requiredVar of Object.keys(REQUIRED_ENVIRONMENT_VARIABLES)) {
        if (!process.env[requiredVar]) {
            throw new Error('Missing required environment variable ' + requiredVar + ' ' + REQUIRED_ENVIRONMENT_VARIABLES[requiredVar]);
        }
    }
}



module.exports = {
    check
};
