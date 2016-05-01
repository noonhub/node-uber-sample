var storage = require('node-persist');

module.exports = function () {

    function create(ttl, path) {
        return storage.create({
            dir: path,
            stringify: JSON.stringify,
            parse: JSON.parse,
            encoding: 'utf8',
            logging: false,
            continuous: true,
            interval: false,
            ttl: ttl
        });
    }

    function webhooks() {
        var webhooks = create(true, __dirname + '/../storage/webhooks');
        if (!webhooks.getItem('events')) {
            webhooks.setItem('events', [])
        }
        return webhooks;
    }

    function sessions() {
         return create(false, __dirname + '/../storage/sessions');
    }

    return {
        'create': create,
        'webhooks': webhooks,
        'sessions': sessions
    }
};