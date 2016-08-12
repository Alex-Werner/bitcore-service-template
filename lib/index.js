'use strict';

var Writable = require('stream').Writable;
var bodyParser = require('body-parser');
var compression = require('compression');
var BaseService = require('./service');
var inherits = require('util').inherits;
var morgan = require('morgan');
var bitcore = require('bitcore-lib-dash');
var _ = bitcore.deps._;
var $ = bitcore.util.preconditions;


/**
 * A service for Bitcore to enable decentralized payment processing.
 */
var DashPaymentService = function(options) {
    BaseService.call(this, options);

    if (!_.isUndefined(options.routePrefix)) {
        this.routePrefix = options.routePrefix;
    } else {
        this.routePrefix = this.name;
    }

};

DashPaymentService.dependencies = ['bitcoind', 'web'];

inherits(DashPaymentService, BaseService);


DashPaymentService.prototype.getRoutePrefix = function() {
    return this.routePrefix;
};

DashPaymentService.prototype.start = function(callback) {
    this.node.services.bitcoind.on('tx', this.transactionEventHandler.bind(this));
    this.node.services.bitcoind.on('txlock', this.transactionLockEventHandler.bind(this));
    this.node.services.bitcoind.on('block', this.blockEventHandler.bind(this));
    setImmediate(callback);
};

DashPaymentService.prototype.createLogInfoStream = function() {
    var self = this;

    function Log(options) {
        Writable.call(this, options);
    }
    inherits(Log, Writable);

    Log.prototype._write = function (chunk, enc, callback) {
        self.node.log.info(chunk.slice(0, chunk.length - 1)); // remove new line and pass to logger
        callback();
    };
    var stream = new Log();

    return stream;
};

DashPaymentService.prototype.getRemoteAddress = function(req) {
    if (req.headers['cf-connecting-ip']) {
        return req.headers['cf-connecting-ip'];
    }
    return req.socket.remoteAddress;
};

DashPaymentService.prototype.setupRoutes = function(app) {

    var self = this;

    //Setup logging
    morgan.token('remote-forward-addr', function(req){
        return self.getRemoteAddress(req);
    });
    var logFormat = ':remote-forward-addr ":method :url" :status :res[content-length] :response-time ":user-agent" ';
    var logStream = this.createLogInfoStream();
    app.use(morgan(logFormat, {stream: logStream}));

    //Enable compression
    app.use(compression());

    //Enable urlencoded data
    app.use(bodyParser.urlencoded({extended: true}));

    //Enable CORS
    app.use(function(req, res, next) {

        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, HEAD, PUT, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Content-Length, Cache-Control, cf-connecting-ip');

        var method = req.method && req.method.toUpperCase && req.method.toUpperCase();

        if (method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
        } else {
            next();
        }
    });

    // Not Found
    app.use(function(req, res) {
        res.status(404).jsonp({
            status: 404,
            url: req.originalUrl,
            error: 'Not found'
        });
    });

    // Dash Payment Gateway routes go here....

};

DashPaymentService.prototype.blockEventHandler = function(hashBuffer) {

};

DashPaymentService.prototype.transactionEventHandler = function(txBuffer) {

};

DashPaymentService.prototype.transactionLockEventHandler = function(txBuffer) {

};


module.exports = DashPaymentService;
