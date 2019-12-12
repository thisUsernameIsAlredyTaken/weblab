function Game(gameEndedCallback) {
    // Const
    const X = 'x';
    const O = 'o';
    const X_KILLED = 'O';
    const O_KILLED = 'X';
    const EMPTY = '';

    this.isAvailable = function (player, row, col) {
        return isAvailable(player, row, col);
    };

    this.isAnyAvailable = function (player) {
        return isAnyAvailableTurn(player);
    };

    this.getGraph = function (pl) {
        if (pl === X) {
            return xGraph;
        } else {
            return oGraph;
        }
    };

    this.findPath = function (start, end) {
        let gr;
        switch (getField((start - start % 10) / 10, start % 10)) {
            case X:
                gr = xGraph;
                break;
            case O:
                gr = oGraph;
                break;
        }
        return findPath(gr, start, end);
    };

    this.turn = function(row, col) {
        let enemy = currentPlayer === X ? O : X;
        let killed = enemy === X ? X_KILLED : O_KILLED;
        if (isAvailable(currentPlayer, row, col)) {
            if (getField(row, col) === enemy) {
                setField(row, col, killed);
            } else {
                setField(row, col, currentPlayer);
            }
            endSubTurn();
            return true;
        }
        return false;
    };

    this.pass = function () {
        if (subTurnCount !== 0) {
            return false;
        }
        endTurn(true);

        return true;
    };

    this.getCurrentPlayer = function() {
        return currentPlayer;
    };

    this.isGameEnded = function() {
        return gameEnded;
    };

    this.getField = function(row, col) {
        return field[row][col];
    };

    // Update field
    let setField = function(row, col, e) {
        switch (getField(row, col)) {
            case X:
                xCount -= 1;
                if (xCount === 0) {
                    endGame(O);
                }
                break;
            case O:
                oCount -= 1;
                if (oCount === 0) {
                    endGame(X);
                }
                break;
        }
        switch (e) {
            case X:
                xCount += 1;
                break;
            case O:
                oCount += 1;
                break;
        }
        field[row][col] = e;
        // Update graphs
        xGraph = buildGraph(X, xGraph);
        oGraph = buildGraph(O, oGraph);
    };

    let getField = function(row, col) {
        return field[row][col];
    };

    let isAvailable = function(player, row, col) {
        if (xCount === 0 && player === X) {
            return row === 9 && col === 0 && getField(row, col) === EMPTY;
        }
        if (oCount === 0 && player === O) {
            return row === 0 && col === 9 && getField(row, col) === EMPTY;
        }
        let enemy = player === X ? O : X;
        let killed = player === X ? O_KILLED : X_KILLED;
        if (getField(row, col) !== enemy && getField(row, col) !== EMPTY) {
            return false;
        }
        let graph;
        if (player === X) {
            graph = xGraph;
        } else {
            graph = oGraph;
        }
        let around = aroundIndexes(row, col);
        for (let e of around) {
            if (getField(e[0], e[1]) === player) {
                return true;
            }
        }
        for (let e of around) {
            if (getField(e[0], e[1]) === killed) {
                for (let i = 0; i < 10; i++) {
                    for (let j = 0; j < 10; j++) {
                        if (getField(i, j) === currentPlayer) {
                            if (findPath(graph, e[0] * 10 + e[1], i * 10 + j)) {
                                console.log('path Finded')
                                console.log([e[0], e[1]], [i, j]);
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    };

    let isAnyAvailableTurn = function(player) {
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                if (isAvailable(player, i, j)) {
                    return true;
                }
            }
        }
        return false;
    };

    let endSubTurn = function() {
        subTurnCount += 1;
        if (subTurnCount === 3 || !isAnyAvailableTurn(currentPlayer)) {
            endTurn(false);
        }
    };

    let endTurn = function(isPass) {
        if (lastTurnPass && isPass) {
            endGame(EMPTY); // Draw
        }
        turnCount += 1;
        subTurnCount = 0;
        lastTurnPass = isPass;
        currentPlayer = currentPlayer === X ? O : X;
    };

    let endGame = function(w) {
        endTime = Date.now();
        gameEnded = true;
        winner = w;
        gameEndedCallback(winner);
    };

    let aroundIndexes = function(row, col) {
        let inx = [];
        inx[0] = [row - 1, col - 1];
        inx[1] = [row - 1, col];
        inx[2] = [row - 1, col + 1];
        inx[3] = [row, col - 1];
        inx[4] = [row, col + 1];
        inx[5] = [row + 1, col - 1];
        inx[6] = [row + 1, col];
        inx[7] = [row + 1, col + 1];
        let res = [];
        for (let i = 0; i < 8; i++) {
            if (!(inx[i][0] < 0 || inx[i][0] > 9 || inx[i][1] < 0 || inx[i][1] > 9)) {
                res.push(inx[i]);
            }
        }
        return res;
    };

    this.buildGraph = function(player) {
        let gr = [];
        for (let i = 0; i < 100; i++) {
            gr[i] = [];
            for (let j = 0; j < 100; j++) {
                gr[i][j] = false;
            }
        }
        return buildGraph(player, gr);
    };
    let buildGraph = function(player, graph) {
        let killed = player === X ? O_KILLED : X_KILLED;

        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                if (field[i][j] === player || field[i][j] === killed) {
                    aroundIndexes(i, j).forEach(e => {
                        if (field[e[0]][e[1]] === player || field[e[0]][e[1]] === killed) {
                            let ind1 = i * 10 + j;
                            let ind2 = e[0] * 10 + e[1];
                            graph[ind1][ind2] = true;
                            graph[ind2][ind1] = true;
                        }
                    });
                }
            }
        }
        return graph;
    };

    let findPath = function(graph, start, end) {
        function h(start, end) {
            let startI = start / 10;
            let startJ = start % 10;
            let endI = end / 10;
            let endJ = end % 10;
            return Math.abs(startI - endI) + Math.abs(startJ - endJ);
        }
        let closed = [];
        let open = [start];
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

    let startTime = Date.now();
    let endTime = undefined;
    let winner = EMPTY;
    let gameEnded = false;
    let lastTurnPass = false;
    let currentPlayer = X;
    let turnCount = 0;
    let subTurnCount = 0;
    let xCount = 0;
    let oCount = 0;
    let field = [];
    for (let i = 0; i < 10; i++) {
        field[i] = [];
        for (let j = 0; j < 10; j++) {
            field[i][j] = EMPTY;
        }
    }
    let xGraph = [];
    let oGraph = [];
    for (let i = 0; i < 100; i++) {
        xGraph[i] = [];
        oGraph[i] = [];
        for (let j = 0; j < 100; j++) {
            xGraph[i][j] = false;
            oGraph[i][j] = false;
        }
    }
}

function printGraph(gr, ctx) {
    ctx.clearRect(0, 0, 500, 500);
    let d = 500 / 11;
    for (let i=0;i<10;i++){
        for(let j=0;j<10;j++){
            ctx.beginPath();
            ctx.arc(d * j + d, d * i + d, 4, 0, 2*Math.PI);
            ctx.fill();
            ctx.closePath();
        }
    }
    for(let i=0;i<100;i++) {
        for(let j =i;j<100;j++){
            if (gr[i][j]) {
                let j1 = i % 10;
                let i1 = (i - j1) / 10;
                let j2 = j % 10;
                let i2 = (j - j2) / 10;
                ctx.moveTo( j1*d+d, i1*d+d);
                ctx.lineTo(j2*d+d, i2*d+d);
                ctx.stroke();
                ctx.closePath();
            }
        }
    }
}

// It Works !!! A*
// function findPath(graph, start, end) {
//     function h(start, end) {
//         let startI = start / 10;
//         let startJ = start % 10;
//         let endI = end / 10;
//         let endJ = end % 10;
//         return Math.abs(startI - endI) + Math.abs(startJ - endJ);
//     }
//     let closed = [];
//     let open = [start];
//     let from = {};
//     let g = [];
//     let f = [];
//     g[start] = 0;
//     f[start] = g[start] + h(start, end);
//     while (open.length > 0) {
//         let curr = open[0];
//         if (curr === end)
//             return true;
//         open.splice(open.indexOf(curr), 1);
//         closed.push(curr);
//         let neighbours = [];
//         for (let i = 0; i < 100; i++) {
//             if (graph[curr][i] && closed.indexOf(i) === -1) {
//                 neighbours.push(i);
//             }
//         }
//         neighbours.forEach(elem => {
//             let tmpG = g[curr] + 1;
//             if (open.indexOf(elem) === -1 || tmpG < g[elem]) {
//                 from[elem] = curr;
//                 g[curr] = tmpG;
//                 f[elem] = g[elem] + h(elem, end);
//             }
//             if (open.indexOf(elem) === -1) {
//                 open.push(elem);
//             }
//         });
//     }
//     return false;
// }
//
// function aroundIndexes(row, col) {
//     let inx = [];
//     inx[0] = [row - 1, col - 1];
//     inx[1] = [row - 1, col];
//     inx[2] = [row - 1, col + 1];
//     inx[3] = [row, col - 1];
//     inx[4] = [row, col + 1];
//     inx[5] = [row + 1, col - 1];
//     inx[6] = [row + 1, col];
//     inx[7] = [row + 1, col + 1];
//     let res = [];
//     for (let i = 0; i < 8; i++) {
//         if (!(inx[i][0] < 0 || inx[i][0] > 9 || inx[i][1] < 0 || inx[i][1] > 9)) {
//             res.push(inx[i]);
//         }
//     }
//     return res;
// }
//
// function buildGraph(matrix) {
//     let graph = [];
//     for (let i = 0; i < 100; i++) {
//         graph[i] = [];
//         for (let j = 0; j < 100; j++) {
//             graph[i][j] = false;
//         }
//     }
//
//     for (let i = 0; i < 10; i++) {
//         for (let j = 0; j < 10; j++) {
//             if (matrix[i][j] === 2) {
//                 aroundIndexes(i, j).forEach(e => {
//                     if (matrix[e[0]][e[1]] === 2) {
//                         let ind1 = i * 10 + j;
//                         let ind2 = e[0] * 10 + e[1];
//                         graph[ind1][ind2] = true;
//                         graph[ind2][ind1] = true;
//                     }
//                 });
//             }
//         }
//     }
//     return graph;
// }
