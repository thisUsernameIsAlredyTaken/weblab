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

const X = 'x';
const O = 'o';
const X_KILLED = 'O';
const O_KILLED = 'X';
const EMPTY = '';

// Logic
function Player(turnFunc, passFunc) {
    this.turn = turnFunc;
    this.pass = passFunc;
}
function Game() {
    this.players = {};
    this.players.x = new Player((row, col) => {
        if (this.currentPlayer !== X) {
            return false;
        }
        return this.turn(X, row, col);
    },
        () => {
        if (this.currentPlayer !== X) {
            return this.pass();
        }
    });
    this.players.o = new Player((row, col) => {
        if (this.currentPlayer !== O) {
            return false;
        }
        return this.turn(O, row, col);
    },
        () => {
        if (this.currentPlayer !== O) {
            return this.pass();
        }
    });

    // Public methods
    this.turn = function (player, row, col) {
        if (this.field[row][col] === EMPTY) {
            return this.place(player, row, col);
        }
        let enemy = player === X ? O : X;
        if (this.field[row][col] === enemy) {
            return this.kill(player, row, col);
        }
        return false;
    };

    this.place = function (player, row, col) {
        if ((this.turnCount === 0 && this.subTurnCount === 0 &&
            player === X && row === 9 && col === 0)
            ||
           (this.turnCount === 1 && this.subTurnCount === 0 &&
            player === O && row === 0 && col === 9)) {
            this.endSubTurn();
            return true;
        }
        if (this.field[row][col] === EMPTY &&
            this.isAvailable(player, row, col)) {
            this.field[row][col] = player;
            this.endSubTurn();
            return true;
        }
        return false;
    };

    this.kill = function (player, row, col) {
        let enemy = player === X ? O : X;
        let killed = player === X ? O_KILLED : X_KILLED;
        if (this.field[row][col] === enemy && this.isAvailable(player, row, col)) {
            this.field[row][col] = killed;
            this.endSubTurn();
            // Update graph
            this.getAroundIndexes(row, col, 10, 10).forEach(elem => {
                if (this.field[elem[0]][elem[1]] === killed) {
                    let ind1 = elem[0] * 10 + elem[1];
                    let ind2 = row * 10 + col;
                    if (killed === O_KILLED) {
                        this.oKilledGraph[ind1][ind2] = true;
                        this.oKilledGraph[ind2][ind1] = true;
                    } else {
                        this.xKilledGraph[ind1][ind2] = true;
                        this.xKilledGraph[ind2][ind1] = true;
                    }
                }
            });
            return true;
        }
        return false;
    };

    this.pass = function () {
        if (this.subTurnCount !== 0) {
            return false;
        }
        this.endTurn(true);
        return true;
    };

    // Helper methods
    this.endSubTurn = function() {
        this.subTurnCount -=- 1;
        if (this.subTurnCount === 3) {
            this.endTurn(false);
        }
        if (!this.isThereAnyAvailableTurn()) {
            this.endTurn(false);
        }
    };

    this.endTurn = function(isPass = false) {
        this.subTurnCount = 0;
        this.turnCount += 1;
        this.currentPlayer = this.currentPlayer === X ? O : X;
        if (this.lastTurnPass && isPass) {
            this.endGame();
        }
        this.lastTurnPass = isPass;
    };

    this.endGame = function () {
        this.isGameEnded = true;
        this.endTime = Date.now();
    };

    this.isThereAnyAvailableTurn = function () {
        let player = this.currentPlayer;
        let enemy = player === X ? O : X;

        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                if (this.isAvailable(player, i, j)) {
                    return true;
                }
            }
        }
    };

    this.isAvailable = function (player, row, col) {
        let enemy = player === X ? O : X;
        if (this.field[row][col] !== EMPTY &&
            this.field[row][col] !== enemy) {
            return false;
        }
        let killed = player === X ? O_KILLED : X_KILLED;

        // If one of around elements belongs to current player return true
        this.getAroundIndexes(row, col, 10, 10).forEach(element => {
            if (this.field[element[0]][element[1]] === player) {
                return true;
            }
        });

        let graph;
        if (killed === O_KILLED) {
            graph = this.oKilledGraph;
        } else {
            graph = this.xKilledGraph;
        }

        // For every X or O on field try to find path
        for (let i = 0; i < this.field.length; i++) {
            for (let j = 0; j < this.field[i].length; j++) {
                if (this.field[i][j] === player &&
                    this.findPath(graph, row * 10 + col, i * 10 + j)) {
                    return true;
                }
            }
        }
        return false;
    };

    this.getAroundIndexes = function (i, j, iMax, jMax) {
        let inx = [];
        let ret = [];
        inx.length = 8;
        inx[0] = [i - 1, j - 1];
        inx[1] = [i - 1, j];
        inx[2] = [i - 1, j + 1];
        inx[3] = [i, j - 1];
        inx[4] = [i, j + 1];
        inx[5] = [i + 1, j - 1];
        inx[6] = [i + 1, j];
        inx[7] = [i + 1, j + 1];
        inx.forEach(element => {
            if (element[0] >= 0 && element[0] <= 9 &&
                element[1] >= 0 && element[1] <= 9) {
                ret.push(element);
            }
        });
        return ret;
    };

    // this.buildGraph = function(player) {
    //     let killed = player === X ? O_KILLED : X_KILLED;
    //     let graph = [];
    //     graph.length = 100;
    //     for (let i = 0; i < 100; i++) {
    //         graph[i] = [];
    //         graph[i].length = graph.length;
    //         for (let j = 0; j < 100; j++) {
    //             graph[i][j] = false;
    //         }
    //     }
    //     for (let i = 0; i < this.field.length; i++) {
    //         for (let j = 0; j < this.field[i].length; j++) {
    //             if (this.field[i][j] === killed) {
    //                 let indexes = this.getAroundIndexes(i, j, 10, 10);
    //                 indexes.forEach(element => {
    //                     if (this.field[element[0]][element[1]] === killed) {
    //                         let ind1 = element[0] * this.field.length + element[1];
    //                         let ind2 = i * this.field.length + j;
    //                         graph[ind1][ind2] = true;
    //                         graph[ind2][ind1] = true;
    //                     }
    //                 });
    //             }
    //         }
    //     }
    //     return graph;
    // };

    // A* algorithm
    this.findPath = function (graph, start, end) {
        function h(start, end) {
            let startI = start / 10;
            let startJ = start % 10;
            let endI = end / 10;
            let endJ = end % 10;
            return Math.abs(startI - endI) + Math.abs(startJ - endJ);
        }
        let closed = [];
        let open = [from];
        let from = {};
        let g = [];
        let f = [];
        g[start] = 0;
        f[start] = g[start] + h(start, end);
        while (open.length > 0) {
            let curr = open[0];
            if (curr === end)
                return true;
            open.splice(open.indexOf(curr), 1);
            closed.push(curr);
            let neighbours = [];
            for (let i = 0; i < 100; i++) {
                if (graph[curr][i] && closed.indexOf(i) === -1) {
                    neighbours.push(i);
                }
            }
            neighbours.forEach(elem => {
                let tmpG = g[curr] + 1;
                if (open.indexOf(elem) === -1 || tmpG < g[elem]) {
                    from[elem] = curr;
                    g[curr] = tmpG;
                    f[elem] = g[elem] + h(elem, end);
                }
                if (open.indexOf(elem) === -1) {
                    open.push(elem);
                }
            });
        }
        return false;
    };

    // Fields
    // Game field 10x10
    this.field = [];
    this.field.length = 10;
    for (let i = 0; i < this.field.length; i++) {
        this.field[i] = [];
        this.field[i].length = this.field.length;
        for (let j = 0; j < this.field[i].length; j++) {
            this.field[i][j] = EMPTY;
        }
    }
    this.xKilledGraph = [];
    this.oKilledGraph = [];
    this.xKilledGraph.length = 100;
    this.oKilledGraph.length = 100;
    for (let i = 0; i < 100; i++) {
        this.xKilledGraph[i].length = 100;
        this.oKilledGraph[i].length = 100;
        for (let j = 0; j < 100; j++) {
            this.xKilledGraph[i][j] = false;
            this.oKilledGraph[i][j] = false;
        }
    }

    // Time
    let startTime = Date.now();
    let endTime;

    // Helper
    this.turnCount = 0;
    this.subTurnCount = 0;
    this.currentPlayer = X;
    this.lastTurnPass = false;
    this.isGameEnded = false;
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



