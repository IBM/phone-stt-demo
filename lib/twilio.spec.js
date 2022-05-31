const fs = require('fs');
const twilio = require('./twilio');
const expect = require('chai').expect;


describe('twiml bin generator', () => {

    function clearEnv() {
        delete process.env.HOST;
        delete process.env.CE_APP;
        delete process.env.CE_SUBDOMAIN;
        delete process.env.CE_DOMAIN;
    }

    function getTestFile(loc) {
        return fs.readFileSync(loc, { encoding: 'utf8' }).trim();
    }

    after(clearEnv);


    describe('running locally', () => {
        before(() => {
            clearEnv();
            twilio.init();
        });

        it('should generate a template for a number', () => {
            const NUM = '441231112345';
            const generated = twilio.generateTwimlBin(NUM);
            const expected = getTestFile('./lib/testdata/twiml-local.xml');
            expect(generated).to.equal(expected);
        });
    });


    describe('running in Code Engine', () => {
        before(() => {
            clearEnv();
            process.env.CE_APP = 'phone-stt-demo';
            process.env.CE_SUBDOMAIN = 'abcdefg1h2i';
            process.env.CE_DOMAIN = 'eu-gb.codeengine.appdomain.cloud';
            twilio.init();
        });

        it('should generate a template for a number', () => {
            const NUM = '442380613733';
            const generated = twilio.generateTwimlBin(NUM);
            const expected = getTestFile('./lib/testdata/twiml-appengine.xml');
            expect(generated).to.equal(expected);
        });
    });


    describe('running with a custom hostname', () => {
        before(() => {
            clearEnv();
            process.env.HOST = 'custom-domain.com';
            twilio.init();
        });

        it('should generate a template for a number', () => {
            const NUM = '441962819579';
            const generated = twilio.generateTwimlBin(NUM);
            const expected = getTestFile('./lib/testdata/twiml-custom.xml');
            expect(generated).to.equal(expected);
        });
    });
});
