const fs = require('fs');
const nlu = require('./nlu');
const api = require('./api');
const twilio = require('./twilio');
const sttStore = require('./stt-store');
const request = require('supertest');
const express = require('express');
const sinon = require('sinon');
const expect = require('chai').expect;
const naturalLanguageUnderstanding = require('ibm-watson/natural-language-understanding/v1');
const recordedNLUApiResponses = require('./testdata/nlu.json');



describe('rest api', () => {

    let testServer;
    let nluStub;

    before((done) => {
        // setup required environment variables
        process.env.STT_API_KEY = 'test';
        process.env.STT_INSTANCE_URL = 'test';
        process.env.NLU_API_KEY = 'test';
        process.env.NLU_INSTANCE_URL = 'test';

        // stub the IBM Watson client library with the
        //   JSON file of recorded API responses
        nluStub = sinon.stub(naturalLanguageUnderstanding.prototype, 'analyze')
            .callsFake((params) => {
                return Promise.resolve(recordedNLUApiResponses[params.text]);
            });
        nlu.init();

        // prepare the twiml bin generator
        twilio.init();

        // create an instance of the server
        const app = express();
        api.setup(app);
        testServer = app.listen(0, 'localhost', done);
    });

    beforeEach(() => {
        sttStore._reset();
    });

    after((done) => {
        nluStub.restore();
        testServer.close(done);
    });


    it('should get a list of calls', async () => {
        sttStore.addFinalTranscription(20, { transcript: 'hello', who: 'caller', timestamp: Date.now() });
        sttStore.addFinalTranscription(30, { transcript: 'world', who: 'caller', timestamp: Date.now() });
        sttStore.addFinalTranscription(40, { transcript: 'tests', who: 'caller', timestamp: Date.now() });

        const response = await request(testServer).get('/api/calls');
        expect(response.status).to.eql(200);
        expect(response.body).to.deep.equal({
            calls: [
                { timestamp: 20 },
                { timestamp: 30 },
                { timestamp: 40 }
            ]
        });
    });


    it('should get an empty list before any calls have happened', async () => {
        const response = await request(testServer).get('/api/calls');
        expect(response.status).to.eql(200);
        expect(response.body).to.deep.equal({ calls: [] });
    });


    it('should retrieve a call record', async () => {
        const CALL_TIMESTAMP = Date.now();

        sttStore.addFinalTranscription(CALL_TIMESTAMP, { transcript: 'introduction',     who: 'receiver', timestamp: 1643720305000 });
        sttStore.updateLiveTranscription(CALL_TIMESTAMP, { transcript: 'the cat',        who: 'caller',   timestamp: 1643720400000 });
        sttStore.updateLiveTranscription(CALL_TIMESTAMP, { transcript: 'the dog',        who: 'receiver', timestamp: 1643720405000 });
        sttStore.updateLiveTranscription(CALL_TIMESTAMP, { transcript: 'the cat sat',    who: 'caller',   timestamp: 1643720410000 });
        sttStore.updateLiveTranscription(CALL_TIMESTAMP, { transcript: 'the dog likes',  who: 'receiver', timestamp: 1643720415000 });
        sttStore.updateLiveTranscription(CALL_TIMESTAMP, { transcript: 'the cat sat on', who: 'caller', timestamp: 1643720420000 });
        sttStore.addFinalTranscription(CALL_TIMESTAMP, { transcript: 'the cat sat on the mat', who: 'caller', timestamp: 1643720430000 });

        const response = await request(testServer).get('/api/calls/' + CALL_TIMESTAMP + '/transcript');
        expect(response.status).to.eql(200);
        expect(response.body).to.deep.equal({
            history: [
                {
                    transcript: 'introduction',
                    who: 'receiver',
                    timestamp: 1643720305000
                },
                {
                    transcript: 'the cat sat on the mat',
                    who: 'caller',
                    timestamp: 1643720430000
                }
            ],
            live: {
                caller: { transcript: '', who: 'caller', timestamp: 1643720430000 },
                receiver: {
                    transcript: 'the dog likes',
                    who: 'receiver',
                    timestamp: 1643720415000
                }
            }
        });
    });


    it('should retrieve a call analysis', async () => {
        const CALL_TIMESTAMP = Date.now();
        const CALLER = 'receiver';
        const utterances = [
            'you are such an amazing person',
            'i love everything that you do',
            'i\'m so grateful for all of your work',
            'you rock'
        ];
        for (const transcript of utterances) {
            sttStore.addFinalTranscription(CALL_TIMESTAMP, {
                timestamp: Date.now(),
                who: CALLER,
                transcript
            });
        }

        const response = await request(testServer).get('/api/calls/' + CALL_TIMESTAMP + '/analysis/' + CALLER);
        expect(response.status).to.eql(200);
        expect(response.body.emotion).to.deep.include({
            anger: 0.018321,
            disgust: 0.017718,
            fear: 0.017076,
            joy: 0.951437,
            sadness: 0.039175
        });
    });


    it('should require a phone number to generate a TwiML Bin config', async () => {
        const response = await request(testServer).get('/api/twimlbin');
        expect(response.status).to.eql(400);
        expect(response.body).to.deep.equal({ error: 'Missing required query parameter "Digits"' });
    });

    it('should generate a TwiML Bin config', async () => {
        const response = await request(testServer)
            .get('/api/twimlbin')
            .query({ Digits: '441231112345' })
            .set('Accept', 'text/xml');
        expect(response.status).to.eql(200);
        expect(response.headers['content-type']).to.equal('text/xml; charset=utf-8');

        const expected = fs.readFileSync('./lib/testdata/twiml-local.xml', { encoding: 'utf-8' }).trim();
        expect(response.text).to.equal(expected);
    });
});
