const expect = require('chai').expect;
const env = require('./env');

describe('env check', () => {

    it('should be silent if environment variables are set', () => {
        process.env.STT_API_KEY = 'test';
        env.check();
    });

    it('should give a clear message if environment variables are not set', () => {
        delete process.env.STT_API_KEY;
        expect(() => { env.check() }).to.throw(/Missing required environment variable STT_API_KEY*/);
    });
});
