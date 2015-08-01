var express = require('express');
var https = require('https');
var http = require('http');
var fs = require('fs');

var options = {
    key: fs.readFileSync('certs/server-key.pem'),
    cert: fs.readFileSync('certs/server-cert.pem')
};

var app = express();
app.use(requireHTTPS);
app.use(express.static('./public'));

// Create an HTTP service.
http.createServer(app).listen(3000);
// Create an HTTPS service identical to the HTTP service.
https.createServer(options, app).listen(443);

function requireHTTPS(req, res, next) {
    if (!req.secure) {
    	var newURL = 'https://' + req.get('host').split(':')[0] + req.url;
        return res.redirect(newURL);
    }
    next();
}