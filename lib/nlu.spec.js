const nlu = require('./nlu');
const sttStore = require('./stt-store');
const sinon = require('sinon');
const expect = require('chai').expect;
const naturalLanguageUnderstanding = require('ibm-watson/natural-language-understanding/v1');
const recordedNLUApiResponses = require('./testdata/nlu.json');


describe('natural language understanding', () => {

    let nluStub;

    before(() => {
        // setup required environment variables
        process.env.NLU_API_KEY = 'test';
        process.env.NLU_INSTANCE_URL = 'test';
        process.env.NLU_MODEL = 'test';

        // stub the IBM Watson client library with the
        //   JSON file of recorded API responses
        nluStub = sinon.stub(naturalLanguageUnderstanding.prototype, 'analyze')
            .callsFake((params) => {
                return Promise.resolve(recordedNLUApiResponses[params.text]);
            });

        nlu.init();
    });

    after(() => {
        nluStub.restore();
    });

    beforeEach(() => {
        sttStore._reset();
    });


    it('should retrieve an empty analysis for a call with no utterances', async () => {
        const CALL_TIMESTAMP = Date.now();
        const CALLER = 'receiver';

        const analysis = await nlu.analyze(CALL_TIMESTAMP, CALLER);
        expect(analysis).to.deep.include({
            anger: 0,
            disgust: 0,
            fear: 0,
            joy: 0,
            sadness: 0
        });
    });

    it('should retrieve an analysis of a single utterance', async () => {
        //
        // put a transcript in the cache
        const CALL_TIMESTAMP = Date.now();
        const TRANSCRIPT_TIMESTAMP = Date.now();
        const CALLER = 'receiver';
        sttStore.addFinalTranscription(CALL_TIMESTAMP, {
            timestamp: TRANSCRIPT_TIMESTAMP,
            who: CALLER,
            transcript: 'you are such an amazing person. i love everything that you do. i\'m so grateful for all of your work. you rock.'
        });

        //
        // get an analysis of it
        const analysis = await nlu.analyze(CALL_TIMESTAMP, CALLER);
        expect(analysis).to.deep.include({
            anger: 0.018321,
            disgust: 0.017718,
            fear: 0.017076,
            joy: 0.961437,
            sadness: 0.039175
        });
        expect(analysis.timestamp).to.be.at.least(TRANSCRIPT_TIMESTAMP);
    });


    it('should retrieve an analysis of a series of utterances', async () => {
        //
        // put a transcript in the cache
        const CALL_TIMESTAMP = Date.now();
        const CALLER = 'caller';
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

        //
        // get an analysis of it
        const analysis = await nlu.analyze(CALL_TIMESTAMP, CALLER);
        expect(analysis).to.deep.include({
            anger: 0.018321,
            disgust: 0.017718,
            fear: 0.017076,
            joy: 0.951437,
            sadness: 0.039175
        });
        expect(analysis.timestamp).to.be.at.least(CALL_TIMESTAMP);
    });


    it('should reuse cached analyses', async () => {
        //
        // put a transcript in the cache
        const CALL_TIMESTAMP = Date.now();
        const CALLER = 'caller';
        sttStore.addFinalTranscription(CALL_TIMESTAMP, {
            timestamp: Date.now(),
            who: CALLER,
            transcript: 'you are such an amazing person'
        });

        //
        // get an analysis of it
        const EXPECTED_ANALYSIS_SINGLE_UTTERANCE = {
            anger: 0.009652,
            disgust: 0.005603,
            fear: 0.002391,
            joy: 0.998513,
            sadness: 0.017323
        };
        const analysis = await nlu.analyze(CALL_TIMESTAMP, CALLER);
        expect(analysis).to.deep.include(EXPECTED_ANALYSIS_SINGLE_UTTERANCE);

        //
        // add to the transcript
        const additionalUtterances = [
            'i love everything that you do',
            'i\'m so grateful for all of your work',
            'you rock'
        ];
        for (const transcript of additionalUtterances) {
            sttStore.addFinalTranscription(CALL_TIMESTAMP, {
                timestamp: Date.now(),
                who: CALLER,
                transcript
            });
        }

        //
        // request a new analysis
        const newAnalysis = await nlu.analyze(CALL_TIMESTAMP, CALLER);
        expect(newAnalysis).to.deep.include(EXPECTED_ANALYSIS_SINGLE_UTTERANCE);
    });
});
