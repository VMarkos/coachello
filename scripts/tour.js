function  startTour() {
    const fader = document.createElement("div");
    fader.id = "fader";
    fader.classList.add("starting-screen");
    const tourDialog = document.createElement("div");
    tourDialog.classList.add("tour-dialog");
    tourDialog.innerText = `Welcome! In this tour we will present the key functionalities of our app, 
    to help you make sense of all these buttons and options that lie around your screen.`;
    const tourButton = document.createElement("div");
    tourButton.classList.add("tour-next-button");
    tourButton.innerText = "Next";
    tourButton.onclick = initializeTour;
    tourDialog.appendChild(tourButton);
    fader.appendChild(tourDialog);
    document.body.appendChild(fader);
}

function initializeTour() {
    const gameContainer = document.getElementById("body-container");
    const blocker = document.createElement("div");
    blocker.id = "blocker";
    blocker.classList.add("blocker");
    gameContainer.appendChild(blocker);
    gameContainer.classList.add("translate-board-down");
    document.getElementById("fader").remove();
    const tourDialog = document.createElement("div");
    tourDialog.id = "tour-dialog";
    tourDialog.classList.add("tour-dialog");
    tourDialog.classList.add("spacing");
    tourDialog.innerText = `In this app, you will play against a machine that has some understanding of the board game Othello. In order to make your move, you just have to click on one of the dashed circles appearing on the board (you always play as black).`;
    const tourButton = document.createElement("div");
    tourButton.id = "tour-button";
    tourButton.classList.add("tour-next-button");
    tourButton.innerText = "Next";
    tourButton.onclick = scoreDialog;
    tourDialog.appendChild(tourButton);
    setTimeout(() => {
        gameContainer.classList.add("translate-board-up");
        document.body.prepend(tourDialog);
        highlightLegalMoves();
    }, 200);
}

function highlightLegalMoves() {
    let row, col, cell;
    for (const coords of [[2, 3], [3, 2], [4, 5], [5, 4]]) {
        row = coords[0];
        col = coords[1];
        cell = document.getElementById("oc-" + row + "-" + col);
        if (cell.classList.contains("highlighted-item")) {
            cell.classList.remove("highlighted-item");
        } else {
            cell.classList.add("highlighted-item");
        }
    }
}

function scoreDialog() {
    highlightLegalMoves();
    const tourDialog = document.getElementById("tour-dialog");
    tourDialog.innerText = `The two numbers above the game board correspond to the pieces of each player has on the board. Keep track of these two numbers, since you have to have the most pieces on the board once the game ends, in order to win!`;
    const tourButton = document.createElement("div");
    tourButton.id = "tour-button";
    tourButton.classList.add("tour-next-button");
    tourButton.innerText = "Next";
    tourButton.onclick = buttonsDialog;
    tourDialog.appendChild(tourButton);
    highlightScoreBoard();
}

function highlightScoreBoard() {
    const scoreBoard = document.getElementById("score-board");
    if (scoreBoard.classList.contains("highlighted-item")) {
        scoreBoard.classList.remove("highlighted-item");
    } else {
        scoreBoard.classList.add("highlighted-item");
    }
}

function buttonsDialog() {
    highlightScoreBoard();
    const tourDialog = document.getElementById("tour-dialog");
    tourDialog.innerText = `You can ask the machine to explain its moves by pressing the "Why?" button. Any explanations will be presented in the reddish area below. In case something goes wrong and you want to start things over, you can press the "Reset" button.`;
    const tourButton = document.createElement("div");
    tourButton.id = "tour-button";
    tourButton.classList.add("tour-next-button");
    tourButton.innerText = "Next";
    tourButton.onclick = infoDialog;
    tourDialog.appendChild(tourButton);
    highlightButtons();
}

function highlightButtons() {
    const buttonsContainer = document.getElementById("buttons-container");
    if (buttonsContainer.classList.contains("highlighted-item")) {
        buttonsContainer.classList.remove("highlighted-item");
    } else {
        buttonsContainer.classList.add("highlighted-item");
    }
}

function infoDialog() {
    highlightButtons();
    const tourDialog = document.getElementById("tour-dialog");
    tourDialog.innerText = `In case you would like to learn more about the game, you might press the "Info" button (right). Also, in case you want to take a second tour, you might press again the "Take a Tour!" button.`;
    const tourButton = document.createElement("div");
    tourButton.id = "tour-button";
    tourButton.classList.add("tour-next-button");
    tourButton.innerText = "Next";
    tourButton.onclick = endTour;
    tourDialog.appendChild(tourButton);
    highlightInfo();
}

function highlightInfo() {
    const infoContainer = document.getElementById("info-container");
    if (infoContainer.classList.contains("highlighted-item")) {
        infoContainer.classList.remove("highlighted-item");
    } else {
        infoContainer.classList.add("highlighted-item");
    }
}

function endTour() {
    const gameContainer = document.getElementById("body-container");
    gameContainer.classList.remove("translate-board-up");
    gameContainer.classList.remove("translate-board-down");
    highlightInfo();
    document.getElementById("tour-dialog").remove();
    const blocker = document.getElementById("blocker");
    blocker.remove();
}