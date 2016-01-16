var express = require('express');
var router = express.Router();

/* GET user home page. */
router.get('/home', function (req, res, next) {
    // sessionStoreage - investigate if this can hold objects like accessTokens
    // Get accessToken
    var user = uber.get('/me');
    res.render('home');
});

module.exports = router;
