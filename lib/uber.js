var sessions = require('./store')().sessions;
var request = require('request');

module.exports = function (config) {
    var clientId = config.get('uber.client_id');
    var clientSecret = config.get('uber.client_secret');
    var redirect_host = config.get('uber.redirect_host');
    var redirect_path = config.get('uber.redirect_path');
    var port = config.get('port');

    var oauth2 = require('simple-oauth2')({
        clientID: config.get('uber.client_id'),
        clientSecret: config.get('uber.client_secret'),
        site: 'https://login.uber.com',
        tokenPath: '/oauth/v2/token',
        authorizationPath: '/oauth/v2/authorize'
    });

    var uberApiHost;
    switch (config.env) {
        case "prod":
            uberApiHost = 'https://api.uber.com/v1';
            break;
        default:
            uberApiHost = 'https://sandbox-api.uber.com/v1';
    }

    // Authorization uri definition
    var authorizationUri = oauth2.authCode.authorizeURL({
        redirect_uri: redirect_host + ":" + port + redirect_path,
        scope: config.get('uber.scopes'),
        state: '3(#0/!~'
    });

    function requestTrip(body, token, res) {
        request.post({
            url: uberApiHost + "/requests",
            json: true,
            headers: {
                "content-type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: body
        }, function (error, response, body) {
            switch (response.statusCode) {
                case 409:
                    res.redirect(body.meta.surge_confirmation.href);
                    break;
                case 202:
                    // Request accepted
                    var requestId = body.request_id;
                    res.redirect('/requests/' + requestId);
                    break;
                default:
            }
        })
    }

    function getTripDetails(requestId, token, callback) {
        request.get({
            url: uberApiHost + "/requests/" + requestId,
            json: true,
            headers: {
                "content-type": "application/json",
                "Authorization": "Bearer " + token
            }
        }, callback);
    }


    function updateSandbox(requestId, status, callback) {
        request.put({
            url: uberApiHost + "/sandbox/requests/" + requestId,
            json: true,
            headers: {
                "content-type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: {
                "status": status
            }
        }, callback)
    }

    function getTokenFromCode(code, callback) {

        oauth2.authCode.getToken({
            code: code,
            redirect_uri: redirect_host + ":" + port + redirect_path
        }, function (error, token) {
            if (error) {
                console.log('Access Token Error', error.message);
            }

            var accessToken = oauth2.accessToken.create(token);
            console.log(accessToken);

            callback(accessToken);
        });
    }


    return {
        'updateSandbox': updateSandbox,
        'requestTrip': requestTrip,
        'getTripDetails': getTripDetails,
        'authorizationUri': authorizationUri,
        'getTokenFromCode': getTokenFromCode
    }

};