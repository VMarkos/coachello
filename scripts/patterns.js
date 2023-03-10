const PATTERN_NAMES = [
    "Original",
    "Inflection (y)",
    "Inflection (x)",
    "Inflection (y=x)",
    "Inflection (y=-x)",
    "Rotation (90)",
    "Rotation (180)",
    "Rotation (270)",
];

function initMiniPatterns(container) {
    let gridContainer = document.getElementsByClassName("mini-pattern-grid-container")[0];
    let exists = true;
    if (!gridContainer) {
        gridContainer = document.createElement("div");
        gridContainer.classList.add("mini-pattern-grid-container");
        exists = false;
    }
    let miniPattern, miniGrid, miniText, miniIcon;
    for (let i = 0; i < N_ROWS; i++) {
        miniPattern = document.createElement("div");
        miniPattern.classList.add("mini-pattern-container");
        miniGrid = document.createElement("div");
        miniGrid.classList.add("mini-pattern-grid");
        miniText = document.createElement("span");
        miniText.append(PATTERN_NAMES[i]);
        // miniIcon = document.createElement("img");
        // miniIcon.src = "./assets/icons/rotate_270.svg";
        // miniIcon.style.width = "24pt";
        // miniIcon.style.filter = "brightness(0) invert(1)";
        // miniIcon.style.verticalAlign = "text-top";
        // miniText.append(miniIcon);
        miniPattern.append(miniText);
        miniPattern.append(miniGrid);
        gridContainer.append(miniPattern);
    }
    if (!exists) {
        container.append(gridContainer);
    }
    setTimeout(() => {
        console.log(gridContainer.getBoundingClientRect());
        const rect = gridContainer.getBoundingClientRect();
        const width = (rect.width - 3 * 14) / 4;
        const height = (rect.height - 3 * 10) / 4;
        // console.log(width, height);
        for (const mini of gridContainer.children) {
            // console.log(mini);
            mini.lastChild.style.height = width + "px";
        }
    }, 0);
}

function updateMiniPatterns() {
    // console.log(PATTERN);
    let startRow = Infinity, endRow = -Infinity, startCol = Infinity, endCol = -Infinity;
    for (let i = -1; i < PATTERN.length; i++) {
        for (let j = -1; j < PATTERN[i].length; j++) {
            if (!PATTERN[i][j] || PATTERN[i][j] === 0) {
                continue;
            }
            if (i < startRow) {
                startRow = i;
            }
            if (i > endRow) {
                endRow = i;
            }
            if (j < startCol) {
                startCol = j;
            }
            if (j > endCol) {
                endCol = j;
            }
        }
    }
    const miniRows = Math.max(3, endRow - startRow + 1);
    const miniCols = Math.max(3, endCol - startCol + 1);
    const size = Math.max(miniCols, miniRows);
    // console.log(startCol, startRow, size);
    const transforms = D4(n = size);
    // console.log("TRANS:", transforms);
    const miniPatterns = document.getElementsByClassName("mini-pattern-grid-container")[0];
    let miniPattern;
    for (let i = 0; i < miniPatterns.children.length; i++) {
        miniPattern = miniPatterns.children[i].children[1];
        miniPattern.innerHTML = "";
        drawMiniPattern(miniPattern, startRow, startCol, size, PATTERN, transforms[i]);
    }
}

function drawMiniPattern(container, startRow, startCol, size, pattern, transform) {
    container.style.gridTemplateColumns = `repeat(${size},1fr)`;
    container.style.gridTemplateRows = `repeat(${size},1fr)`;
    let rowStart = startRow, colStart = startCol;
    // console.log(N_ROWS, N_COLS);
    if (startRow + size > N_ROWS + 1) {
        rowStart = N_ROWS + 1 - size;
    }
    if (startCol + size > N_COLS + 1) {
        colStart = N_COLS + 1 - size;
    }
    const truncPat = [];
    for (let i = rowStart; i < rowStart + size; i++) {
        truncPat.push([]);
        // console.log("size:", size, "row:", startRow, "i:", i); // TODO You are here! There is again a bug with index out of bounds or so...
        for (let j = colStart; j < colStart + size; j++) {
            // console.log("size:", size, "row:", rowStart, "i:", i, "col:", colStart, "j:", j);
            // console.log("pattern:", pattern);
            // if (i < size && j + startCol < size) {
            truncPat[i - rowStart].push(pattern[i][j]);
            // } else {
            //     truncPat[i].push(0);
            // }
        }
    }
    const transformedPattern = applyTransform(truncPat, transform);
    // console.log(transformedPattern);
    let patternElement, type, typeClass;
    const rect = container.getBoundingClientRect();
    const width = (rect.height - (size - 1) * 1) / size;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            type = transformedPattern[i][j];
            patternElement = document.createElement("div");
            patternElement.classList.add("mini-pattern-cell");
            if (type > 0) {
                typeClass = (type === 1) ? "body": (type === 2) ? "positive-head" : "negative-head";
                patternElement.classList.add(typeClass);
            }
            patternElement.style.width = width + "px";
            patternElement.style.height = width + "px";
            container.append(patternElement);
            // setTimeout(() => {
            //     // console.log(patternElement.classList, patternElement.style.width);
            //     // debugger;
            //     patternElement.style.width = width + "px";
            //     patternElement.style.height = width + "px";
            // }, 0);
        }
    }
}

function applyTransform(pattern, transform) {
    const transPat = [];
    let transCoords;
    // console.log(pattern);
    for (let i = 0; i < pattern.length; i++) {
        transPat.push([]);
        for (let j = 0; j < pattern[i].length; j++) {
            transCoords = transform(i, j);
            // console.log(transCoords);
            transPat[i].push(pattern[transCoords[0]][transCoords[1]]);
        }
    }
    return transPat;
}

// TODO Add a button on the right menu when advising to provide advice without closing the window.