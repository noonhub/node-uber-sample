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

var sessionClients = {};

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
        res.redirect('/home');
    }
});

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/home', function (req, res) {
    res.render('home');
});

app.get('/surge', function (req, res) {
    requestTrip()
});

app.get('/trip/:tripId', function (req, res) {
    var tripId = req.params.tripId;
    req.session.current_trip = tripId;

    var token = getTokenFromSession(req.session.id);
    if (!token) {
        res.redirect('/')
    }

    getTripDetails(tripId, token, function (error, response, body) {
        res.render('trip', {"trip": JSON.stringify(body)})
    });
});

app.get('/trip/:tripId/:status', function (req, res) {
    var token = getTokenFromSession(req.session.id);
    if (!token) {
        res.redirect('/')
    }

    var status = req.params.status;
    var tripId = req.params.tripId;

    request.put({
        url: uberApiHost + "/sandbox/requests/" + tripId,
        json: true,
        headers: {
            "content-type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: {
            "status": status
        }
    }, function (error, response, body) {
        res.redirect('/trip/' + tripId)
    })
});

app.post('/trip', function (req, res) {
    var token = getTokenFromSession(req.session.id);
    if (!token) {
        res.redirect('/')
    }

    var body = {
        "start_latitude": req.body.lat,
        "start_longitude": req.body.lng
    };

    requestTrip(body, token, function (error, response, body) {
        switch (response.statusCode) {
            case 409:
                res.redirect(body.meta.surge_confirmation.href);
                break;
            case 202:
                // Request accepted
                var requestId = body.request_id;
                res.redirect('/trip/' + requestId);
                break;
            default:

        }
    })
});

function getTokenFromSession(session) {
    var credentials = sessionClients[session];
    var token = null;
    if (credentials) {
        token = credentials.token.access_token;
    }
    return token;
}

function requestTrip(body, token, callback) {
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

function getTripDetails(tripId, token, callback) {
    request.get({
        url: uberApiHost + "/requests/" + tripId,
        json: true,
        headers: {
            "content-type": "application/json",
            "Authorization": "Bearer " + token
        }
    }, callback);
}

app.listen(port);

console.log("Listening on " + redirect_host + ":" + port);

module.exports = app;