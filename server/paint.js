
/*! Copyright (C) TetraLoom LLC - All Rights Reserved
 *  Unauthorized copying of this file, via any medium is strictly prohibited
 *  Proprietary and confidential
 *  Written by Noah Franks <TetraLoom@pm.me>, April 2020 */

const app  = require('express')();
const http = require('http').Server(app);
const io   = require('socket.io')(http, {path: '/paint/socket.io'});
const url  = require('url');
const fs   = require('fs');

const port = 8194;
const tiles_wide = 390;
const tiles_tall = 206;
const backup_delay = 15 * 60 * 1000;    // every 15 mins                                            

var grid = JSON.parse(fs.readFileSync('grid-data.json'));

setInterval(() => {
    fs.writeFile('grid-data.json', JSON.stringify(grid), err => {
        if (err !== null)
            console.log('ERROR: Failed to backup grid: ', err);
    });
}, backup_delay);

app.set('trust proxy', 'loopback');

app.get('/paint/*', function(req, res) {
    
    let path = url.parse(req.url).pathname;
    let filename = '/var/www/tetraloom.com' + path;
    
    fs.access(filename, fs.F_OK, function(err) {
        if (!err) res.sendFile(filename);
        else      res.redirect('https://tetraloom.com/');
    });
});

app.post('/paint/', [], function(req, res) {
    res.status(200).json({
        grid: grid,
    });
});

io.on('connection', socket => {});

http.listen(port, () => {
    console.log('Paint server running on ' + port);
});


const ws                    = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');

const stream = new ReconnectingWebSocket('ws://[::1]:7078', [], {
    WebSocket: ws,
    connectionTimeout: 1000,
    maxRetries: 100000,
    maxReconnectionDelay: 2000,
    minReconnectionDelay: 10,
});

stream.onopen = () => {
    stream.send(JSON.stringify({
        action: "subscribe",
        topic: "confirmation",
	    ack: true,
        options: {
            all_local_accounts: false,
            accounts: [
                'nano_3j3dtp68ubnibm78un7ge7jqn9hr9a8g4xf94tg1nosn9818pw44cee7noku',
            ],
        },
    }));
};

stream.onmessage = msg => {    // untrusted (Nano Network)                                          
    
    var data = JSON.parse(msg.data);
    
    if (data.topic !== "confirmation" || data.message.block.subtype !== "send")
        return;
    
    const amount = data.message.amount;
    
    if (amount.length < 27) return;
    
    var encoded = parseInt(amount.substring(1));
    const copy = encoded;
    
    const x = encoded % tiles_wide; encoded = (encoded - x) / tiles_wide;
    const y = encoded % tiles_tall; encoded = (encoded - y) / tiles_tall;
    const r = encoded % 256;        encoded = (encoded - r) / 256;
    const g = encoded % 256;        encoded = (encoded - g) / 256;
    const b = encoded % 256;   // done for safety                                                   
    
    if (!Number.isInteger(x) || !Number.isInteger(y) ||
        !Number.isInteger(r) || !Number.isInteger(g) || !Number.isInteger(b)) return;
    
    io.sockets.emit('update', copy);
    
    console.log(amount, copy, x, y, r, g, b);
    
    grid[tiles_wide*y + x] = ''
        + (r < 16 ? '0' : '') + r.toString(16)
        + (g < 16 ? '0' : '') + g.toString(16)
        + (b < 16 ? '0' : '') + b.toString(16);
};
