const SERVER_PORT = 2000;

const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const {Game, X, O, EMPTY} = require('./script/game.js');

let app = express();
let server = http.Server(app);


// Mapping
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/static/index.html');
});
app.use('/', express.static(__dirname + '/static'));


// Start server
server.listen(SERVER_PORT);
console.log('Server started on port ' + SERVER_PORT);


let game = null;
let activePlayers = 0;
let players;
players[X] = {};
players[O] = {};
let sockets = [];

let io = socketIo(server, {});
io.sockets.on('connection', function (socket) {
    let player = EMPTY;

    socket.on('game_html', () => {
        if (activePlayers !== 2) {
            activePlayers += 1;
            if (activePlayers === 1) {
                player = X;
                players[X].socket = socket;
            } else if (activePlayers === 2) {
                player = O;
                players[O].socket = socket;
                game = new Game(data => {
                    socket.emit('game_over', data);
                });
                for (let p in players) {
                    players[p].socket.emit('game_start', {player: p});
                }
            }
        } else {
            socket.emit('game_start', {player: EMPTY});
        }
    });

    socket.on('turn', data => {
        if (game.getCurrentPlayer() === player) {
            game.turn(data.row, data.col);
            socket.emit('redraw', {
                game: game
            })
        }
    });
});



