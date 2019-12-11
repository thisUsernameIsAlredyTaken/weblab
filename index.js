const SERVER_PORT = 2000;

const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const serverLogic = require('./script/server/server');

let app = express();
let server = http.Server(app);


// Mapping
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});
app.use('/', express.static(__dirname + '/public'));


// Start server
server.listen(SERVER_PORT);
console.log('Server started on port ' + SERVER_PORT);
let io = socketIo(server, {});

const X = 'x';
const O = 'o';
const X_KILLED = 'O';
const O_KILLED = 'X';
const EMPTY = '';

let Game = serverLogic.Game;

let activePlayers = 0;
let users = {
    x: {
        status: 'Waiting for another player',
        buttonText: ''
    },
    o: {
        status: 'Enemy\'s turn',
        buttonText: ''
    },
    spectator: {
        status: 'Spectating',
        buttonText: 'Host game'
    }
};

io.sockets.on('connection', function (socket) {
    let g = new Game();
    let playerType = 'spectator';
    setTimeout(()=>{
        socket.emit('redirect_game', {});
    }, 5000);

    setInterval(function () {
        socket.emit('tick', {
            field: {},
            status: users[playerType].status,
            buttonText: users[playerType].buttonText,
            activePlayers: activePlayers
        });
    }, 125);

    socket.on('new_game', function () {
        activePlayers = 1;
        users.spectator.buttonText = 'Join game';
        users.x.status = 'Waiting for another player';
        users.x.buttonText = '';
        playerType = 'x';
        socket.emit('init_player', {});
    });

    socket.on('connect_game', function () {
        activePlayers = 2;
        users.spectator.buttonText = '';
        users.x.status = 'Your turn';
        users.o.status = 'Enemy\'s turn';
        users.o.buttonText = '';
        currentPlayer = 'x';
        playerType = 'o';
        socket.emit('init_player', {});
    });

    socket.on('turn', function (data) {
        console.log(data);
        if (canTurn(playerType, data.row, data.col)) {
            field[data.row][data.col] = playerType;
            if (playerType === 'x') {
                users.x.status = 'Enemy\'s turn';
                users.o.status = 'Your turn';
                currentPlayer = 'o';
            } else if (playerType === 'o') {
                users.x.status = 'Your turn';
                users.o.status = 'Enemy\'s turn';
                currentPlayer = 'x';
            }
        }
    });
});



