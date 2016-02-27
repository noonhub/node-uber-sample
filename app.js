var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var config = require('config');
var session = require('express-session');
var request = require('request');
var jade = require('jade');

var app = express();

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.set('views', './views');
app.set('view engine', 'jade');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'public')));

// Application Settings
var clientId = config.get('uber.client_id');
var clientSecret = config.get('uber.client_secret');
var port = config.get('port') || 3000;
var redirect_host = config.get('uber.redirect_host');
var redirect_path = config.get('uber.redirect_path');

app.use(session({
    secret: config.get('secret'),
    resave: false,
    saveUninitialized: true
}));

var sessionClients = new Object();

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
    case "sand":
        uberApiHost = 'https://sandbox-api.uber.com/v1';
    default:
        uberApiHost = 'http://localhost:8080';
}

// Authorization uri definition
var authorization_uri = oauth2.authCode.authorizeURL({
    redirect_uri: redirect_host + ":" + port + redirect_path,
    scope: config.get('uber.scopes'),
    state: '3(#0/!~'
});

// Initial page redirecting to Uber
app.get('/sign-in', function (req, res) {
    res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get(redirect_path, function (req, res) {
    var code = req.query.code;
    oauth2.authCode.getToken({
        code: code,
        redirect_uri: redirect_host + ":" + port + redirect_path
    }, saveToken);

    function saveToken(error, token) {
        if (error) {
            console.log('Access Token Error', error.message);
        }
        var accessToken = oauth2.accessToken.create(token);

        sessionClients[req.session.id] = accessToken;
        res.redirect('/home')
    }
});

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/home', function (req, res) {
    res.render('home');
});

app.get('/surge', function (req, res) {
    requestRide()
});

app.post('/ride', function (req, res) {
    var credentials = sessionClients[req.session.id];

    var token = credentials.token.access_token;

    var body = {
        "start_latitude": req.body.lat,
        "start_longitude": req.body.lng
    };

    requestRide(body, token, function (error, response, body) {
        if (response.statusCode == 409) {
            res.redirect(body.meta.surge_confirmation.href)
        }
    })
});

function requestRide(body, token, callback) {
    request.post({
        url: uberApiHost + "/requests",
        json: true,
        headers: {
            "content-type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: body
    }, callback)
}

app.listen(port);

console.log("Listening on " + redirect_host + ":" + port);

module.exports = app;