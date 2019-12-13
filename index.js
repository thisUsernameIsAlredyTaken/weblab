const SERVER_PORT = 2000;
const DB_PORT = 27017;
const DB_NAME = 'virwar';
const DB_COLLECTION_NAME = 'gamesessions';
const DB_URL = 'mongodb://127.0.0.1:' + DB_PORT + '/' + DB_NAME;

const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const {Game, X, O, EMPTY} = require('./script/game.js');
const mongoose = require('mongoose');

const GameSession = mongoose.model('GameSession', {
    starttime: Date,
    endtime: Date,
    winner: String
});

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
let players = {};
players[X] = {};
players[O] = {};
let sockets = [];
let gameOverData;

let io = socketIo(server, {});
io.sockets.on('connection', function (socket) {
    let player = EMPTY;

    socket.on('index_html', () => {
        let loop = setInterval(() => {
                socket.emit('game_status', {
                    activePlayers: activePlayers
                });
        }, 125);
        socket.on('index_html_leave', () => {
            clearInterval(loop);
        })
    });

    socket.on('game_html', () => {
        if (game !== null && game.isEnded()) {
            socket.emit('game_start', {
                field: game.getField(),
                currentPlayer: gameOverData.winner,
                player: EMPTY
            });
            socket.emit('game_over', gameOverData);
            sockets.push(socket);
        } else if (activePlayers !== 2) {
            activePlayers += 1;
            if (activePlayers === 1) {
                player = X;
                players[X].socket = socket;
                sockets.push(socket);
            } else if (activePlayers === 2) {
                player = O;
                players[O].socket = socket;
                sockets.push(socket);
                game = new Game(data => {
                    try {
                        mongoose.connect(DB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
                        let gs = new GameSession({
                            starttime: data.startTime,
                            endtime: data.endTime,
                            winner: data.winner
                        });
                        gs.save().then(() => {
                            mongoose.disconnect();
                        });
                    } catch (e) {
                        console.log(e);
                        mongoose.disconnect();
                    }
                    data.field = game.getField();
                    sockets.forEach(sock => {
                        gameOverData = data;
                        sock.emit('game_over', data);
                    });
                    // game = null;
                    // activePlayers = 0;
                    // sockets = [];
                    // players = {};
                    // players[X] = {};
                    // players[O] = {};
                });
                for (let p in players) {
                    players[p].socket.emit('game_start', {player: p});
                }
            }
        } else {
            sockets.push(socket);
            socket.emit('game_start', {
                player: EMPTY,
                field: game.getField(),
                currentPlayer: game.getCurrentPlayer()
            });
        }
    });

    socket.on('turn', data => {
        if (game.getCurrentPlayer() === player) {
            let f = game.turn(data.row, data.col);
        }
        if (game !== null && !game.isEnded()) {
            sockets.forEach(sock => {
                sock.emit('redraw', {
                    field: game.getField(),
                    currentPlayer: game.getCurrentPlayer()
                });
            });
        }
    });

    socket.on('pass', data => {
        if (game.getCurrentPlayer() === player) {
            game.pass();
        }
        if (game !== null && !game.isEnded()) {
            sockets.forEach(sock => {
                sock.emit('redraw', {
                    field: game.getField(),
                    currentPlayer: game.getCurrentPlayer()
                });
            });
        }
    });

    socket.on('stat_html', () => {
        try {
            mongoose.connect(DB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
            GameSession.find({}, 'starttime endtime winner', function (err, gs) {
                if (err) {
                    throw err;
                }
                socket.emit('stat', {gs: gs});
                mongoose.disconnect();
            });
        } catch (e) {
            console.log(e);
            socket.emit('stat', {gs: null});
            mongoose.disconnect();
        }
    });

    socket.on('disconnect', () => {
        if (player === X || player === O) {
            sockets.forEach(sock => {
                sock.emit('redirect_home', {});
            });
            activePlayers = 0;
            sockets = [];
            players = {};
            players[X] = {};
            players[O] = {};
            game = null;
        }
    });
});



