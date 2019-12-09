const SERVER_PORT = 2000;

const http = require('http');
const express = require('express');
const socket_io = require('socket.io');

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
let io = socket_io(server, {});


// Logic
// Create field 10x10
let field = [];
field.length = 10;
for (let i = 0; i < field.length; i++) {
    field[i] = [];
    field[i].length = field.length;
    for (let j = 0; j < field[i].length; j++) {
        field[i][j] = '';
    }
}

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
let currentPlayer = '';

function canTurn(player, row, col) {
    if (activePlayers !== 2) {
        return false;
    }
    if (player !== 'x' && player !== 'o') {
        return false;
    }
    if (field[row][col] === 'x' || field[row][col] === 'o') {
        return false;
    }
    return player === currentPlayer;
}

io.sockets.on('connection', function (socket) {
    let playerType = 'spectator';

    setInterval(function () {
        socket.emit('tick', {
            field: field,
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



