// configuration for Watson Speech to Text
//
//  see https://cloud.ibm.com/apidocs/speech-to-text?code=node#recognize-audio-websockets
//   for more details about the options

const STT_CONFIG = {
    // content type defined by Twilio
    //  cf. https://www.twilio.com/docs/voice/twiml/stream#custom-parameters
    contentType: 'audio/mulaw;rate=8000',

    // model choices supported by Watson
    //  cf. https://cloud.ibm.com/apidocs/speech-to-text?code=node#recognize-audio-websockets
    model: 'en-GB_Telephony',

    // return JSON objects instead of strings
    readableObjectMode: true,

    // don't wait until the end of the call before sending a transcription
    interimResults: true,

    // lowLatency:true directs the service to produce results even
    //  more quickly than it usually does, though the results might
    //  be less accurate
    lowLatency: true,

    // allow for pauses during demos without STT closing the stream
    inactivityTimeout: 120
};


module.exports = {
    get: () => {
        return {
            STT_CONFIG
        };
    }
};
