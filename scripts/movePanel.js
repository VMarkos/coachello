function nextMove() {
    if (!canMoveBackward) {
        canMoveBackward = true;
        const stepBackward = document.getElementById("step-backward");
        stepBackward.classList.remove("inactive");
        stepBackward.addEventListener("click", previousMove, false);
        const fastBackward = document.getElementById("fast-backward");
        fastBackward.classList.remove("inactive");
        fastBackward.addEventListener("click", backwardFast, false);
    }
}