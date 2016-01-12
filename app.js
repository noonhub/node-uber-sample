var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var config = require('config');

// Application Settings
var clientId = config.get('uber.client_id');
var clientSecret = config.get('uber.client_secret');
var port = config.get('port') || 3000;
var redirect_uri = config.get('uber.redirect_uri');

var oauth2 = require('simple-oauth2')({
    clientID: config.get('uber.client_id'),
    clientSecret: config.get('uber.client_secret'),
    site: 'https://login.uber.com',
    tokenPath: '/oauth/v2/token',
    authorizationPath: '/oauth/v2/authorize'
});

// Authorization uri definition
var authorization_uri = oauth2.authCode.authorizeURL({
    redirect_uri: config.get('uber.redirect_uri'),
    scope: 'all_trips request profile',
    state: '3(#0/!~'
});

// Initial page redirecting to Github
app.get('/auth', function (req, res) {
    res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/uber/oauth_callback', function (req, res) {
    var code = req.query.code;
    console.log('/callback', code);
    oauth2.authCode.getToken({
        code: code,
        redirect_uri: redirect_uri
    }, saveToken);

    function saveToken(error, token) {
        if (error) {
            console.log('Access Token Error', error.message);
        }
        console.log(token);
    }
});

app.get('/', function (req, res) {
    res.send('Hello<br><a href="/auth">Connect With uber</a>');
});

app.listen(port);

console.log("Listening on http://localhost:" + port);