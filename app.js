var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var config = require('config');
var session = require('express-session');
var jade = require('jade');
var store = require('./lib/store');
var uber = require('./lib/uber')(config);

var app = express();

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set('views', './views');
app.set('view engine', 'jade');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'public')));

// Application Settings
var port = config.get('port') || 3000;
var redirect_host = config.get('uber.redirect_host');
var redirect_path = config.get('uber.redirect_path');
var webhookPath = config.get('uber.webhook_path');
var surgePath = config.get('uber.surge_path');

app.use(session({
    secret: config.get('secret'),
    resave: false,
    saveUninitialized: true
}));

var webhooks = store().webhooks();
var sessions = store().sessions();

// Initial page redirecting to Uber
app.get('/sign-in', function (req, res) {
    res.redirect(uber.authorizationUri);
});

app.get(redirect_path, function (req, res) {
    var code = req.query.code;
    uber.getTokenFromCode(code, function (accessToken) {
        sessions.setItem(req.session.id, accessToken);
        res.redirect('/home');
    });
});

app.get('/', function (req, res) {
    var sessionAuthorization = sessions.getItem(req.session.id);
    if (sessionAuthorization) {
        res.redirect('/home')
    } else {
        res.render('index');
    }
});

app.get('/home', function (req, res) {
    var sessionAuthorization = sessions.getItem(req.session.id);
    if (!sessionAuthorization) {
        res.redirect('/');
    } else {
        res.render('home');
    }
});

app.get(surgePath, function (req, res) {
    var token = getTokenFromSession(req.session.id);
    var body = {
        "start_latitude": req.session.start_lat,
        "start_longitude": req.session.start_lng,
        "surge_confirmation_id": req.query.surge_confirmation_id
    };

    uber.requestTrip(body, token, res);
});

app.get('/requests/:requestId', function (req, res) {
    var requestId = req.params.requestId;
    req.session.current_request = requestId;

    var token = getTokenFromSession(req.session.id);
    if (!token) {
        res.redirect('/')
    }

    uber.getTripDetails(requestId, token, function (error, response, body) {
        res.render('request', {"data": JSON.stringify(body, null, 2)})
    });
});

app.get('/requests/:requestId/:status', function (req, res) {
    var token = getTokenFromSession(req.session.id);
    if (!token) {
        res.redirect('/')
    }

    var status = req.params.status;
    var requestId = req.params.requestId;

    uber.updateSandbox(requestId, status, function (error, response, body) {
        res.redirect('/requests/' + requestId)
    });
});

app.post('/requests', function (req, res) {
    var token = getTokenFromSession(req.session.id);
    if (!token) {
        res.redirect('/')
    }

    var startLatitude = req.body.lat;
    var startLongitude = req.body.lng;
    req.session.start_lat = startLatitude;
    req.session.start_lng = startLongitude;

    var body = {
        "start_latitude": startLatitude,
        "start_longitude": startLongitude
    };

    uber.requestTrip(body, token, res);
});

app.post(webhookPath, function (req, res) {
    console.log(JSON.stringify(req.body, null, 2));

    var events = webhooks.getItem('events');
    events.push(req.body);
    webhooks.setItem('events', events);

    res.send("Success");
});

app.get(webhookPath, function (req, res) {
    var events = webhooks.values();
    res.render('webhooks', {"data": events});
});

function getTokenFromSession(session) {
    var credentials = sessions.getItem(session);
    var token = null;
    if (credentials) {
        token = credentials.token.access_token;
    }
    return token;
}

app.listen(port);

console.log("Listening on " + redirect_host + ":" + port);

module.exports = app;
