const SERVER_PORT = 2000;

const http = require('http');
const express = require('express');
const socket_io = require('socket.io');

let app = express();
let server = http.Server(app);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});
app.use('/', express.static(__dirname + '/public'));


server.listen(SERVER_PORT);
console.log('Server started on port ' + SERVER_PORT);

// Create field 10x10
let field = [];
field.length = 10;
for (let i = 0; i < field.length; i++) {
    field[i] = [];
    field[i].length = field.length;
    for (let j = 0; j < field[i].length; j++) {
        field[i][j] = '-';
    }
}

let activePlayers = 0;
let io = socket_io(server, {});
io.sockets.on('connection', function (socket) {
    let player = '-';
    socket.emit('init', {activePlayers: activePlayers});
    socket.emit('redraw', {field: field});

    socket.on('new_game', function (data) {
        activePlayers++;
        player = 'X';
    });

    socket.on('connect_game', function (data) {
        activePlayers++;
        player = 'O';
    });

    socket.on('turn', function (data) {
        field[data.y][data.x] = player;
        socket.emit('redraw', {field: field});
    });

    socket.on('disconnect', function () {
        if (player === 'X' || player === 'O') activePlayers--;
    });
});

