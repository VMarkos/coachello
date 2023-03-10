const N_ROWS = 8;
const N_COLS = 8;

let BOARD; // 0 = empty, 1 = white, -1 = black.
let LEGAL_MOVES; // String array, containing all cell ids that are legal moves.
let TO_BE_FLIPPED; // List of cell ids that should be flipped.
let LAST_MOVE;
let ALL_DIRECTIONS = [
    [1, -1], [1, 0], [1, 1],
    [0, -1], [0, 1],
    [-1, -1], [-1, 0], [-1, 1],
];
let PLAYING = false;
let PAUSED = false;
let EMPTY_CELLS;
let NO_LEGAL_MOVES = false;
let TEMP_BOARD = undefined;
let BLACK = 0; // 0 = human, 1 = Prudens, 2 = Edax.
let WHITE = 1; // 0 = human, 1 = Prudens, 2 = Edax.
let MODE = -1; // -1 = undefined, 0 = playing, 1 = auditing.
let BLACK_TIMEOUT = 500;
let WHITE_TIMEOUT = 500;
let REPLAY_TIMEOUT = 1000;
let ANIMATED = true;
let BULK_GAMES_NUM = 1;
let BULK_GAMES_CURRENT = 0;
let BULK_GAMES = [];
let CURRENT_PLAYER = 1; // 0 = white, 1 = black;

const colTags = ["Date", "Black", "White", "Score", "Winner", "Black Policy", "White Policy"];

const TIMEOUT_IDS = [];

const SCORE = [2, 2];

let gameOverCounter = 0;

let EXPLANATION = {};
let CONTRASTIVE_EXPLANATIONS = [];
let CON_EXP_GROUPS = {"indices": {}, "groups": []};

let EXPLANATION_BORDERS = [];

let CURRENT_GAME = [];
let currentMove;
let canMoveForward = false, canMoveBackward = false;
let highlightedCell = "";
let fromPending = false;

const highlightEvent = new Event("highlight");

const PLAYER_OPTIONS = ["Human", "Prudens"];

let FINALIZED_SETTINGS = false;

let GAME_TO_BE_LOADED = -1;

let savedSession = true;

/* Current Game Structure:
[
    {
        cell: [row, col],
        color: 1|-1,
        board: BOARD,
        legalMoves: LEGAL_MOVES,
        explanation: EXPLANATION,
    },
    ...
]
*/

// TEST_POLICY = `@Knowledge
// RME :: legalMove(X,Y), cell(X+1,Y,-1), cell(X+2,Y,1) implies move(X,Y);`

let POLICIES = [{
        id: "",
        text: "",
        json: {},
    }, {
        id: "",
        text: "",
        json: {},
    }];

// let TEST_POLICY = "";

const TEST_DICT = {
    "D1": "Play any legal move available, resolving ties at random.",
    "D2": "If there is a move to a corner available, then do not play any other move.",
    "D3": "If there is a move to a corner available, then do not play any other move.",
    "C1": "Square at (0,0) is a corner square.",
    "C2": "Square at (0,7) is a corner square.",
    "C3": "Square at (7,0) is a corner square.",
    "C4": "Square at (7,7) is a corner square.",
    "R1": "If there is a legal move to a corner, prefer that move.",
    "R2": "If there is a legal move next to a corner, avoid that move.",
};

const TEST_LITERAL_DICT = {
    "move": (x, y) => {return `move to (${x + 1}, ${y + 1})`;},
};

function initializeBoard(withLegalMoves = true) {
    document.getElementById("blacks").innerText = 2;
    document.getElementById("whites").innerText = 2;
    EMPTY_CELLS = N_ROWS * N_COLS - 4;
    const boardContainer = document.getElementById("board-container");
    let othelloCell, borderCell;
    boardContainer.style.gridTemplateColumns = "repeat(" + (N_COLS + 2) + ", 1fr)";
    BOARD = new Array(N_ROWS);
    for (let i = -1; i < N_ROWS + 1; i++) {
        if (i > -1 && i < N_ROWS) {
            BOARD[i] = [];
        }
        for (let j = -1; j < N_COLS + 1; j++) {
            if (i < 0 || j < 0 || i === N_ROWS || j === N_COLS) {
                borderCell = document.createElement("div");
                borderCell.classList.add("border-cell");
                borderCell.id = "bc|" + i + "|" + j;
                boardContainer.append(borderCell);
            } else {
                BOARD[i].push(0);
                othelloCell = document.createElement("div");
                othelloCell.classList.add("othello-cell");
                othelloCell.id = "oc-" + i + "-" + j;
                boardContainer.append(othelloCell);
            }
        }
    }
    setUpPosition(boardContainer);
    if (withLegalMoves) {
        calculateLegalMoves();
        drawLegalMoves();
    }
}

function drawBoard(board) {
    let cell, piece;
    for (let i = 0; i < N_ROWS; i++) {
        for (let j = 0; j < N_COLS; j++) {
            cell = document.getElementById("oc-" + i + "-" + j);
            for (const child of cell.childNodes) {
                child.remove();
            }
            if (board[i][j] === 1) {
                piece = document.createElement("div");
                piece.classList.add("othello-piece-white");
                cell.append(piece);
            } else if (board[i][j] === -1) {
                piece = document.createElement("div");
                piece.classList.add("othello-piece-black");
                cell.append(piece);
            }
        }
    }
}

function addBlocker(e, params = {blockerStyle: [], id: ""}) {
    const defParams = {
        blockerStyle: [],
        id: "",
    };
    for (const key in defParams) {
        if (params[key] === undefined) {
            params[key] = defParams[key];
        }
    }
    const blocker = document.createElement("div");
    // console.log(e, e.style.position);
    // if (!e.style.position || (e.style.position !== "relative" && e.style.position !== "absolute")) {
    //     e.style.position = "relative";
    // }
    blocker.classList.add("blocker");
    let i = 0;
    while (i < params.blockerStyle.length) {
        blocker.classList.add(params.blockerStyle[i]);
        i++;
    }
    if (params.id) {
        blocker.id = params.id;
    }
    e.append(blocker);
    return blocker;
}

function drawLegalMoves(color = -1, interactive = true, legalMoves = undefined) {
    if (legalMoves === undefined) {
        legalMoves = LEGAL_MOVES;
    }
    let cellContainer, legalMove, coords, row, col;
    let isHumanPlayer;
    for (const cellId of legalMoves) {
        cellContainer = document.getElementById(cellId);
        legalMove = document.createElement("div");
        legalMove.classList.add("legal-moves-black");
        legalMove.addEventListener("mouseup", () => {
            removeExplanationBorders();
            coords = cellId.split("-");
            row = parseInt(coords[1]);
            col = parseInt(coords[2]);
            if (BLACK + WHITE > 0) { // If not both are human players...
                makeDoubleMove(row, col, color);
            } else {
                makeSingleMove(row, col, color);
            }
        });
        isHumanPlayer = (WHITE === 0 && color === 1) || (BLACK === 0 && color === -1);
        // if (WHITE * BLACK === 0 && interactive && MODE === 0 && isHumanPlayer) {
        //     console.log("adding event listeners");
        //     // console.trace();
        //     legalMove.addEventListener("mouseup", () => {
        //         removeExplanationBorders();
        //         coords = cellId.split("-");
        //         row = parseInt(coords[1]);
        //         col = parseInt(coords[2]);
        //         if (BLACK + WHITE > 0) { // If not both are human players...
        //             makeDoubleMove(row, col, color);
        //         } else {
        //             makeSingleMove(row, col, color);
        //         }
        //     });
        // } else {
        //     console.log("Cursor: auto");
        //     console.log(WHITE, BLACK, color);
        //     console.trace();
        //     legalMove.style.cursor = "auto";
        // }
        cellContainer.append(legalMove);
        if (WHITE * BLACK !== 0 || !interactive || MODE !== 0 || !isHumanPlayer) {
            addBlocker(cellContainer, params = {blockerStyle: ["transparent"], id: cellId + "-blocker"});
        }
        // console.log("appended");
    }
}

function eraseLegalMoves() {
    let cellContainer;
    // console.log(LEGAL_MOVES);
    for (const cellId of LEGAL_MOVES) {
        cellContainer = document.getElementById(cellId);
        // console.log("erase cell:", cellContainer);
        if (document.getElementById(cellId + "-blocker")) {
            document.getElementById(cellId + "-blocker").remove();
        }
        while (cellContainer.firstChild) {
            cellContainer.removeChild(cellContainer.lastChild);
        }
    }
}

function flipPieces(cellIds = undefined) {
    let coords, currentPiece, row, col;
    // console.log("TO_BE_FLIPPED:", TO_BE_FLIPPED);
    // console.log("LAST_MOVE:", LAST_MOVE);
    if (cellIds === undefined) {
        cellIds = TO_BE_FLIPPED[LAST_MOVE];
    }
    if (cellIds === undefined) {
        return;
    }
    // console.log("inFlip:", cellIds);
    for (const cellId of cellIds) {
        if (ANIMATED) {
            currentPiece = document.getElementById(cellId).firstChild;
        }
        coords = cellId.split("-");
        row = coords[1];
        col = coords[2];
        if (BOARD[row][col] === -1) {
            if (ANIMATED) {
                currentPiece.classList.remove("othello-piece-black");
                currentPiece.classList.add("othello-piece-white");
            }
            BOARD[row][col] = 1;
        } else {
            if (ANIMATED) {
                currentPiece.classList.remove("othello-piece-white");
                currentPiece.classList.add("othello-piece-black");
            }
            BOARD[row][col] = -1;
        }
    }
}

function setUpPosition() {
    let xc1, xc2, yc1, yc2, cell, piece;
    if (N_ROWS % 2 === 0) {
        xc1 = N_ROWS / 2 - 1;
        xc2 = xc1 + 1;
    } else {
        xc1 = (N_ROWS - 1) / 2;
        xc2 = xc1 + 1;
    }
    if (N_COLS % 2 === 0) {
        yc1 = N_COLS / 2 - 1;
        yc2 = yc1 + 1;
    } else {
        yc1 = (N_COLS - 1) / 2;
        yc2 = yc1 + 1;
    }
    BOARD[xc1][yc1] = 1;
    cell = document.getElementById("oc-" + xc1 + "-" + yc1);
    piece = document.createElement("div");
    piece.classList.add("othello-piece-white");
    cell.append(piece);
    BOARD[xc1][yc2] = -1;
    cell = document.getElementById("oc-" + xc1 + "-" + yc2);
    piece = document.createElement("div");
    piece.classList.add("othello-piece-black");
    cell.append(piece);
    BOARD[xc2][yc1] = -1;
    cell = document.getElementById("oc-" + xc2 + "-" + yc1);
    piece = document.createElement("div");
    piece.classList.add("othello-piece-black");
    cell.append(piece);
    BOARD[xc2][yc2] = 1;
    cell = document.getElementById("oc-" + xc2 + "-" + yc2);
    piece = document.createElement("div");
    piece.classList.add("othello-piece-white");
    cell.append(piece);
}

function calculateLegalMoves(opponent = 1) {
    LEGAL_MOVES = [];
    TO_BE_FLIPPED = {};
    let toBeFlipped, currentCellId;
    for (let i = 0; i < N_ROWS; i++) {
        for (let j = 0; j < N_COLS; j++) {
            currentCellId = "oc-" + i + "-" + j;
            toBeFlipped = [];
            for (const direction of ALL_DIRECTIONS) {
                toBeFlipped.push(...isLegalMoveInDirection(currentCellId, direction[0], direction[1], opponent));
            }
            if (toBeFlipped.length !== 0) {
                LEGAL_MOVES.push(currentCellId);
                TO_BE_FLIPPED[currentCellId] = toBeFlipped;
            }
        }
    }
    // if (LEGAL_MOVES.length === 0 && opponent === 1) {
    //     calculateLegalMoves((-1) * opponent);
    // }
}

function isLegalMoveInDirection(cellId, xStep, yStep, opponent = 1) {
    const coords = cellId.split("-");
    // console.log(cellId);
    const cellX = parseInt(coords[1]);
    const cellY = parseInt(coords[2]);
    const opponentCells = [];
    if (BOARD[cellX][cellY] !== 0) {
        return [];
    }
    let currentX = cellX + xStep, currentY = cellY + yStep, isPreviousWhite = false;
    while (currentX < N_ROWS && currentX >= 0 && currentY < N_COLS && currentY >= 0 && BOARD[currentX][currentY] !== 0) {
        if (isPreviousWhite && BOARD[currentX][currentY] === -opponent) {
            return opponentCells;
        }
        if (!isPreviousWhite) {
            if (BOARD[currentX][currentY] === -opponent) {
                return [];
            }
            isPreviousWhite = true;
        }
        opponentCells.push("oc-" + currentX + "-" + currentY);
        currentX += xStep;
        currentY += yStep;
    }
    return [];
}

function updateGameHistory(row, col, color) {
    const copyBoard = [];
    for (const brow of BOARD) {
        copyBoard.push([...brow]);
    }
    // if (typeof row === "string" || typeof col === "string") {
    //     // console.log(row, col, color);
    // }
    const isPrudensPlayer = (color === 1 && WHITE === 1) || (color === 0 && BLACK === 0);
    // console.log("EXPLANATION:", EXPLANATION);
    // console.log(TO_BE_FLIPPED);
    CURRENT_GAME.push({
        cell: [row, col],
        color: color,
        board: copyBoard,
        legalMoves: [...LEGAL_MOVES],
        toBeFlipped: TO_BE_FLIPPED,
        explanation: isPrudensPlayer ? EXPLANATION : {},
        contrastiveExplanation: isPrudensPlayer ? CONTRASTIVE_EXPLANATIONS : [],
    });
    currentMove = CURRENT_GAME.length;
    canMoveBackward = true;
    if (ANIMATED) {
        appendMoveToGameHistory(row, col, color);
    }
}

function makeSingleMove(row, col, color = -1) {
    savedSession = false;
    CURRENT_PLAYER = (color + 1) / 2;
    // console.log("makeSingleMove:", CURRENT_PLAYER, PLAYING);
    // console.trace();
    if (!PLAYING) {
        // console.log("in");
        PLAYING = true;
        finalizeSettings();
        // const settings = document.getElementById("game-settings-container");
        // settings.style.opacity = 0.6;
        // const blocker = document.createElement("div");
        // blocker.classList.add("blocker");
        // blocker.classList.add("transparent");
        // blocker.classList.add("rounded-corners");
        // settings.append(blocker);
        const saveGameButton = document.getElementById("save-game-button");
        saveGameButton.classList.remove("inactive");
        saveGameButton.addEventListener("click", downloadGame, false);
    }
    updateGameHistory(row, col, color);
    if (ANIMATED) {
        const lastMoveDot = document.getElementById("last-move");
        if (lastMoveDot) {
            lastMoveDot.remove();
        }
        eraseLegalMoves();
        const pieceClass = `othello-piece-${color === 1 ? "white" : "black"}`;
        const cell = document.getElementById("oc-" + row + "-" + col);
        const piece = document.createElement("div");
        const redDot = document.createElement("div");
        redDot.id = "last-move";
        redDot.classList.add("othello-last-move");
        piece.append(redDot);
        piece.classList.add(pieceClass);
        cell.append(piece);
    }
    BOARD[row][col] = color;
    LAST_MOVE = "oc-" + row + "-" + col;
    flipPieces();
    updateScore(color);
    calculateLegalMoves(color);
    // console.log(color, LEGAL_MOVES);
    if (ANIMATED) {
        drawLegalMoves((-1) * color);
    }
    EMPTY_CELLS -= 1;
}

function updateScore(color, blacks = undefined, whites = undefined) {
    // if (ANIMATED) {
    const blacksElement = document.getElementById("blacks");
    const whitesElement = document.getElementById("whites");
    // }
    // console.log(color, blacks, whites);
    let flipped, oldBlacks, oldWhites;
    if (blacks === undefined || whites === undefined) {
        flipped = TO_BE_FLIPPED[LAST_MOVE].length;
        oldBlacks = SCORE[0];
        oldWhites = SCORE[1];
    }
    if (color === 1) {
        if (blacks === undefined || whites === undefined) {
            blacks = oldBlacks - flipped;
            whites = oldWhites + flipped + 1;
        }
        SCORE[0] = blacks;
        SCORE[1] = whites;
        if (ANIMATED) {
            blacksElement.innerText = SCORE[0];
            whitesElement.innerText = SCORE[1];
        }
    } else {
        if (blacks === undefined || whites === undefined) {
            blacks = oldBlacks + flipped +1;
            whites = oldWhites - flipped;
        }
        SCORE[0] = blacks;
        SCORE[1] = whites;
        if (ANIMATED) {
            blacksElement.innerText = SCORE[0];
            whitesElement.innerText = SCORE[1];
        }
    }
}

function updateLastMove(cellId) {
	if (LAST_MOVE) {
        const coords = LAST_MOVE.split("-");
        const row = coords[1];
        const col = coords[2];
        if (BOARD[row][col] === 1) {
            const previousCell = document.getElementById(LAST_MOVE);
            const previousPiece = previousCell.lastChild;
            // console.log("PP:", previousPiece, "last move:", LAST_MOVE);
            // console.log(boardToString(BOARD));
            previousPiece.removeChild(previousPiece.lastChild);
        }
	}
	LAST_MOVE = cellId;
}

function isGameOver() {
    return EMPTY_CELLS === 0 || gameOverCounter === 2;
}

/* Agents */

function randomMove(color = -1, avoided = []) {
    if (LEGAL_MOVES.length === 0) {
        return 0;
    }
	let row, col;
	do {
		row = Math.floor(N_ROWS * Math.random());
		col = Math.floor(N_COLS * Math.random());
	} while (!LEGAL_MOVES.includes("oc-" + row + "-" + col) || avoided.includes("oc-" + row + "-" + col));
	const cellId = "oc-" + row + "-" + col;
    if (ANIMATED) {
        updateLastMove(cellId);
    }
    makeSingleMove(row, col, color);
	if (isGameOver()) {
		return 1;
	}
	return 0;
}

function makeDoubleMove(row, col, color = -1) { // FIXME When the human player has NO LEGAL MOVE, the machine should play automatically!
    if (!FINALIZED_SETTINGS) {
        finalizeSettings();
    }
    if (!PLAYING) {
        PLAYING = true;
        const saveGameButton = document.getElementById("save-game-button");
        saveGameButton.classList.remove("inactive");
        saveGameButton.addEventListener("click", () => {
            // savedSession = true;
            downloadGame();
        }, false);
    }
    if (LEGAL_MOVES.length > 0) {
        // console.log("has legal moves:", color);
        makeSingleMove(row, col, color);
        gameOverCounter = 0;
    } else {
        // console.log("hasn't legal moves:", color);
        updateGameHistory(-1, -1, color);
        calculateLegalMoves(color);
        drawLegalMoves((-1) * color);
        // drawLegalMoves(color);
        gameOverCounter++;
    }
    if (gameOverCounter === 2) {
        return;
    }
    if (LEGAL_MOVES.length > 0) {
        // console.log("Second iteration with LM");
        const timeOut = color === 1 ? BLACK_TIMEOUT : WHITE_TIMEOUT;
        setTimeout(() => {
            const move = prudensMove((-1) * color);
        }, timeOut);
        gameOverCounter = 0;
    } else {
        // console.log("Second iteration without LM");
        updateGameHistory(-1, -1, (-1) * color);
        calculateLegalMoves((-1) * color);
        drawLegalMoves(color);
        gameOverCounter++;
    }
    if (gameOverCounter === 2) {
        return;
    }
}

function prudensAutoplay(color) {
    if (!PLAYING) {
        PLAYING = true;
        const saveGameButton = document.getElementById("save-game-button");
        saveGameButton.classList.remove("inactive");
        saveGameButton.addEventListener("click", () => {
            // savedSession = true;
            downloadGame();
        }, false);
    }
    return new Promise((resolve) => {
        const timeOut = color === 1 ? WHITE_TIMEOUT : BLACK_TIMEOUT;
        TIMEOUT_IDS.push(setTimeout(() => {
            if (LEGAL_MOVES.length > 0) {
                const move = prudensMove(color);
                gameOverCounter = 0;
            } else {
                updateGameHistory(-1, -1, (-1) * color);
                calculateLegalMoves((-1) * color);
                if (ANIMATED) {
                    drawLegalMoves(color);
                }
                gameOverCounter++;
            }
            resolve();
        }, timeOut));
    });
}

function previousMove(casualCall = true, skipPending = false) {
    // if (!PAUSED) {
    //     pauseGame();
    // }
    // console.log("Prev:", currentMove);
    CURRENT_PLAYER = currentMove % 2;
    if (!canMoveForward) {
        canMoveForward = true;
        const stepForward = document.getElementById("step-forward");
        stepForward.classList.remove("inactive");
        stepForward.addEventListener("click", nextMove, false);
        const fastForward = document.getElementById("fast-forward");
        fastForward.classList.remove("inactive");
        fastForward.addEventListener("click", forwardFast, false);
        // const playPause = document.getElementById("play-pause");
        // playPause.classList.remove("inactive");
        // playPause.addEventListener("click", autoplay, false);
    }
    if (!skipPending && !fromPending && currentMove !== 0) {
        fromPending = true;
        goToPendingMove(currentMove);
        return true;
    }
    if (casualCall) {
        disableAdviseButton();
    }
    fromPending = false;
    const lastDot = document.getElementById("last-dot");
    // console.log("608:", lastDot, highlightedCell);
    if (lastDot && casualCall && highlightedCell !== "") {
        lastDot.id = "";
        lastDot.classList.remove("fa-dot-circle-o");
        lastDot.classList.add("fa-circle-o");
        document.getElementById(highlightedCell).classList.remove("highlighted");
        highlightedCell = "";
    }
    currentMove--;
    removeExplanationBorders();
    if (casualCall) {
        updateMoveSpan(1);
    }
    let prevMove, row, col, color;
    const thisMove = CURRENT_GAME[currentMove];
    if (TEMP_BOARD === undefined) {
        TEMP_BOARD = BOARD;
    }
    BOARD = thisMove["board"];
    drawBoard(thisMove["board"]);
    eraseLegalMoves();
    drawLegalMoves(color, false, thisMove["legalMoves"]);
    updateScore(color, ...countStones(thisMove["board"]));
    if (currentMove === 0) {
        canMoveBackward = false;
        const fastBackward = document.getElementById("fast-backward");
        fastBackward.classList.add("inactive");
        fastBackward.removeEventListener("click", backwardFast, false);
        const stepBackward = document.getElementById("step-backward");
        stepBackward.classList.add("inactive");
        stepBackward.removeEventListener("click", previousMove, false);
        return false;
    }
    if (currentMove > 0) {
        prevMove = CURRENT_GAME[currentMove - 1];
        row = prevMove["cell"][0];
        col = prevMove["cell"][1];
        color = prevMove["color"];
        if (row > -1 && col > -1) {
            // console.log("xy:", row, col);
            const cell = document.getElementById("oc-" + row + "-" + col);
            const piece = cell.firstChild;
            const redDot = document.createElement("div");
            redDot.id = "last-move";
            redDot.classList.add("othello-last-move");
            // try {
                piece.append(redDot);
            // } catch (e) {
            //     console.log(boardToString(BOARD));
            // }
        }
    }
    updateScore(color, ...countStones(thisMove["board"]));
    return true;
}

function boardToString(board) {
    let boardString = "";
    for (const row of board) {
        for (const x of row) {
            if (x === 1) {
                boardString += "O ";
            } else if (x === -1) {
                boardString += "* ";
            } else {
                boardString += ". ";
            }
        }
        boardString += "\n";
    }
    return boardString;
}

function countStones(board) {
    let whites = 0, blacks = 0;
    for (let i = 0; i < N_ROWS; i++) {
        for (let j = 0; j < N_COLS; j++) {
            if (board[i][j] === 1) {
                whites++;
            } else if (board[i][j] === -1) {
                blacks++;
            }
        }
    }
    return [blacks, whites];
}

function backwardFast(existsPreviousMove = true, moveCount = CURRENT_GAME.length * 2, cell = undefined, casualCall = true, skipPending = false) {
    // if (!PAUSED) {
    //     pauseGame();
    // }
    if (existsPreviousMove && moveCount > 0) {
        existsPreviousMove = previousMove(casualCall, skipPending);
        moveCount--
        setTimeout(() => {backwardFast(existsPreviousMove, moveCount, cell, casualCall, skipPending);}, 50);
    }
    if (!existsPreviousMove) {
        const fastBackward = document.getElementById("fast-backward");
        fastBackward.removeEventListener("click", backwardFast, false);
    }
    if (cell && moveCount === 0) {
        cell.dispatchEvent(highlightEvent);
    }
}

function disableAdviseButton() {
   // console.log("disable");
    const adviseButton = document.getElementById("advise-button");
    if (adviseButton.classList.contains("inactive")) {
        return;
    }
    adviseButton.classList.add("inactive");
    adviseButton.removeEventListener("click", addPattern, false);
}

function enableAdviseButton() {
    const adviseButton = document.getElementById("advise-button");
   // console.log(adviseButton);
    if (!adviseButton.classList.contains("inactive")) {
       // console.log("return");
        return;
    }
    adviseButton.classList.remove("inactive");
   // console.log(adviseButton.classList);
    adviseButton.addEventListener("click", addPattern, false);
   // console.log("added Event Listener");
}

function nextMove(casualCall = true, skipPending = false) {
    // if (!PAUSED) { // FIXME What does this serve for?
    //     pauseGame();
    // }
    // console.log(currentMove);
    CURRENT_PLAYER = 1 - (currentMove % 2);
    // console.log("cmb:", canMoveBackward);
    if (!canMoveBackward) {
        canMoveBackward = true;
        const stepBackward = document.getElementById("step-backward");
        stepBackward.classList.remove("inactive");
        stepBackward.addEventListener("click", previousMove, false);
        const fastBackward = document.getElementById("fast-backward");
        fastBackward.classList.remove("inactive");
        fastBackward.addEventListener("click", backwardFast, false);
    }
    if (!skipPending && !fromPending && currentMove + 1 !== CURRENT_GAME.length) {
        fromPending = true;
        goToPendingMove(currentMove + 1);
        return true;
    }
    if (casualCall) {
        disableAdviseButton();
    }
    fromPending = false;
    const lastDot = document.getElementById("last-dot");
    if (lastDot && casualCall && highlightedCell !== "") {
        lastDot.id = "";
        lastDot.classList.remove("fa-dot-circle-o");
        lastDot.classList.add("fa-circle-o");
        document.getElementById(highlightedCell).classList.remove("highlighted");
        highlightedCell = "";
    }
    removeExplanationBorders();
    currentMove++;
    // console.log("updateMoveSpan");
    if (casualCall) {
        updateMoveSpan(-1);
    }
    let prevMove, row, col, color;
    prevMove = CURRENT_GAME[currentMove - 1];
    row = prevMove["cell"][0];
    col = prevMove["cell"][1];
    color = prevMove["color"];
    LEGAL_MOVES = prevMove["legalMoves"];
    let value;
    eraseLegalMoves();
    if (currentMove === CURRENT_GAME.length) {
        canMoveForward = false;
        BOARD = TEMP_BOARD;
        TEMP_BOARD = undefined;
        drawBoard(BOARD);
        drawLegalMoves((-1) * color);
        const fastForward = document.getElementById("fast-forward");
        fastForward.classList.add("inactive");
        fastForward.removeEventListener("click", forwardFast, false);
        const stepForward = document.getElementById("step-forward");
        stepForward.classList.add("inactive");
        stepForward.removeEventListener("click", nextMove, false);
        // const playPause = document.getElementById("play-pause");
        // playPause.classList.add("inactive");
        // playPause.removeEventListener("click", autoplay, false);
        value = false;
    } else {
        const thisMove = CURRENT_GAME[currentMove];
        BOARD = thisMove["board"];
        LEGAL_MOVES = thisMove["legalMoves"];
        drawBoard(thisMove["board"]);
        drawLegalMoves(color, false, thisMove["legalMoves"]);
        EXPLANATION = prevMove["explanation"];
        value = true;
    }
    if (row > -1 && col > -1) {
        // console.log(row, col);
        const cell = document.getElementById("oc-" + row + "-" + col);
        // console.log(cell);
        const piece = cell.firstChild;
        // console.log(piece);
        const redDot = document.createElement("div");
        redDot.id = "last-move";
        redDot.classList.add("othello-last-move");
        piece.append(redDot);
    }
    updateScore(color, ...countStones(BOARD));
    return value;
}

function forwardFast(existsNextMove = true, moveCount = CURRENT_GAME.length * 2, cell = undefined, casualCall = true, skipPending = false) {
    // if (!PAUSED) {
    //     pauseGame();
    // }
    if (existsNextMove && moveCount > 0) {
        existsNextMove = nextMove(casualCall, skipPending);
        moveCount--;
        setTimeout(() => {forwardFast(existsNextMove, moveCount, cell, casualCall, skipPending);}, 50);
    }
    if (!existsNextMove) {
        // console.log("in remove:", moveCount);
        const fastForward = document.getElementById("fast-forward");
        fastForward.removeEventListener("click", forwardFast, false);
    }
    if (cell && moveCount === 0) {
        cell.dispatchEvent(highlightEvent);
    }
}

function updateMoveSpan(step) {
    const previousSpan = document.getElementById(`${fromPending && step === -1 ? "pending" : "actual"}-${currentMove + step}`);
    if (previousSpan) {
        previousSpan.classList.remove("last-move-span");
    }
    if (currentMove !== 0) {
        const targetSpan = document.getElementById(`${fromPending && step === -1 ? "pending" : "actual"}-${currentMove}`);
        targetSpan.classList.add("last-move-span");
        if (!utils.frontEnd.intoView(targetSpan, document.getElementById("moves"))) {
            utils.frontEnd.scrollTo(document.getElementById("moves"), -step * 0.7);
        }
    }
}

function appendMoveToGameHistory(row, col, color) {
    // if (MODE === 0) {
    const pendingMoveContainer = document.getElementById(`pending-${color === 1 ? "white" : "black"}-moves`);
    const pendingMove = document.createElement("span");
    pendingMove.classList.add("move-span");
    pendingMove.id = "pending-" + currentMove;
    pendingMove.setAttribute("data-move-number", "" + currentMove);
    if (MODE === 0) {
        pendingMove.classList.add("inactive");
    } else {
        pendingMove.addEventListener("click", goToPendingMove, false);
    }
    const emptyDot = document.createElement("i");
    emptyDot.classList.add("fa");
    emptyDot.classList.add("fa-circle");
    if (color === -1) {
        emptyDot.classList.add("black-dot");
    }
    pendingMove.append(emptyDot);
    pendingMoveContainer.append(pendingMove);
    // }
    // Add the actual move.
    const moveString = translateMove(row, col, color);
    const moveContainer = document.getElementById(`${color === 1 ? "white" : "black"}-moves`);
    const moveSpan = document.createElement("span");
    moveSpan.classList.add("move-span");
    if (MODE === 0) {
        moveSpan.classList.add("inactive");
    } else {
        moveSpan.addEventListener("click", goToMove, false);
    }
    const previousSpan = document.getElementsByClassName("last-move-span")[0];
    if (previousSpan) {
        previousSpan.classList.remove("last-move-span");
        // previousSpan.id = "";
    }
    moveSpan.id = "actual-" + currentMove;
    if (MODE === 0) {
        moveSpan.classList.add("last-move-span");
    }
    moveSpan.innerText = moveString;
    moveSpan.setAttribute("data-move-number", "" + currentMove);
    moveContainer.append(moveSpan);
    moveSpan.scrollIntoView();
    if (color === -1) {
        const moveNumberContainer = document.getElementById("move-numbers");
        const moveNumberSpan = document.createElement("span");
        moveNumberSpan.classList.add("number-span");
        moveNumberSpan.innerText = Math.ceil(currentMove / 2);
        moveNumberContainer.append(moveNumberSpan);
    }
}

function goToPendingMove(event) {
    // console.log("CURRENT_PLAYER:", CURRENT_PLAYER, "WHITE:", WHITE, "BLACK:", BLACK);
    // if ((CURRENT_PLAYER === 0 && WHITE === 1) || (CURRENT_PLAYER === 1 && BLACK === 1)) {
    //     enableAdviseButton();
    // }
    let targetSpan, prevMoveSpan;
    if (typeof event === "number") {
        targetSpan = document.getElementById("pending-" + event);
        prevMoveSpan = document.getElementById("actual-" + (event - 1));
    } else {
        targetSpan = event.currentTarget;
        prevMoveSpan = document.getElementsByClassName("last-move-span")[0];
    }
    if (targetSpan && prevMoveSpan) {
        const step = Math.sign(parseInt(targetSpan.id.split("-")[1]) - parseInt(prevMoveSpan.id.split("-")[1]));
        if (!utils.frontEnd.intoView(targetSpan, document.getElementById("moves"))) {
            utils.frontEnd.scrollTo(document.getElementById("moves"), step * 0.7);
        }
    }
    if (highlightedCell) {
        document.getElementById(highlightedCell).classList.remove("highlighted");
    }
    if (prevMoveSpan) {
        prevMoveSpan.classList.remove("last-move-span");
    }
    const emptyDot = targetSpan.firstChild;
    const lastDot = document.getElementById("last-dot");
    if (lastDot) {
        lastDot.id = "";
        lastDot.classList.remove("fa-dot-circle-o");
        lastDot.classList.add("fa-circle-o");
    }
    emptyDot.id = "last-dot";
    emptyDot.classList.remove("fa-circle-o");
    emptyDot.classList.add("fa-dot-circle-o");
    const moveNumber = parseInt(targetSpan.getAttribute("data-move-number"));
    // Act-deact advise button.
    // console.log("mn:", moveNumber);
    CURRENT_PLAYER = moveNumber % 2;
    if ((CURRENT_PLAYER === 0 && WHITE === 1) || (CURRENT_PLAYER === 1 && BLACK === 1)) {
        enableAdviseButton();
    } else {
        disableAdviseButton();
    }
    // End of act-deact.
    let currentMoveNumber = currentMove;
    // console.log("oc-" + CURRENT_GAME[moveNumber - 1]["cell"].join("-"));
    if (CURRENT_GAME[moveNumber - 1]["cell"][0] < 0 || CURRENT_GAME[moveNumber - 1]["cell"][1] < 0) {
        return;
    }
    const cell = document.getElementById("oc-" + CURRENT_GAME[moveNumber - 1]["cell"].join("-"));
    // console.log("cell:", cell);
    // TODO Check this again!
    cell.classList.add("highlighted");
    highlightedCell = cell.id;
    // Until here
    cell.addEventListener("highlight", (event) => {
        const toBeFlipped = CURRENT_GAME[moveNumber - 1]["toBeFlipped"]["oc-" + CURRENT_GAME[moveNumber - 1]["cell"].join("-")];
        highlightPendingCell(event, toBeFlipped);
        EXPLANATION = CURRENT_GAME[moveNumber - 1]["explanation"];
        CONTRASTIVE_EXPLANATIONS = CURRENT_GAME[moveNumber - 1]["contrastiveExplanation"];
        console.log("EXPLAINING (in highligh listener)");
        console.log("Contrastive:", CONTRASTIVE_EXPLANATIONS);
        console.log("CASUAL:", EXPLANATION);
        explain();
        explainByContrast();
    }, false);
    removeLastDot = false;
    if (moveNumber < currentMoveNumber) {
        // console.log("BF here");
        backwardFast(true, (currentMoveNumber - moveNumber + 1), cell, false, true);
    } else if (moveNumber > currentMoveNumber) {
        // console.log("FF here", moveNumber, currentMoveNumber);
        forwardFast(true, (moveNumber - currentMoveNumber - 1), cell, false, true);
    }
}

function highlightPendingCell(event, toBeFlipped) {
    event.target.classList.add("highlighted");
    event.target.removeEventListener("highlight", highlightPendingCell, false);
    highlightedCell = event.target.id;
    // for (const cellId of toBeFlipped) { // FIXME You are here as well.
    //     document.getElementById(cellId).classList.add("flip-highlighted");
    // }
}

function goToMove(event) {
    const targetSpan = event.currentTarget;
    const moveNumber = parseInt(targetSpan.getAttribute("data-move-number"));
    // const adviseButton = document.getElementById("advise-button");
    // adviseButton.classList.add("inactive");
    // addBlocker(adviseButton, {id: "advise-blocker"});
    let currentMoveNumber = currentMove;
    if (moveNumber < currentMoveNumber) {
        backwardFast(true, (currentMoveNumber - moveNumber), undefined, true, true);
    } else if (moveNumber > currentMoveNumber) {
        forwardFast(true, (moveNumber - currentMoveNumber), undefined, true, true);
    }
}

function changeGameMode() {
    const switchContainer = document.getElementById("mode-switch");
    const ball = document.getElementById("mode-ball");
    if (MODE === 0) {
        switchContainer.classList.add("active");
        ball.classList.add("active");
        MODE = 1;
    } else {
        switchContainer.classList.remove("active");
        ball.classList.remove("active");
        MODE = 0;
    }
}

function translateMove(row, col, color) {
    const iRow = parseInt(row), iCol = parseInt(col);
    if (iRow === -1 || iCol === -1) {
        return "PS";
    }
    const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
    return `${color === -1 ? cols[iCol].toLowerCase() : cols[col]}${iRow + 1}`;
}

function scrollGameHistory() {
    const numbersContainer = document.getElementById("move-numbers");
    const moves = document.getElementById("moves");
    numbersContainer.scrollTop = moves.scrollTop;
}

function resetGameHistory() {
    const blackMoves = document.getElementById("black-moves");
    const whiteMoves = document.getElementById("white-moves");
    const moveNums = document.getElementById("move-numbers");
    const pendingBM = document.getElementById("pending-black-moves");
    const pendingWM = document.getElementById("pending-white-moves");
    blackMoves.innerHTML = "";
    whiteMoves.innerHTML = "";
    pendingBM.innerHTML = "";
    pendingWM.innerHTML = "";
    moveNums.innerHTML = "";
}

// function reset() {
//     PLAYING = false;
//     const board = document.getElementById("board-container");
//     board.innerHTML = "";
//     EXPLANATION = {}; // Is this needed?
//     downloadPolicy();
//     coachedPolicyString = "";
//     currentMove = undefined;
//     resetGameHistory();
//     initializeBoard();
// }

function prudensMove(color = 1) { // Infers all legible moves according to the provided policy and then choses at random (this might need to be changed).
    if (LEGAL_MOVES.length === 0) {
        return 0;
    }
	const outObj = otDeduce();
    const output = outObj["output"];
    if (!output) {
        return randomMove(color);
    }
    const inferences = outObj["inferences"].split(/\s*;\s*/).filter(Boolean);
	const suggestedMoves = [], avoidedMoves = [], avoidedLiterals = [];
    let avoidSplit;
	// console.log("inferences:", inferences);
	for (const literal of inferences) {
        // console.log(literal.trim().substring(0, 5));
		if (literal.trim().substring(0, 5) === "move(") {
			suggestedMoves.push(literal.trim());
		} else if (literal.trim().substring(0, 6) === "-move(") {
            avoidedLiterals.push(literal.trim());
            avoidSplit = literal.trim().split(/[,\(\)]/).filter(Boolean);
            avoidedMoves.push("oc-" + avoidSplit[1].trim() + "-" + avoidSplit[2].trim());
        }
	}
    CONTRASTIVE_EXPLANATIONS = generateContrastiveExplanations(avoidedLiterals, output);
    // console.log("avoidedMoves:", avoidedMoves);
	if (suggestedMoves.length === 0) {
        EXPLANATION = {};
        if (LEGAL_MOVES.length === avoidedMoves.length) {
            return randomMove(color);
        } else {
            return randomMove(color, avoidedMoves);
        }
	}
    const moveLiteral = suggestedMoves.pop().trim();
    // console.log("moveLiteral:", moveLiteral);
    EXPLANATION = generateExplanation(moveLiteral, output);
	const coords = moveLiteral.substring(5, moveLiteral.length - 1).split(",");
	const row = coords[0].trim();
	const col = coords[1].trim();
	const cellId = "oc-" + row + "-" + col;
    if (ANIMATED) {
        updateLastMove(cellId);
    }
    if (TO_BE_FLIPPED[LAST_MOVE] === undefined) {
        EXPLANATION.flipped = [];
    } else {
        EXPLANATION.flipped = [...TO_BE_FLIPPED[LAST_MOVE]];
    }
	if (!LEGAL_MOVES.includes(cellId)) { // Need to throw exception at this point.
		return -1;
	}
	makeSingleMove(row, col, color);
	if (isGameOver()) {
		return 1;
	}
	return 0;
}

function otDeduce() {
    // console.log(CURRENT_PLAYER);
    const kbObject = POLICIES[CURRENT_PLAYER]["json"];
    if (kbObject["type"] === undefined) {
        return {
            output: undefined,
            inferences: "",
        };
    }
    if (kbObject["type"] === "error") {
        return "ERROR: " + kbObject["name"] + ":\n" + kbObject["message"];
    }
    const contextObject = otContextParser();
    if (contextObject["type"] === "error") {
        return "ERROR: " + contextObject["name"] + ":\n" + contextObject["message"];
    }
    const output = forwardChaining(kbObject, contextObject["context"]);
    const inferences = output["facts"];
    // console.log(inferences);
    // console.log("Policy:", POLICIES[CURRENT_PLAYER]["text"]);
    return {
        output: output,
        inferences: contextToString(inferences)
    }
}

function otKbParser() {
  const kbAll = TEST_POLICY;
  return parseKB(kbAll);
}

function otContextParser() {
  const context = extractContext();
//   console.log("Context:", context);
  const contextList = parseContext(context);
  // console.log(contextList);
  return contextList;
}

function extractContext() { // Convert an othello board to a Prudens context.
	let coords, contextString = "";
	for (let row = 0; row < N_ROWS; row++) {
		for (let col = 0; col < N_COLS; col++) {
			contextString += "cell(" + row + "," + col + "," + BOARD[row][col] + ");";
		}
	}
    for (const cellId of LEGAL_MOVES) {
        coords = cellId.split("-");
        contextString += "legalMove(" + coords[1] + "," + coords[2] + ");";
    }
    contextString += `cell(-1,-1,-2);`;
    contextString += `cell(-1,8,-2);`;
    contextString += `cell(8,-1,-2);`;
    contextString += `cell(8,8,-2);`;
    for (const i of [-1, 8]) {
        for (let j = 0; j < 8; j++) {
            contextString += `cell(${i},${j},-2);`;
            contextString += `cell(${j},${i},-2);`;
        }
    }
	return contextString;
}

/* Explanations */

function explain(explanation = EXPLANATION, contrastive = false) {
    let cellId, bodyCell, bodyBorder;
    // console.log("EXPLANATION:", EXPLANATION);
    // if (!alreadyFlipped) {
    //     flipPieces(EXPLANATION["flipped"]);
    //     alreadyFlipped = true;
    // }
    // console.log(EXPLANATION);
    console.log("explanation:", explanation);
    if (explanation.body === undefined) {
        return;
    }
    const groupIndex = CON_EXP_GROUPS["groups"].length;
    for (const cell of explanation.body) {
        if (cell[0] < 0 || cell[1] < 0 || cell[0] === N_ROWS || cell[1] === N_COLS) {
            cellId = "bc|" + cell[0] + "|" + cell[1];
        } else {
            cellId = "oc-" + cell[0] + "-" + cell[1];
        }
        EXPLANATION_BORDERS.push(cellId);
        bodyCell = document.getElementById(cellId);
        bodyBorder = document.createElement("div");
        bodyBorder.id = "bb-" + cell[0] + "-" + cell[1];
        bodyBorder.classList.add("body-cell-explanation");
        bodyCell.append(bodyBorder);
        // Is this correct?
        updateConExpGroups(groupIndex, bodyBorder.id);
        bodyCell.addEventListener("mouseover", groupFlashOn, false);
        bodyCell.addEventListener("mouseout", groupFlashOff, false);
    }
    cellId = "oc-" + explanation.head[0] + "-" + explanation.head[1];
    EXPLANATION_BORDERS.push(cellId);
    bodyCell = document.getElementById(cellId);
    bodyBorder = document.createElement("div");
    bodyBorder.id = "bb-" + explanation.head[0] + "-" + explanation.head[1];
    bodyBorder.classList.add("head-cell-explanation");
    bodyCell.append(bodyBorder);
    // Is this correct?
    updateConExpGroups(groupIndex, bodyBorder.id);
    bodyCell.addEventListener("mouseover", groupFlashOn, false);
    bodyCell.addEventListener("mouseout", groupFlashOff, false);
    if (contrastive) {
        bodyBorder.classList.add("contrastive");// , "cust-diagonal-stripe-3");
    }
}

function updateConExpGroups(index, id) {
    CON_EXP_GROUPS["indices"][id] = index;
    if (CON_EXP_GROUPS["groups"].length === index) {
        CON_EXP_GROUPS["groups"].push([]);
    }
    CON_EXP_GROUPS["groups"][index].push(id);
}

function groupFlashOn(event) {
    // console.log(event.target);
    const id = event.target.parentElement.lastChild.id;
    const group = CON_EXP_GROUPS["groups"][CON_EXP_GROUPS["indices"][id]];
    let item;
    for (const itemId of group) {
        item = document.getElementById(itemId);
        item.classList.add("flash");
    }
}

function groupFlashOff(event) {
    const id = event.target.parentElement.lastChild.id;
    const group = CON_EXP_GROUPS["groups"][CON_EXP_GROUPS["indices"][id]];
    let item;
    for (const itemId of group) {
        item = document.getElementById(itemId);
        item.classList.remove("flash");
    }
}

function explainByContrast() {
    for (const conExp of CONTRASTIVE_EXPLANATIONS) {
        explain(conExp, true);
    }
}

function generateContrastiveExplanations(avoided, output) {
    console.log("avoided:", avoided);
    const conExps = [];
    let conExp;
    for (const literal of avoided) {
        conExp = generateExplanation(literal, output);
        conExps.push(conExp);
    }
    return conExps;
}

function generateExplanation(inference, output) {
    // console.log("genExp:", output);
    const splitInf = inference.split(",");
    const row = parseInt(splitInf[0][splitInf[0].length - 1]);
    const col = parseInt(splitInf[1].trim()[0]);
    const explanation = {body: [], head: [row, col]};
    // console.log("flipped:", flippedPieces);
    const graph = output["graph"];
    const crownRules = graph[inference];
    const rule = crownRules.pop();
    const ruleName = rule.name;
    // const ruleTransforms = RULE_MAP.get(ruleName);
    const rulePoints = RULE_MAP_JSON[CURRENT_PLAYER][ruleName];
    // console.log("rt:", ruleTransforms);
    // console.log("rulePoints:", rulePoints);
    for (const point of rulePoints) {
        explanation.body.push([point[0] + row, point[1] + col]);
    }
    return explanation;
    // console.log("EXPLANTION on generation:", EXPLANATION);
}

function removeExplanationBorders() {
    let cellSplit, coords, borderCell, cell;
    for (const cellId of EXPLANATION_BORDERS) {
        if (cellId[0] === "b") {
            cellSplit = cellId.split("|");
        } else {
            cellSplit = cellId.split("-");
        }
        coords = [parseInt(cellSplit[1]), parseInt(cellSplit[2])];
        borderCell = document.getElementById("bb-" + coords[0] + "-" + coords[1]);
        cell = document.getElementById(cellId);
        cell.removeChild(borderCell);
        cell.removeEventListener("mouseover", groupFlashOn, false);
        cell.removeEventListener("mouseout", groupFlashOff, false);
    }
    EXPLANATION_BORDERS = [];
    if (alreadyFlipped) {
        flipPieces(EXPLANATION["flipped"]);
        alreadyFlipped = false;
    }
}

function showSiblings(id) {
    const element = document.getElementById(id);
    // console.log(element.parentElement.parentElement, element.parentElement.parentElement.classList);
    if (!element.parentElement.classList.contains("active")) {
        element.parentElement.classList.add("active");
    } else {
        element.parentElement.classList.remove("active");
    }
    const children = element.parentElement.children;
    let child;
    for (let i = 1; i < children.length; i++) {
        child = children[i];
        if (child.classList.contains("hidden")) {
            child.classList.remove("hidden");
        } else {
            child.classList.add("hidden");
        }
    }
}

function shadeCell(row, col) {
    // console.log("row:", row, "col:", col);
    // this.row = row;
    // this.col = col;
    const cell = document.getElementById("oc-" + row + "-" + col);
    if (cell.classList.contains("highlighted")) {
        cell.classList.remove("highlighted");
    } else {
        cell.classList.add("highlighted");
    }
}

function setupNavigationButtons() {
    const stepBackward = document.getElementById("step-backward");
    stepBackward.classList.add("inactive");
    const fastBackward = document.getElementById("fast-backward");
    fastBackward.classList.add("inactive");
    const stepForward = document.getElementById("step-forward");
    stepForward.classList.add("inactive");
    const fastForward = document.getElementById("fast-forward");
    fastForward.classList.add("inactive");
}

function setupMode() {
    if (MODE === 0) {
        const addButton = document.getElementById("add-button");
        const whyButton = document.getElementById("why-button");
        addButton.classList.add("inactive");
        whyButton.classList.add("inactive");
        const addBlock = document.createElement("div");
        addBlock.classList.add("specificity-menu-blocker");
        addButton.append(addBlock);
        const whyBlock = document.createElement("div");
        whyBlock.classList.add("specificity-menu-blocker");
        whyButton.append(whyBlock);
    }
}

function prepareGameforDownload() {
    let gameId = `${BLACK === 0 ? "h" : "p"}${WHITE === 0 ? "h" : "p"}_${SCORE[0]}_${SCORE[1]}_${Date.now()}`;
    return {
        gameId: gameId,
        game: CURRENT_GAME,
        policies: [
            preparePolicyForDownload(0),
            preparePolicyForDownload(1),
        ],
        lastBoard: BOARD,
        lastLegalMoves: [...LEGAL_MOVES],
        nRules: N_RULES,
    }
}

function downloadGame() {
    // console.log("download");
    const preparedGame = prepareGameforDownload();
    download(preparedGame["gameId"] + ".json", JSON.stringify(preparedGame, null, 2));
    savedSession = true;
}

function uploadPolicy(files, player) {
    const reader = new FileReader();
    reader.onload = (() => {
        loadPolicy(JSON.parse(reader.result), player);
        // const policyJSON = JSON.parse(reader.result);
        // N_RULES[player] = policyJSON.nRules;
        // console.log(player);
        // POLICIES[player] = {
        //     id: policyJSON.id,
        //     text: policyJSON.policy,
        //     json: parseKB(policyJSON.policy),
        // }
        // RULE_MAP_JSON[player] = policyJSON.ruleMap;
        const policyButton = document.getElementById(`${player === 0 ? "white" : "black"}-policy-button`);
        for (const child of policyButton.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                let filename = files[0].name;
                policyButton.title = filename;
                if (filename.length > 16) {
                    filename = filename.substring(0,4) + "..." + filename.substring(filename.length - 9, filename.length - 5);
                }
                child.textContent = filename;
            }
        }
        loadRuleMap();
    });
    // console.log("here");
    // console.log(this.files);
    reader.readAsText(files[0]);
}

function loadPolicy(policyJSON, player) {
    // const policyJSON = JSON.parse(reader.result);
    // console.log("policyJSON:", policyJSON);
    N_RULES[player] = policyJSON.nRules;
    // console.log(player);
    if (!policyJSON.policy.includes("::")) {
        policyJSON.policy = "";
    }
    POLICIES[player] = {
        id: policyJSON.id,
        text: policyJSON.policy,
        json: parseKB(policyJSON.policy),
    }
    RULE_MAP_JSON[player] = policyJSON.ruleMap;
}

function loadGameHistory() {
    let cell, color;
    // console.log(CURRENT_GAME.length);
    currentMove = 0
    for (const move of CURRENT_GAME) {
        currentMove++;
        cell = move["cell"];
        color = move["color"];
        appendMoveToGameHistory(...cell, color);
    }
    // backwardFast();
    BOARD = TEMP_BOARD;
    PLAYING = false;
    const board = document.getElementById("board-container");
    board.innerHTML = "";
    coachedPolicyString = "";
    initializeBoard(false);
    drawLegalMoves(-1, true, ["oc-2-3", "oc-3-2", "oc-4-5", "oc-5-4"]);
    const previousSpan = document.getElementsByClassName("last-move-span")[0];
    if (previousSpan) {
        previousSpan.classList.remove("last-move-span");
    }
    canMoveForward = true;
    currentMove = 0;
    const stepForward = document.getElementById("step-forward");
    stepForward.classList.remove("inactive");
    stepForward.addEventListener("click", nextMove, false);
    const fastForward = document.getElementById("fast-forward");
    fastForward.classList.remove("inactive");
    fastForward.addEventListener("click", forwardFast, false);
    // const playPause = document.getElementById("play-pause");
    // playPause.classList.remove("inactive");
    // playPause.addEventListener("click", autoplay, false);
    document.getElementById("moves").scrollTo(0, 0);
}

function autoplay(event, existsMove = true, firstPress = true) {
    // if (PAUSED) {
    //     return;
    // }
    REPLAY_TIMEOUT = parseInt(document.getElementById("delay").value);
    // const playPause = document.getElementById("play-pause");
    const playPause = event.target;
    // console.log(existsMove, firstPress);
    // console.trace();
    if (firstPress) {
        playPause.removeEventListener("click", autoplay, false);
        for (const child of playPause.children) {
            // console.log("removed:", child);
            child.remove();
        }
        const pause = document.createElement("i");
        pause.classList.add("fa");
        pause.classList.add("fa-pause");
        playPause.append(pause);
        // console.log("Pause:", pause);
        // console.log("PAUSED:", PAUSED);
        playPause.addEventListener("click", pauseGame, false);
        // console.log(playPause);
    }
    // console.log("existsMove:", existsMove, "PAUSED:", PAUSED);
    if (existsMove && !PAUSED) {
        existsMove = nextMove();
        setTimeout(() => { autoplay(event, existsMove, false); }, REPLAY_TIMEOUT);
        // console.log("not first press", existsMove);
    } else {
        for (const child of playPause.children) {
            child.remove();
        }
        const play = document.createElement("i");
        play.classList.add("fa");
        play.classList.add("fa-play");
        playPause.append(play);
        if (PAUSED) {
            // console.log("PAUSED");
            PAUSED = false;
            playPause.removeEventListener("click", pauseGame, false);
            playPause.addEventListener("click", autoplay, false);
        }
    }
}

function pauseGame() {
    // console.log("Pause game!");
    // console.trace();
    PAUSED = true;
}

function stringToId(string) {
    string = string.toLowerCase();
    return string.replace(/[^\w]/g, "-");
}

function loadGame(gameJSON, filename) {
    if (gameJSON["bulkId"] && gameJSON["bulkId"].substring(0, 4) === "bulk") {
        loadGameList(gameJSON["bulk"], filename);
    } else {
        loadSingleGame(gameJSON, filename);
    }
}

function loadGameList(gameJSON, filename) {
    const blocker = addBlocker(document.body, {blockerStyle: ["top", "blurry"], id: "gl-blocker"});
    const modal = document.createElement("div");
    modal.classList.add("bulk-modal-container");
    modal.id = "gl-modal";
    const glContainer = document.createElement("div");
    glContainer.classList.add("game-list-container");
    let game, gameId, splitId;
    let col, tag, header, entry, bs, ws, tooltip;
    const cols = [];
    for (let i = 0; i < colTags.length; i++) {
        tag = colTags[i];
        col = document.createElement("div");
        col.id = stringToId(tag) + "-col";
        col.classList.add("game-list-column");
        header = document.createElement("div");
        header.classList.add("game-list-entry", "header");
        if (i > 0) {
            header.classList.add("pad-left");
        }
        header.id = stringToId(tag) + "-header";
        header.innerText = tag;
        col.append(header);
        glContainer.append(col);
        cols.push(col);
    }
    for (let i = 0; i < gameJSON.length; i++) {
        game = gameJSON[i];
        gameId = game["gameId"];
        splitId = gameId.split("_");
        for (let j = 0; j < colTags.length; j++) {
            entry = document.createElement("div");
            entry.classList.add("game-list-entry", `${i % 2 === 0 ? "even" : "odd"}`);
            entry.id = stringToId(colTags[j]) + "-" + i;
            // console.log(entry.id);
            if (j > 0) {
                entry.classList.add("pad-left");
            }
            bs = parseInt(splitId[1]);
            ws = parseInt(splitId[2]);
            if (j === 0) {
                entry.append(parseDate(new Date(parseInt(splitId[3]))));
            } else if (j === 1 || j === 2) {
                entry.append(`${gameId[j - 1] === "h" ? "Human" : "Prudens"}`);
            } else if (j === 3) {
                entry.innerText = bs + "-" + ws;
            } else if (j === 4) {
                if (bs > ws) {
                    entry.innerText = "Black";
                } else if (bs === ws) {
                    entry.innerText = "Tie";
                } else {
                    entry.innerText = "White";
                }
            } else if (j === 5 || j === 6) {
                tooltip = game["policies"][6 - j]["id"] ? game["policies"][6 - j]["id"] : "random";
                entry.innerText = `${gameId[j - 5] === "h" ? "(default)" : shortenString(tooltip, 16, 4)}`;
                entry.title = tooltip;
            }
            entry.addEventListener("mouseover", highlightEntry, false);
            entry.addEventListener("mouseout", unhighlightEntry, false);
            entry.addEventListener("click", (event) => {
                const entry = event.currentTarget;
                const sid = entry.id.split("-");
                const index = parseInt(sid[sid.length - 1]);
                if (GAME_TO_BE_LOADED > -1) {
                    let prevEntry;
                    for (const tag of colTags) {
                        prevEntry = document.getElementById(stringToId(tag) + "-" + GAME_TO_BE_LOADED);
                        prevEntry.classList.remove("highlighted");
                        prevEntry.addEventListener("mouseout", unhighlightEntry, false);
                    }
                }
                GAME_TO_BE_LOADED = index;
                let thisEntry;
                for (const tag of colTags) {
                    thisEntry = document.getElementById(stringToId(tag) + "-" + index);
                    thisEntry.removeEventListener("mouseout", unhighlightEntry, false);
                }
            }, false);
            entry.addEventListener("dblclick", (event) => {
                const entry = event.currentTarget;
                const sid = entry.id.split("-");
                const index = parseInt(sid[sid.length - 1]);
                GAME_TO_BE_LOADED = index; // This might not be needed...
                loadSingleGame(gameJSON[GAME_TO_BE_LOADED], filename).then(() => {
                    hideGameList();
                });
            }, false);
            cols[j].append(entry);
        }
    }
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("foot-button-container");
    const loadButton = document.createElement("div");
    loadButton.classList.add("init-button", "play");
    loadButton.innerText = "Load";
    loadButton.addEventListener("click", () => {
        if (GAME_TO_BE_LOADED === -1) {
            hideGameList();
            return;
        }
        loadSingleGame(gameJSON[GAME_TO_BE_LOADED], filename).then(() => {
            hideGameList(); 
        });
        return;
    }, false)
    const cancelButton = document.createElement("div");
    cancelButton.classList.add("init-button", "cancel");
    cancelButton.innerText = "Cancel";
    cancelButton.addEventListener("click", hideGameList, false);
    buttonContainer.append(cancelButton);
    buttonContainer.append(loadButton);
    modal.append(glContainer);
    modal.append(buttonContainer);
    blocker.append(modal);
    setTimeout(() => {
        modal.style.top = "50%";
    }, 0);
}

function highlightEntry(event) {
    const entry = event.currentTarget;
    const sid = entry.id.split("-");
    const index = parseInt(sid[sid.length - 1]);
    for (const tag of colTags) {
        document.getElementById(stringToId(tag) + "-" + index).classList.add("highlighted");
    }
}

function unhighlightEntry(event) {
    const entry = event.currentTarget;
    const sid = entry.id.split("-");
    const index = parseInt(sid[sid.length - 1]);
    for (const tag of colTags) {
        document.getElementById(stringToId(tag) + "-" + index).classList.remove("highlighted");
    }
}

function hideGameList() {
    const blocker = document.getElementById("gl-blocker");
    const modal = document.getElementById("gl-modal");
    modal.style.top = "-100%";
    setTimeout(() => {
        modal.remove();
        blocker.remove();
    }, 200);
}

function loadSingleGame(gameJSON, filename) {
    return new Promise((resolve, reject) => {
        let policyJSON, downIcon;
        const gameId = gameJSON["gameId"];
        const blackType = document.getElementById("black-type");
        const whiteType = document.getElementById("white-type");
        const blackPB = document.getElementById("black-policy-button");
        const whitePB = document.getElementById("white-policy-button");
        const time = parseInt(gameId.split("_")[3]);
        blackType.innerText = `${gameId[0] === "h" ? "Human" : "Prudens"}`;
        BLACK = (gameId[0] === "h") ? 0 : 1;
        WHITE = (gameId[1] === "h") ? 0 : 1;
        blackPB.innerText = shortenString(`${gameJSON["policies"][1]["id"] ? gameJSON["policies"][1]["id"] : "(default)"}`, 12, 4);
        if (gameId[0] === "p") {
            // downIcon = document.createElement("i");
            // downIcon.classList.add("fa", "fa-download");
            // blackPB.append(downIcon);
            document.getElementById("black-download-policy-blocker").remove();
            const blackDown = document.getElementById("black-download-policy");
            blackDown.classList.remove("inactive");
            blackDown.addEventListener("click", () => {
                downloadPolicy(1);
            }, false);
        }
        whiteType.innerText = `${gameId[1] === "h" ? "Human" : "Prudens"}`;
        whitePB.innerText = shortenString(`${gameJSON["policies"][0]["id"] ? gameJSON["policies"][0]["id"] : "(default)"}`, 12, 4);
        if (gameId[1] === "p") {
            // downIcon = document.createElement("i");
            // downIcon.classList.add("fa", "fa-download");
            // whitePB.append(downIcon);
            document.getElementById("white-download-policy-blocker").remove();
            const whiteDown = document.getElementById("white-download-policy");
            whiteDown.classList.remove("inactive");
            whiteDown.addEventListener("click", () => {
                downloadPolicy(0);
            }, false);
        }
        CURRENT_GAME = gameJSON.game;
        TEMP_BOARD = gameJSON.lastBoard;
        LEGAL_MOVES = gameJSON.lastLegalMoves;
        loadGameHistory();
        policyJSON = gameJSON.policies;
        loadPolicy(policyJSON[0], 0);
        loadPolicy(policyJSON[1], 1);
        // N_RULES = [policyJSON[0].nRules, policyJSON[1].nRules];
        // console.log("Load:", policyJSON);
        // console.log(policyJSON);
        // POLICIES = policyJSON;
        // RULE_MAP_JSON = [policyJSON[0].ruleMap, policyJSON[1].ruleMap];
        loadRuleMap();
        const loadGameButton = document.getElementById("game-upload-button");
        for (const child of loadGameButton.childNodes) {
            if (filename.length > 16) {
                filename = filename.substring(0, 4) + "..." + filename.substring(filename.length - 9, filename.length - 5);
            }
            if (child.nodeType === Node.TEXT_NODE) {
                child.textContent = filename;
            }
        }
        const gameDate = document.getElementById("game-date");
        const date = new Date(time);
        gameDate.innerText = "";
        gameDate.append(parseDate(date));
        // document.getElementById("advise-button").classList.remove("inactive");
        // if (document.getElementById("advise-button-blocker")) {
        //     document.getElementById("advise-button-blocker").remove();
        // }
        savedSession = true;
        resolve();
    })
}

function shortenString(string, n, m, suffix = 5) {
    if (string.length > n) {
        string = string.substring(0, m) + "..." + string.substring(string.length - suffix - m, string.length - suffix);
    }
    return string;
}

function parseDate(date) {
    const digitize = (x, n = 2) => {
        return ("" + x).length < n ? "0".repeat(n - ("" + x).length) + x : x;
    };
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const ms = document.createElement("span");
    ms.classList.add("ms-container");
    ms.innerText = digitize(date.getMilliseconds(), 3);
    const dateContainer = document.createElement("span");
    dateContainer.append(date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear() + ", " + digitize(date.getHours()) + ":" + digitize(date.getMinutes()) + ":" + digitize(date.getSeconds()) + ":");
    dateContainer.append(ms);
    return dateContainer;
}

function showCM(event) {
    event.target.style.zIndex = 101;
    // let settings = "game-settings";
    // console.log(event.target.id);
    // if (event.target.id[0] === "a") {
    //     settings = "audit";
    // }
    const gBlocker = addBlocker(document.getElementById("game-container"), {blockerStyle: ["transparent", "top"], id: "game-blocker"});
    const rBlocker = addBlocker(document.getElementsByClassName("show-play-mode")[0], {blockerStyle: ["transparent", "top"], id: "game-settings-blocker"});
    const fBlocker = addBlocker(document.getElementById("help-container"), {blockerStyle: ["transparent", "top"], id: "help-blocker"});
    const aBlocker = addBlocker(document.getElementById("init-buttons-container"), {blockerStyle: ["transparent", "top"], id: "audit-blocker"});
    // console.log(aBlocker);
    const rect = event.target.getBoundingClientRect();
    const messageBox = document.createElement("div");
    messageBox.classList.add("message-box");
    messageBox.id = "message-box";
    messageBox.innerText = "Session not saved.\nClick again to confirm.";
    messageBox.style.top = rect.bottom + "px";
    messageBox.style.left = rect.left + "px";
    document.body.append(messageBox);
    document.body.addEventListener("click", removeCM, true);
}

function removeCM(event) {
    // console.log("removeCM");
    // console.trace();
    // debugger;
    document.getElementById("message-box").remove();
    document.getElementById("game-blocker").remove();
    document.getElementById("game-settings-blocker").remove();
    document.getElementById("help-blocker").remove();
    document.getElementById("audit-blocker").remove();
    // alreadyClicked = false;
    let isAudit = false;
    if (event.target.id.split("-")[1] === "button") {
        isAudit = event.target.id[0] === "a";
        event.target.removeEventListener("click", isAudit ? enterAuditMode : enterPlayMode, false);
        event.target.style.zIndex = 3;
        // console.log("button press");
        if (MODE === 1 && event.target.id[0] === "p") {
            MODE = 0;
            resetGame();
            const auditContainer = document.getElementById("audit-container");
            auditContainer.style.top = "-100vh";
            setTimeout(() => {
                auditContainer.remove();
            }, 250);
            showPlayModeSettings();
        } else if (MODE === 1 && isAudit) {
            resetAudit();
        } else if (MODE === 0 && isAudit) {
            MODE = 1;
            resetGame();
            const gameContainer = document.getElementById("play-game-container");
            gameContainer.style.top = "-100vh";
            setTimeout(() => {
                gameContainer.remove();
            }, 250);
            showAuditModeSettings();
        }
        else {
            resetGame();
        }
        setTimeout(() => {
            event.target.addEventListener("click", isAudit ? enterAuditMode : enterPlayMode, false);
        }, 0);
    }
    document.body.removeEventListener("click", removeCM, true);
}

function enterPlayMode(event) {
    // console.log("enterPlayMode");
    // console.trace();
    if (MODE === -1) {
        MODE = 0;
        const initButtonsContainer = document.getElementById("init-buttons-container");
        initButtonsContainer.style.transform = "translate(-50%, 0)";
        initButtonsContainer.style.top = "0";
        showPlayModeSettings();
        eraseLegalMoves();
        drawLegalMoves();
    } else if (MODE === 0) {
        if (!savedSession) {
            showCM(event);
        } else {
            resetGame();
        }
    } else if (MODE === 1) {
        // const isNonEmpty = coachedPolicyStrings[0] !== "" && coachedPolicyStrings[1] !== "";
        // const audit = confirm(`${isNonEmpty ? "Save policy and s" : "S"}tart a new game?`);
        if (!savedSession) {
            showCM(event);
        } else {
            MODE = 0;
            resetGame();
            const auditContainer = document.getElementById("audit-container");
            auditContainer.style.top = "-100vh";
            setTimeout(() => {
                auditContainer.remove();
            }, 250);
            showPlayModeSettings();
        }
    }
}

function resetGame() {
    PLAYING = false;
    savedSession = true;
    for (const timeoutId of TIMEOUT_IDS) {
        clearTimeout(timeoutId);
    }
    const gameSettingsContainer = document.getElementById("game-settings-container");
    if (gameSettingsContainer) {
        // gameSettingsContainer.style.opacity = 1.0;
        for (const child of gameSettingsContainer.childNodes) {
            if (child.classList.contains("blocker")) {
                child.remove();
            }
        }
        const doneButton = document.getElementById("done-button");
        if (doneButton.firstChild.classList.contains("fa-refresh")) {
            doneButton.firstChild.classList.remove("fa-refresh");
            doneButton.firstChild.classList.add("fa-check");
            doneButton.removeEventListener("click", resetSettings, false);
            doneButton.addEventListener("click", finalizeSettings, false);
            FINALIZED_SETTINGS = false;
        }
    }
    const board = document.getElementById("board-container");
    board.innerHTML = "";
    currentMove = undefined;
    CURRENT_GAME = [];
    SCORE[0] = 2;
    SCORE[1] = 2;
    resetGameHistory();
    // console.log("here");
    initializeBoard();
}

function resetSettings() {
    const reSettings = confirm("Save game and reset?");
    if (reSettings) {
        downloadGame();
        resetGame();
        // const doneButton = document.getElementById("done-button");
        // doneButton.removeEventListener("click", resetSettings, false);
        // doneButton.addEventListener("click", finalizeSettings, false);
        // FINALIZED_SETTINGS = false;
        // doneButton.firstChild.classList.remove("fa-refresh");
        // doneButton.firstChild.classList.add("fa-check");
    }
}

function finalizeSettings() { // TODO Add event so as to track whether settings have changed and ask user to restart game, save etc.
    // TODO (cont'd) You need to generate a SETTINGS object where you store all settings, like, who plays, what type of player, type particulars etc.
    // console.log("finalize?");
    // console.trace();
    ANIMATED = document.getElementById("animate").checked;
    if (!FINALIZED_SETTINGS) {
        if (ANIMATED) {
            const settings = document.getElementById("game-settings-container");
            const blocker = document.createElement("div");
            blocker.classList.add("blocker", "rounded-corners");
            blocker.id = "settings-blocker";
            settings.append(blocker);
            const doneButton = document.getElementById("done-button");
            doneButton.firstChild.classList.remove("fa-check");
            doneButton.firstChild.classList.add("fa-refresh");
            doneButton.removeEventListener("click", finalizeSettings, false);
            doneButton.addEventListener("click", resetSettings, false);
            FINALIZED_SETTINGS = true;
        }
        // FINALIZED_SETTINGS = true;
        updateSettings();
    } else {
        const blocker = document.getElementById("settings-blocker");
        if (blocker) {
            blocker.remove();
        }
        const doneButton = document.getElementById("done-button");
        doneButton.firstChild.classList.remove("fa-refresh");
        doneButton.firstChild.classList.add("fa-check");
        FINALIZED_SETTINGS = false;
        // console.log("finalized settings");
    }
}

function updateSettings() {
    if (WHITE === 1) {
        WHITE_TIMEOUT = parseInt(document.getElementById("white-timeout-input").value);
    }
    if (BLACK === 1) {
        BLACK_TIMEOUT = parseInt(document.getElementById("black-timeout-input").value);
    }
    if (BLACK === 1 && WHITE === 0) {
        if (!PLAYING) {
            // PLAYING = true;
            prudensMove(-1);
        }
    } else if (BLACK === 1 && WHITE === 1) {
        BULK_GAMES_NUM = parseInt(document.getElementById("games-num").value);
        if (!ANIMATED) {
            WHITE_TIMEOUT = 0;
            BLACK_TIMEOUT = 0;
            showGameProgress();
        }
        gameLoop(-1, 0);
    }
}

function updateProgressCount() {
    const progressCount = document.getElementById("progress-count");
    if (progressCount) {
        progressCount.innerText = BULK_GAMES_CURRENT + " / " + BULK_GAMES_NUM;
    }
}

function gameLoop(color, i) {
    return new Promise((resolve, reject) => {
        BULK_GAMES_CURRENT = i;
        if (i >= BULK_GAMES_NUM) {
            const bulkId = `bulk${WHITE === 0 ? "h" : "p"}${BLACK === 0 ? "h" : "p"}${BULK_GAMES_NUM}_${Date.now()}`;
            download(bulkId + ".json", JSON.stringify({
                bulkId: bulkId,
                bulk: BULK_GAMES,
            }));
            const doneButton = document.getElementById("done-button");
            doneButton.removeEventListener("click", resetSettings, false);
            doneButton.addEventListener("click", finalizeSettings, false);
            BULK_GAMES = [];
            if (document.getElementById("progress-bar-blocker")) {
                document.getElementById("progress-bar-blocker").remove();
            }
            resolve();
            return;
        }
        if (isGameOver()) {
            document.getElementById("blacks").innerText = SCORE[0];
            document.getElementById("whites").innerText = SCORE[1];
            BULK_GAMES.push(prepareGameforDownload());
            gameOverCounter = 0;
            resetGame();
            updateProgressCount();
            resolve(true);
            return;
        }
        prudensAutoplay(color).then(() => {
            gameLoop((-1) * color, i).then((gameOver) => {
                if (gameOver) {
                    gameLoop(-1, i + 1);
                }
            });
        });
        return;
    });
}

function showGameProgress() {
    const blocker = document.createElement("div");
    blocker.classList.add("blocker", "blurry", "top", "flexy");
    blocker.id = "progress-bar-blocker";
    document.body.append(blocker);
    const pbContainer = document.createElement("div");
    pbContainer.classList.add("progress-bar-container");
    const progressCount = document.createElement("div");
    progressCount.classList.add("progress-count");
    progressCount.innerText = "0 / " + BULK_GAMES_NUM;
    progressCount.id = "progress-count";
    const progressBar = document.createElement("div");
    progressBar.classList.add("progress-bar");
    progressBar.id = "progress-bar";
    pbContainer.append(progressBar);
    const progressContainer = document.createElement("div");
    progressContainer.classList.add("progress-container");
    progressContainer.append(progressCount);
    progressContainer.append(pbContainer)
    blocker.append(progressContainer);
    updateProgressBar();
}

function updateProgressBar() {
    const pbWidth = Math.ceil((((60 - EMPTY_CELLS) / 60 + BULK_GAMES_CURRENT) / BULK_GAMES_NUM) * 600);
    const pb = document.getElementById("progress-bar");
    // console.log(pb.offsetWidth);
    if (pb && EMPTY_CELLS > 0) {
        setTimeout(() => {
            pb.style.width = pbWidth + "px";
            // console.log(pbWidth);
            updateProgressBar();
        }, 2);
    }
}

function showPlayModeSettings() {
    const rightMenuContainer = document.getElementById("right-menu-container");
    const gameSettingsContainer = document.createElement("div");
    gameSettingsContainer.classList.add("game-settings-container");
    gameSettingsContainer.id = "game-settings-container";
    const blackSettings = setupPlayerSettings("black");
    const whiteSettings = setupPlayerSettings("white", {right: true});
    gameSettingsContainer.append(blackSettings);
    gameSettingsContainer.append(whiteSettings);
    const doneButtonContainer = document.createElement("div");
    doneButtonContainer.classList.add("game-settings-done");
    const pvpContainer = document.createElement("div");
    pvpContainer.classList.add("pvp-settings-container", "inactive");
    pvpContainer.id = "pvp-settings-container";
    const animateContainer = document.createElement("div");
    animateContainer.classList.add("animate-container");
    animateContainer.id = "animate-container";
    const animateLabel = document.createElement("label");
    animateLabel.for = "animate";
    animateLabel.append(document.createTextNode("Animate Moves"));
    animateLabel.addEventListener("click", () => {
        // console.log("asdsaad");
        // if (!animateCheckbox.checked) {
        //     console.log("here");
        //     const blackTimeout = document.getElementById("black-timeout-container");
        //     const blackBlocker = addBlocker(blackTimeout, {blockerStyle: "top", id: "black-timeout-blocker"});
        //     const whiteTimeout = document.getElementById("white-timeout-container");
        //     const whiteBlocker = addBlocker(whiteTimeout, {id: "white-timeout-blocker"});
        // }
        animateCheckbox.click();
    }, false);
    const animateCheckbox = document.createElement("input");
    animateCheckbox.type = "checkbox";
    animateCheckbox.id = "animate";
    animateCheckbox.name = "animate";
    animateCheckbox.checked = true;
    animateCheckbox.addEventListener("click", (event) => {
        const blackTimeout = document.getElementById("black-timeout-input");
        const whiteTimeout = document.getElementById("white-timeout-input");
        if (!animateCheckbox.checked) {
            blackTimeout.classList.add("inactive");
            blackTimeout.readOnly = true;
            whiteTimeout.classList.add("inactive");
            whiteTimeout.readOnly = true;
        } else {
            blackTimeout.classList.remove("inactive");
            blackTimeout.readOnly = false;
            whiteTimeout.classList.remove("inactive");
            whiteTimeout.readOnly = false;
        }
        // event.target.click();
    }, false);
    animateContainer.append(animateCheckbox);
    animateContainer.append(animateLabel);
    pvpContainer.append(animateContainer);
    const gamesNumContainer = document.createElement("div");
    const gamesNumLabel = document.createElement("label");
    const gamesNumInput = document.createElement("input");
    gamesNumContainer.classList.add("games-number-container");
    gamesNumLabel.for = "games-num";
    gamesNumLabel.append(document.createTextNode("# Games:"));
    gamesNumInput.type = "text";
    gamesNumInput.id = "games-num";
    gamesNumInput.name = "games-num";
    gamesNumInput.minLength = 1;
    gamesNumInput.maxLength = 6;
    gamesNumInput.size = 8;
    gamesNumInput.value = "1";
    gamesNumContainer.append(gamesNumLabel);
    gamesNumContainer.append(gamesNumInput);
    pvpContainer.append(gamesNumContainer);
    const animateBlocker = document.createElement("div");
    animateBlocker.classList.add("blocker", "transparent");
    animateBlocker.id = "animate-blocker";
    pvpContainer.append(animateBlocker);
    const doneButton = document.createElement("div");
    doneButton.classList.add("policy-upload-button", "finalize-settings-button");
    doneButton.addEventListener("click", finalizeSettings, false);
    const doneIcon = document.createElement("i");
    doneIcon.classList.add("fa", "fa-check");
    doneButton.id = "done-button";
    doneButton.append(doneIcon);
    doneButtonContainer.append(pvpContainer);
    doneButtonContainer.append(doneButton);
    gameSettingsContainer.append(doneButtonContainer);
    const gh = getGameHistory();
    const saveGame = getSaveGameButton();
    const gameNavContainer = document.createElement("div");
    gameNavContainer.classList.add("game-navigation-container");
    gameNavContainer.append(saveGame);
    gameNavContainer.append(gh);
    // const gNav = generateGameNav();
    const hiddenDownContainer = document.createElement("div");
    hiddenDownContainer.classList.add("show-play-mode");
    hiddenDownContainer.id = "play-game-container";
    hiddenDownContainer.append(gameSettingsContainer);
    hiddenDownContainer.append(gameNavContainer);
    // hiddenDownContainer.append(gNav);
    rightMenuContainer.append(hiddenDownContainer);
    setTimeout(() => {
    	hiddenDownContainer.style.top = "80px";
    }, 10);
//	hiddenDownContainer.style.transform = "none";
}

function getSaveGameButton() {
    const container = document.createElement("div");
    container.classList.add("game-up-down-load-container");
    const button = document.createElement("div");
    button.classList.add("game-load-container", "inactive");
    // button.addEventListener("click", downloadGame, false);
    button.append(document.createTextNode("Save Game "));
    button.id = "save-game-button";
    const icon = document.createElement("i");
    icon.classList.add("fa");
    icon.classList.add("fa-download");
    button.append(icon);
    container.append(button);
    return container;
}

function getGameHistory(isAudit = false) {
	const gameHistoryContainer = document.createElement("div");
	gameHistoryContainer.classList.add("game-history-container");
	const moveNumContainer = document.createElement("div");
	moveNumContainer.classList.add("move-number-container");
	const movesContainer = document.createElement("div");
	movesContainer.classList.add("moves-container");
    if (isAudit) {
        moveNumContainer.classList.add("audit");
        movesContainer.classList.add("audit");
    }
	const pendingBM = document.createElement("div");
	const bm = document.createElement("div");
	const pendingWM = document.createElement("div");
	const wm = document.createElement("div");
	moveNumContainer.id = "move-numbers";
	movesContainer.id = "moves";
    movesContainer.addEventListener("scroll", scrollGameHistory, false);
	pendingBM.classList.add("moves-col");
	pendingBM.id = "pending-black-moves";
	bm.classList.add("moves-col");
	bm.id = "black-moves";
	pendingWM.classList.add("moves-col");
	pendingWM.id = "pending-white-moves";
	wm.classList.add("moves-col");
	wm.id = "white-moves";
	movesContainer.append(pendingBM);
	movesContainer.append(bm);
	movesContainer.append(pendingWM);
	movesContainer.append(wm);
	gameHistoryContainer.append(moveNumContainer);
	gameHistoryContainer.append(movesContainer);
	return gameHistoryContainer;
}

function generateGameNav() {
	const navContainer = document.createElement("div");
	navContainer.classList.add("game-navbar-container");
	// const items = ["fast-backward", "step-backward", "play", "step-forward", "fast-forward"];
    const items = ["fast-backward", "step-backward", "step-forward", "fast-forward"];
	let e, ei;
	for (const x of items) {
		e = document.createElement("div");
		e.id = x === "play" ? x + "-pause" : x;
		e.classList.add("navigation-button");
		e.classList.add("inactive");
		ei = document.createElement("i");
		ei.classList.add("fa");
		ei.classList.add("fa-" + x);
		e.append(ei);
		navContainer.append(e);
	}
	return navContainer;
}

function setupPlayerSettings(color, params = {
    right: false,
    defaultPlayers: {
        black: "Human",
        white: "Prudens",
    },
}) {
    if (params.defaultPlayers === undefined) {
        params.defaultPlayers = {
            black: "Human",
            white: "Prudens",
        };
    }
    const settings = document.createElement("div");
    settings.classList.add("player-settings");
    if (params["right"]) {
        settings.classList.add("right");
    }
    // const colorLabel = document.createElement("div");
    // const playerColor = document.createElement("div");
    // colorLabel.innerHTML = "<b>Color</b>:";
    // playerColor.innerText = color[0].toUpperCase() + color.slice(1);
    const playerLabel = document.createElement("div");
    const playerType = document.createElement("div");
    playerLabel.innerHTML = "<b>Player</b>:";
    playerType.classList.add("player-type-container");
    const downArrow = document.createElement("div");
    downArrow.classList.add("fa");
    downArrow.classList.add("fa-angle-down");
    playerType.append(downArrow);
    playerType.append(document.createTextNode(params.defaultPlayers[color]));
    playerType.id = color + "-type";
    // const dropdown = playerTypeDropdown(color);
    // playerType.append(dropdown);
    playerType.addEventListener("click", (event) => {
        // playerType.style.zIndex = "101";
        const dropdown = playerTypeDropdown(color);
        const pRect = event.target.getBoundingClientRect();
        dropdown.style.top = pRect.top + "px";
        dropdown.style.left = pRect.left + "px";
        const blocker = addBlocker(document.body, {blockerStyle: ["transparent", "top"], id: "dropdown-blocker"});
        blocker.addEventListener("click", (event) => {
            event.target.remove();
            dropdown.remove();
            // console.log("hfd");
        }, false);
        blocker.append(dropdown);
        // playerType.append(dropdown);
        // console.log(dropdown.style);
        // dropdown.style.zIndex = "101";
    }, false);
    const particularsLabel = document.createElement("div");
    const particulars = document.createElement("input");
    const particularsButton = document.createElement("div");
    particularsLabel.innerHTML = "<b>Policy</b>:";
	particularsLabel.id = color + "-particulars-label";
	particulars.type = "file";
	particulars.addEventListener("change", (function(x) {
        return function() {
            const files = this.files;
            uploadPolicy(files, x === "white" ? 0 : 1);
        };
    }) (color), false);
	particulars.id = color + "-particulars";
    const uploadTextNode = document.createTextNode("(default)");
    // console.log(uploadTextNode.id);
	particularsButton.append(uploadTextNode);
    // const uploadIcon = document.createElement("i");
    // uploadIcon.classList.add("fa", "fa-upload");
    // particularsButton.append(uploadIcon);
	particularsButton.id = color + "-policy-button";
    particularsButton.classList.add("policy-upload-button");
    const prudensTimeoutLabel = document.createElement("div");
    prudensTimeoutLabel.innerHTML = "<b>Wait</b>:";
    prudensTimeoutLabel.id = color + "-timeout-label";
    const prudensTimeoutContainer = document.createElement("div");
    prudensTimeoutContainer.classList.add("timeout-container");
    prudensTimeoutContainer.id = color + "-timeout-container";
    const prudensTimeoutInput = document.createElement("input");
    prudensTimeoutInput.type = "text";
    prudensTimeoutInput.id = color + "-timeout-input";
    prudensTimeoutInput.minLength = "1";
    prudensTimeoutInput.maxLength = "5";
    prudensTimeoutInput.size = "5";
    prudensTimeoutInput.pattern = /\d{1,5}/g;
    prudensTimeoutInput.title = "Up to five digits."
    prudensTimeoutInput.value = "500"; // TODO It remains to add an envent listener and capture the timeout somehow.
    const prudensTimeoutUnit = document.createTextNode("ms");
    prudensTimeoutContainer.append(prudensTimeoutInput);
    prudensTimeoutContainer.append(prudensTimeoutUnit);
    if (params.defaultPlayers[color] !== "Prudens") {
    	particularsLabel.classList.add("inactive");
		particularsButton.classList.add("inactive");
        prudensTimeoutContainer.classList.add("inactive");
        prudensTimeoutInput.readOnly = true;
        prudensTimeoutLabel.classList.add("inactive");
    } else {
    	particularsButton.tempFunc = () => {particulars.click();};
		particularsButton.addEventListener("click", particularsButton.tempFunc, false);
    }
    // settings.append(colorLabel);
    // settings.append(playerColor);
    settings.append(playerLabel);
    settings.append(playerType);
    settings.append(particularsLabel);
    settings.append(particulars);
    settings.append(particularsButton);
    settings.append(prudensTimeoutLabel);
    settings.append(prudensTimeoutContainer);
    return settings;
}

function playerTypeDropdown(color) {
    const dropdown = document.createElement("div");
    dropdown.classList.add("player-dropdown-container");
    if (color === "white") {
        dropdown.classList.add("right");
    }
    const dropdownUl = document.createElement("ul");
    let option;
    for (let i = 0; i < PLAYER_OPTIONS.length; i++) {
        option = PLAYER_OPTIONS[i];
        const li = document.createElement("li");
        li.id = color + "-" + option.toLowerCase();
        li.innerText = option;
        li.addEventListener("click", (event) => {
            // console.log(event);
            if (color === "white") {
                WHITE = i;
            } else {
                BLACK = i;
            }
            let animationContainer, animateBlocker;
            if (WHITE === 1 && BLACK === 1) {
                animationContainer = document.getElementById("pvp-settings-container");
                animationContainer.classList.remove("inactive");
                if (document.getElementById("animate-blocker")) {
                    document.getElementById("animate-blocker").remove();
                }
            } else if (!document.getElementById("animate-blocker")) {
                animateBlocker = document.createElement("div");
                animateBlocker.classList.add("blocker", "transparent");
                animateBlocker.id = "animate-blocker";
                animationContainer = document.getElementById("pvp-settings-container");
                animationContainer.append(animateBlocker);
                animationContainer.classList.add("inactive");
            }
            const ggParent = document.getElementById(color + "-type");
            for (const child of ggParent.childNodes) {
            	if (child.nodeType === 3) {
            		child.remove();
            	}
            }
            const newTextNode = document.createTextNode(PLAYER_OPTIONS[i]);
            ggParent.append(newTextNode);
            const label = document.getElementById(color + "-particulars-label");
            const button = document.getElementById(color + "-policy-button");
            const msLabel = document.getElementById(color + "-timeout-label");
            const msContainer = document.getElementById(color + "-timeout-container");
            const msInput = document.getElementById(color + "-timeout-input");
            // console.log(i, color);
            if (i === 1) {
            	label.classList.remove("inactive");
            	button.classList.remove("inactive");
            	button.classList.add("policy-upload-button");
                msLabel.classList.remove("inactive");
                msContainer.classList.remove("inactive");
                msInput.readOnly = false;
            	activatePolicyUpload(color);
                if (color === "black") {
                    toggleLegalMoves();
                }
            } else if (i === 0) {
            	if (!label.classList.contains("inactive")) {
	            	label.classList.add("inactive");	
            	}
            	if (!button.classList.contains("inactive")) {
					button.classList.add("inactive");            	
            	}
                if (!msLabel.classList.contains("inactive")) {
                    msLabel.classList.add("inactive");
                }
                if (!msContainer.classList.contains("inactive")) {
                    msContainer.classList.add("inactive");
                }
                msInput.readOnly = true;
                const animatedCheckbox = document.getElementById("animate");
                if (!animatedCheckbox.checked) {
                    animatedCheckbox.click();
                }
                // console.log("Human player");
            	if (color === "black") {
                    // console.log("Black player");
                    toggleLegalMoves(false);
                }
            	button.removeEventListener("click", button.tempFunc, false);
            }
            document.getElementById("dropdown-blocker").remove();
            dropdown.remove();
        }, false)
        dropdownUl.append(li);
    }
    dropdown.append(dropdownUl);
    return dropdown;
}

function toggleLegalMoves(block = true) {
    let cell, blocker;
    for (const cellId of LEGAL_MOVES) {
        if (block && !document.getElementById(cellId + "-blocker")) {
            cell = document.getElementById(cellId);
            blocker = document.createElement("div");
            blocker.classList.add("blocker", "transparent");
            blocker.id = cellId + "-blocker";
            cell.append(blocker);
        } else {
            const lmBlocker = document.getElementById(cellId + "-blocker");
            // console.log(document.querySelectorAll('div[id$="blocker"]'));
            if (lmBlocker) {
                // console.log("removed blocker");
                lmBlocker.remove();
            }

        }
    }
}

function activatePolicyUpload(color) {
	const inputElement = document.getElementById(color + "-particulars");
	const policyButton = document.getElementById(color + "-policy-button");
	policyButton.tempFunc = () => {inputElement.click();};
	policyButton.addEventListener("click", policyButton.tempFunc, false);
}

function enterAuditMode(event) {
    if (MODE === -1) {
        MODE = 1;
        const initButtonsContainer = document.getElementById("init-buttons-container");
        initButtonsContainer.style.transform = "translate(-50%, 0)";
        initButtonsContainer.style.top = "0";
        showAuditModeSettings();
    } else if (MODE === 0) {
        // const isNonEmpty = currentMove !== undefined && currentMove > 0;
        // const audit = confirm(`${isNonEmpty ? "Save game and p" : "P"}roceed to audit mode?`);
        if (!savedSession) {
            showCM(event);
        } else {
            MODE = 1;
            // console.log("init?");
            resetGame();
            // initializeBoard();
            const gameContainer = document.getElementById("play-game-container");
            gameContainer.style.top = "-100vh";
            setTimeout(() => {
                gameContainer.remove();
            }, 250);
            showAuditModeSettings();
        }
    } else if (MODE === 1) {
        // const isNonEmpty = coachedPolicyString !== "";
        // const audit = confirm(`${isNonEmpty ? "Save policy and r" : "R"}estart auditing?`);
        if (!savedSession) {
            showCM(event);
        } else {
            resetAudit();
        }
    }
}

function resetAudit() {
    PLAYING = false;
    document.getElementById("game-upload-button").innerText = "(empty)";
    let downBtn;
    for (const color of ["black", "white"]) {
        document.getElementById(color + "-type").innerText = "??";
        document.getElementById(color + "-policy-button").innerText = "??";
        downBtn = document.getElementById(color + "-download-policy");
        downBtn.classList.add("inactive");
        if (!document.getElementById(color + "-download-policy-blocker")) {
            const dump = addBlocker(downBtn, {id: color + "-download-policy-blocker"});
        }
    }
    document.getElementById("game-date").innerHTML = "??";
    const board = document.getElementById("board-container");
    board.innerHTML = "";
    currentMove = undefined;
    EXPLANATION = {};
    CURRENT_GAME = [];
    resetGameHistory();
    initializeBoard();
    // for (const id of ["fast-backward", "step-backward", "play-pause", "step-forward", "fast-forward"]) {
    for (const id of ["fast-backward", "step-backward", "step-forward", "fast-forward"]) {
        if (!document.getElementById(id).classList.contains("inactive")) {
            document.getElementById(id).classList.add("inactive");
        }
    }
}

function showAuditModeSettings() {
    const rightMenuContainer = document.getElementById("right-menu-container");
    const gameSettingsContainer = getAuditSettings();
    const gh = getGameHistory(true);
    const gameHeader = getGameHeader();
    const gameNavContainer = document.createElement("div");
    gameNavContainer.classList.add("game-navigation-container");
    gameNavContainer.append(gameHeader);
    gameNavContainer.append(gh);
    const gNav = generateGameNav();
    gameNavContainer.append(gNav);
    const hiddenDownContainer = document.createElement("div");
    hiddenDownContainer.classList.add("show-play-mode");
    hiddenDownContainer.id = "audit-container";
    hiddenDownContainer.append(gameSettingsContainer);
    hiddenDownContainer.append(gameNavContainer);
    // hiddenDownContainer.append(gNav);
    rightMenuContainer.append(hiddenDownContainer);
    setTimeout(() => {
    	hiddenDownContainer.style.top = "80px";
    }, 10);
}

function getAuditSettings() {
    const container = document.createElement("div");
    container.classList.add("game-settings-container");
    container.classList.add("audit-settings-container");
    const gameUploadLabel = document.createElement("div");
    gameUploadLabel.innerHTML = "<b>Current Game</b>:";
    const gameUploadButton = document.createElement("div");
    gameUploadButton.classList.add("policy-upload-button");
    gameUploadButton.id = "game-upload-button";
    gameUploadButton.append(document.createTextNode("(empty)"));
    // const uploadIcon = document.createElement("i");
    // uploadIcon.classList.add("fa", "fa-upload");
    // gameUploadButton.append(uploadIcon);
    const gameUploadInput = document.createElement("input");
    gameUploadInput.type = "file";
    gameUploadButton.addEventListener("click", () => {gameUploadInput.click();}, false);
    document.addEventListener("keydown", (event) => {
        if (event.ctrlKey && event.key === "o") {
            event.preventDefault();
            gameUploadInput.click();
        }
    }, false);
    gameUploadInput.addEventListener("change", function() {
        const reader = new FileReader();
        reader.onload = (() => {
            loadGame(JSON.parse(reader.result), this.files[0].name);
        });
        reader.readAsText(this.files[0]);
    }, false);
    const gameUploadContainer = document.createElement("div");
    gameUploadContainer.classList.add("game-upload-container");
    gameUploadContainer.append(gameUploadLabel);
    gameUploadContainer.append(gameUploadInput);
    gameUploadContainer.append(gameUploadButton);
    container.append(gameUploadContainer);
    container.append(getAuditPlayerSettings("black"));
    container.append(getAuditPlayerSettings("white", {right: true}));
    const delayLine = document.createElement("div");
    delayLine.classList.add("delay-line");
    const delayLabel = document.createElement("div");
    delayLabel.innerHTML = "<b>Delay</b>:"
    const delayInput = document.createElement("input");
    delayInput.type = "text";
    delayInput.value = "1000";
    delayInput.id = "delay";
    delayInput.name = "delay";
    delayInput.minLength = 1;
    delayInput.maxLength = 6;
    delayInput.size = 8;
    const delayMs = document.createElement("div");
    delayMs.innerText = "ms";
    delayLine.append(delayLabel);
    delayLine.append(delayInput);
    delayLine.append(delayMs);
    // container.append(delayLine);
    const dateLine = document.createElement("div");
    dateLine.classList.add("date-line");
    dateLine.append(getDateContainer());
    container.append(dateLine);
    return container;
}

function getDateContainer() {
    const dateContainer = document.createElement("div");
    dateContainer.classList.add("date-container");
    const dateLabel = document.createElement("div");
    dateLabel.innerHTML = "<b>Game date</b>: ";
    const gameDate = document.createElement("div");
    gameDate.id = "game-date";
    gameDate.innerText = "??"
    dateContainer.append(dateLabel);
    dateContainer.append(gameDate);
    return dateContainer;
}

function getAuditPlayerSettings(color, params = {
    right: false,
}) {
    const settings = document.createElement("div");
    settings.classList.add("player-settings");
    if (params["right"]) {
        settings.classList.add("right");
    }
    // const colorLabel = document.createElement("div");
    // const playerColor = document.createElement("div");
    // colorLabel.innerHTML = "<b>Color</b>:";
    // playerColor.innerText = color[0].toUpperCase() + color.slice(1);
    const playerLabel = document.createElement("div");
    const playerType = document.createElement("div");
    playerLabel.innerHTML = "<b>Player</b>:";
    playerType.classList.add("player-type-container");
    playerType.innerText = "??";
    playerType.id = color + "-type";
    const particularsLabel = document.createElement("div");
    const particularsButton = document.createElement("div");
    particularsButton.classList.add("policy-upload-button");
    particularsLabel.innerHTML = "<b>Policy</b>:";
	particularsLabel.id = color + "-particulars-label";
	particularsButton.innerText = "??";
	particularsButton.id = color + "-policy-button";
    // settings.append(colorLabel);
    // settings.append(playerColor);
    settings.append(playerLabel);
    settings.append(playerType);
    settings.append(particularsLabel);
    settings.append(particularsButton);
    return settings;
}

function getGameHeader() {
    const container = document.createElement("div");
    container.classList.add("game-up-down-load-container");
    const bDown = document.createElement("div");
    bDown.classList.add("game-load-container", "inactive");
    bDown.id = "black-download-policy";
    const bicon = document.createElement("i");
    bicon.classList.add("fa", "fa-download");
    bicon.style.color = "black";
    bDown.append(bicon);
    let dump = addBlocker(bDown, {blockerStyle: ["transparent"], id: "black-download-policy-blocker"});
    const wDown = document.createElement("div");
    wDown.classList.add("game-load-container", "inactive");
    wDown.id = "white-download-policy";
    const wicon = document.createElement("i");
    wicon.classList.add("fa", "fa-download");
    wDown.append(wicon);
    dump = addBlocker(wDown, {blockerStyle: ["transparent"], id: "white-download-policy-blocker"});
    const dCon = document.createElement("div");
    dCon.classList.add("download-container");
    dCon.append(bDown);
    dCon.append(wDown);
    // const button = document.createElement("div");
    // button.classList.add("game-load-container");
    // button.addEventListener("click", downloadPolicy, false);
    // button.append(document.createTextNode("Save "));
    // const icon = document.createElement("i");
    // icon.classList.add("fa");
    // icon.classList.add("fa-download");
    // button.append(icon);
    // container.append(button);
    const advise = document.createElement("div");
    advise.classList.add("game-load-container", "inactive");
    advise.id = "advise-button";
    // advise.addEventListener("click", addPattern, false);
    advise.append(document.createTextNode("Offer advice "));
    const adBlocker = addBlocker(advise, {blockerStyle: ["transparent"], id: "advise-button-blocker"});
    // console.log("adBlocker:", adBlocker);
    const offerIcon = document.createElement("i");
    offerIcon.classList.add("fa");
    offerIcon.classList.add("fa-plus-square");
    advise.append(offerIcon);
    container.append(advise);
    container.append(dCon);
    return container;
}

/* Main */

function main() {
    initializeBoard();
    const playButton = document.getElementById("play-button")
    playButton.addEventListener("click", enterPlayMode, false);
    document.addEventListener("keydown", (event) => {
        if (event.ctrlKey && event.altKey && event.key === "p") {
            event.preventDefault();
            playButton.click();
        }
    }, false);
    const auditButton = document.getElementById("audit-button")
    auditButton.addEventListener("click", enterAuditMode, false);
    document.addEventListener("keydown", (event) => {
        if (event.ctrlKey && event.altKey && event.key === "a") {
            event.preventDefault();
            auditButton.click();
        }
    }, false);
}

window.addEventListener("load", main);
