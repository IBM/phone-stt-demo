
/**
 * Returns the external hostname for this running app.
 *  This does not include the protocol, as we will want to use this
 *  for both https and wss.
 *
 * The hostname is inferred from environment variables, but defaults
 *  to "localhost" if these are not set.
 *
 * @returns {string}
 */
function getHostname() {
    // if a full hostname has been provided as an environment variable,
    //  we can just use that
    if (process.env.HOST) {
        return process.env.HOST;
    }
    // if we have App Engine environment variables then we can use these
    //  to construct what the default hostname should be
    else if (process.env.CE_APP && process.env.CE_SUBDOMAIN && process.env.CE_DOMAIN) {
        return [
            process.env.CE_APP,
            process.env.CE_SUBDOMAIN,
            process.env.CE_DOMAIN
        ].join('.');
    }
    // otherwise assume we are running on a developer machine
    else {
        return 'localhost';
    }
}



module.exports = {
    getHostname
};
