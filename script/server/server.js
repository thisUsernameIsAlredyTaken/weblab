function Game() {
    this.isGameEnded = function() {
        return isGameEnded;
    };

    this.getCurrentPlayer = function () {
        return currentPlayer;
    };

    this.getStartTime = function () {
        return startTime;
    };

    this.getEndTime = function () {
        return endTime;
    };

    this.players = {
        x: {
            turn: function (row, col) {
                if (currentPlayer !== X) {
                    return false;
                }
                return turn(X, row, col);
            },
            pass: function () {
                if (currentPlayer !== X) {
                    return pass();
                } else {
                    return false;
                }
            }
        },
        o: {
            turn: function(row, col) {
                if (currentPlayer !== O) {
                    return false;
                }
                return turn(O, row, col);
            },
            pass: function () {
                if (currentPlayer !== O) {
                    return pass();
                } else {
                    return true;
                }
            }
        }
    };

    // Private methods
    let turn = function (row, col) {
        if (field[row][col] === EMPTY) {
            return place(currentPlayer, row, col);
        }
        let enemy = currentPlayer === X ? O : X;
        if (field[row][col] === enemy) {
            return kill(currentPlayer, row, col);
        }
        return false;
    };

    let place = function (row, col) {
        if ((turnCount === 0 && subTurnCount === 0 &&
            currentPlayer === X && row === 9 && col === 0)
            ||
            (turnCount === 1 && subTurnCount === 0 &&
                currentPlayer === O && row === 0 && col === 9)) {
            endSubTurn();
            return true;
        }
        if (isAvailable(currentPlayer, row, col)) {
            field[row][col] = currentPlayer;
            endSubTurn();
            return true;
        }
        return false;
    };

    let kill = function (row, col) {
        let killed = currentPlayer === X ? O_KILLED : X_KILLED;
        if (isAvailable(currentPlayer, row, col)) {
            field[row][col] = killed;
            endSubTurn();
            // Update graph
            getAroundIndexes(row, col, 10, 10).forEach(elem => {
                if (field[elem[0]][elem[1]] === killed) {
                    let ind1 = elem[0] * 10 + elem[1];
                    let ind2 = row * 10 + col;
                    let graph;
                    if (killed === O_KILLED) {
                        graph = oKilledGraph;
                    } else {
                        graph = xKilledGraph;
                    }
                    graph[ind1][ind2] = true;
                    graph[ind2][ind1] = true;
                }
            });
            return true;
        }
        return false;
    };

    let pass = function () {
        if (subTurnCount !== 0) {
            return false;
        }
        endTurn(true);
        return true;
    };

    // Helper methods
    let endSubTurn = function() {
        subTurnCount -=- 1;
        if (subTurnCount === 3) {
            endTurn(false);
        }
        if (!isThereAnyAvailableTurn()) {
            endTurn(false);
        }
    };

    let endTurn = function(isPass = false) {
        subTurnCount = 0;
        turnCount += 1;
        currentPlayer = currentPlayer === X ? O : X;
        if (lastTurnPass && isPass) {
            endGame();
        }
        lastTurnPass = isPass;
    };

    let endGame = function () {
        isGameEnded = true;
        endTime = Date.now();
    };

    let isThereAnyAvailableTurn = function () {
        let player = currentPlayer;
        let enemy = player === X ? O : X;

        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                if (isAvailable(player, i, j)) {
                    return true;
                }
            }
        }
        return false;
    };

    let isAvailable = function (row, col) {
        let killed = currentPlayer === X ? O_KILLED : X_KILLED;

        // If one of around elements belongs to current player return true
        getAroundIndexes(row, col, 10, 10).forEach(element => {
            if (field[element[0]][element[1]] === currentPlayer) {
                return true;
            }
        });

        let graph;
        if (killed === O_KILLED) {
            graph = oKilledGraph;
        } else {
            graph = xKilledGraph;
        }

        // For every X or O on field try to find path
        for (let i = 0; i < field.length; i++) {
            for (let j = 0; j < field[i].length; j++) {
                if (field[i][j] === currentPlayer &&
                    findPath(graph, row * 10 + col, i * 10 + j)) {
                    return true;
                }
            }
        }
        return false;
    };

    let getAroundIndexes = function (i, j, iMax, jMax) {
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

    // A* algorithm
    let findPath = function (graph, start, end) {
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
    let field = [];
    field.length = 10;
    for (let i = 0; i < field.length; i++) {
        field[i] = [];
        field[i].length = field.length;
        for (let j = 0; j < field[i].length; j++) {
            field[i][j] = EMPTY;
        }
    }
    let xKilledGraph = [];
    let oKilledGraph = [];
    xKilledGraph.length = 100;
    oKilledGraph.length = 100;
    for (let i = 0; i < 100; i++) {
        xKilledGraph[i].length = 100;
        oKilledGraph[i].length = 100;
        for (let j = 0; j < 100; j++) {
            xKilledGraph[i][j] = false;
            oKilledGraph[i][j] = false;
        }
    }

    // Time
    let startTime = Date.now();
    let endTime = undefined;

    // Helper
    let turnCount = 0;
    let subTurnCount = 0;
    let currentPlayer = X;
    let lastTurnPass = false;
    let isGameEnded = false;
}

