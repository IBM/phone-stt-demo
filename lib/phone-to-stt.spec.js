const api = require('./api');
const sttStore = require('./stt-store');
const phoneToStt = require('./phone-to-stt');
const httprequest = require('supertest');
const wsrequest = require('superwstest');
const express = require('express');
const expect = require('chai').expect;
const mockSttResponses = require('./testdata/stt.caller.json');


describe('handle speech to text results', () => {

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


    it('should retrieve notifications about STT events', () => {
        let callTimestamp;
        return wsrequest(testServer)
            .ws('/ws/updates')
            .exec(() => {
                callTimestamp = phoneToStt._testNewCall();
                for (const sttResponse of mockSttResponses) {
                    phoneToStt._testInjectMockSttData(sttResponse, 'caller');
                }
            })
            .expectJson((actual) => {
                expect(actual).to.deep.equal({
                    event: 'new-call',
                    timestamp: callTimestamp
                });
            })
            .expectJson((actual) => {
                expect(actual).to.deep.equal({
                    event: 'interim-transcription',
                    callTimestamp: callTimestamp,
                    transcription: {
                        who: 'caller',
                        transcript: 'you ',
                        timestamp: actual.transcription.timestamp
                    }
                });
            })
            .expectJson((actual) => {
                expect(actual).to.deep.equal({
                    event: 'interim-transcription',
                    callTimestamp: callTimestamp,
                    transcription: {
                        who: 'caller',
                        transcript: 'you are ',
                        timestamp: actual.transcription.timestamp
                    }
                });
            })
            .expectJson((actual) => {
                expect(actual).to.deep.equal({
                    event: 'interim-transcription',
                    callTimestamp: callTimestamp,
                    transcription: {
                        who: 'caller',
                        transcript: 'you are such a lazy ',
                        timestamp: actual.transcription.timestamp
                    }
                });
            })
            .expectJson((actual) => {
                expect(actual).to.deep.equal({
                    event: 'final-transcription',
                    callTimestamp: callTimestamp,
                    transcription: {
                        who: 'caller',
                        transcript: 'you are such an amazing person.',
                        timestamp: actual.transcription.timestamp
                    }
                });
            })
            .close()
            .expectClosed();
    });



    it('should retrieve a call initiated by STT events', () => {
        const callTimestamp = phoneToStt._testNewCall();
        for (const sttResponse of mockSttResponses) {
            phoneToStt._testInjectMockSttData(sttResponse, 'caller');
        }

        return httprequest(testServer)
            .get('/api/calls')
            .expect(200)
            .then((resp) => {
                expect(resp.body).to.deep.equal({ calls : [ { timestamp: callTimestamp } ]});
            });
    });



    it('should retrieve stored STT events for complete utterances', () => {
        const callTimestamp = phoneToStt._testNewCall();
        for (const sttResponse of mockSttResponses) {
            phoneToStt._testInjectMockSttData(sttResponse, 'caller');
        }

        return httprequest(testServer)
            .get('/api/calls/' + callTimestamp + '/transcript')
            .expect(200)
            .then((resp) => {
                const timestamp = resp.body.live.caller.timestamp;
                expect(resp.body).to.deep.equal({
                    history : [
                        { timestamp, who: 'caller', transcript: 'you are such an amazing person.' }
                    ],
                    live : {
                        caller:   { timestamp, who: 'caller',   transcript: '' },
                        receiver: { timestamp, who: 'receiver', transcript: '' }
                    }
                });
            });
    });



    it('should retrieve stored STT events for incomplete utterances', () => {
        const callTimestamp = phoneToStt._testNewCall();
        for (let i = 0; i < mockSttResponses.length - 1; i++) {
            phoneToStt._testInjectMockSttData(mockSttResponses[i], 'caller');
        }

        return httprequest(testServer)
            .get('/api/calls/' + callTimestamp + '/transcript')
            .expect(200)
            .then((resp) => {
                const timestamp = resp.body.live.caller.timestamp;
                expect(resp.body).to.deep.equal({
                    history : [],
                    live : {
                        caller:   { timestamp, who: 'caller',   transcript: 'you are such a lazy ' },
                        receiver: { timestamp: resp.body.live.receiver.timestamp, who: 'receiver', transcript: '' }
                    }
                });
            });
    });

});
