const api = require('./api');
const sttStore = require('./stt-store');
const uiUpdater = require('./ui-updater');
const wsrequest = require('superwstest');
const express = require('express');


describe('ws api', () => {

    let testServer;

    before((done) => {
        // setup required environment variables
        process.env.STT_API_KEY = 'test';
        process.env.STT_INSTANCE_URL = 'test';
        process.env.NLU_API_KEY = 'test';
        process.env.NLU_INSTANCE_URL = 'test';

        // create an instance of the server
        const app = express();
        api.setup(app);
        testServer = app.listen(0, 'localhost', done);
    });

    beforeEach(() => {
        sttStore._reset();
    });

    after((done) => {
        testServer.close(done);
    });


    it('should receive notifications of new calls', () => {
        const CALL_TIMESTAMP = Date.now();

        return wsrequest(testServer)
            .ws('/ws/updates')
            .exec(() => {
                uiUpdater.newCall(CALL_TIMESTAMP);
            })
            .expectJson({
                event: 'new-call',
                timestamp: CALL_TIMESTAMP
            })
            .close()
            .expectClosed();
    });


    it('should receive notifications of final transcriptions', () => {
        const CALL_TIMESTAMP = Date.now();
        const CALLER = 'caller';
        const TRANSCRIPT_TIMESTAMP = 1648810800000;

        return wsrequest(testServer)
            .ws('/ws/updates')
            .exec(() => {
                uiUpdater.newFinalTranscription(CALL_TIMESTAMP, {
                    who: CALLER,
                    timestamp: TRANSCRIPT_TIMESTAMP,
                    transcript: 'hello'
                });
            })
            .expectJson({
                event: 'final-transcription',
                callTimestamp: CALL_TIMESTAMP,
                transcription: {
                    who: CALLER,
                    timestamp: TRANSCRIPT_TIMESTAMP,
                    transcript: 'hello'
                }
            })
            .close()
            .expectClosed();
    });


    it('should receive notifications of interim transcriptions', () => {
        const CALL_TIMESTAMP = Date.now();
        const CALLER = 'receiver';
        const TRANSCRIPT_TIMESTAMP = 1648810800000;

        return wsrequest(testServer)
            .ws('/ws/updates')
            .exec(() => {
                uiUpdater.newInterimTranscription(CALL_TIMESTAMP, {
                    who: CALLER,
                    timestamp: TRANSCRIPT_TIMESTAMP,
                    transcript: 'i'
                });
            })
            .expectJson({
                event: 'interim-transcription',
                callTimestamp: CALL_TIMESTAMP,
                transcription: {
                    who: CALLER,
                    timestamp: TRANSCRIPT_TIMESTAMP,
                    transcript: 'i'
                }
            })
            .close()
            .expectClosed();
    });
});
