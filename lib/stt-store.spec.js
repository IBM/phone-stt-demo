const sttStore = require('./stt-store');
const expect = require('chai').expect;


describe('transcription store', () => {

    beforeEach(() => {
        sttStore._reset();
    });

    it('should get a list of calls', () => {
        sttStore.addFinalTranscription(20, { transcript: 'hello', who: 'caller', timestamp: Date.now() });
        sttStore.addFinalTranscription(30, { transcript: 'world', who: 'caller', timestamp: Date.now() });
        sttStore.addFinalTranscription(40, { transcript: 'tests', who: 'caller', timestamp: Date.now() });

        const calls = sttStore.getCallTimestamps();
        expect(calls).to.deep.equal([ 20, 30, 40 ]);
    });


    it('should get an empty list before any calls have happened', () => {
        expect(sttStore.getCallTimestamps()).to.deep.equal([]);
    });


    it('should retrieve a call record', () => {
        const CALL_TIMESTAMP = Date.now();

        sttStore.addFinalTranscription(CALL_TIMESTAMP, { transcript: 'first',  who: 'caller',   timestamp: 1643716800000 });
        sttStore.addFinalTranscription(CALL_TIMESTAMP, { transcript: 'second', who: 'caller',   timestamp: 1643716810000 });
        sttStore.addFinalTranscription(CALL_TIMESTAMP, { transcript: 'alpha',  who: 'receiver', timestamp: 1643716815000 });
        sttStore.addFinalTranscription(CALL_TIMESTAMP, { transcript: 'third',  who: 'caller',   timestamp: 1643716820000 });
        sttStore.addFinalTranscription(CALL_TIMESTAMP, { transcript: 'beta',   who: 'receiver', timestamp: 1643716830000 });

        const transcript = sttStore.getTranscript(CALL_TIMESTAMP);
        expect(transcript.history).to.deep.equal([
            { transcript: 'first',  who: 'caller',   timestamp: 1643716800000 },
            { transcript: 'second', who: 'caller',   timestamp: 1643716810000 },
            { transcript: 'alpha',  who: 'receiver', timestamp: 1643716815000 },
            { transcript: 'third',  who: 'caller',   timestamp: 1643716820000 },
            { transcript: 'beta',   who: 'receiver', timestamp: 1643716830000 }
        ]);
    });


    it('should replace live transcripts when a final one is stored', () => {
        const CALL_TIMESTAMP = Date.now();

        sttStore.updateLiveTranscription(CALL_TIMESTAMP, { transcript: 'the cat',        who: 'caller',   timestamp: 1643720400000 });
        sttStore.updateLiveTranscription(CALL_TIMESTAMP, { transcript: 'the dog',        who: 'receiver', timestamp: 1643720405000 });
        sttStore.updateLiveTranscription(CALL_TIMESTAMP, { transcript: 'the cat sat',    who: 'caller',   timestamp: 1643720410000 });
        sttStore.updateLiveTranscription(CALL_TIMESTAMP, { transcript: 'the dog likes',  who: 'receiver', timestamp: 1643720415000 });
        sttStore.updateLiveTranscription(CALL_TIMESTAMP, { transcript: 'the cat sat on', who: 'caller', timestamp: 1643720420000 });
        sttStore.addFinalTranscription(CALL_TIMESTAMP, { transcript: 'the cat sat on the mat', who: 'caller', timestamp: 1643720430000 });

        const transcript = sttStore.getTranscript(CALL_TIMESTAMP);
        expect(transcript).to.deep.equal({
            history: [
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
});
