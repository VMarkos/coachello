const PATTERN = new Array(N_ROWS + 1); // 0 empty, 1 red (body), 2 blue (positive head), 3 bordeaux? (negative head).
const PATTERN_SEMANTICS = new Array(N_ROWS + 1);
let RULE_MAP = new Map();
let RULE_MAP_JSON = [{}, {}]; // 0 = white, 1 = black.
let basePatterns = [];
let existsHead = false;
let N_RULES = [0, 0];

let hasProvidedAdvice = false;

let pRow, pCol;

const LABELS = {
    border: {
        labels: ["...a border cell.", "...just an empty cell.", "...this border cell", "...this empty cell."],
        heading: "Consider this cell as...",
        defaultIndex: 0,
    },
    empty: {
        labels: ["...just an empty cell.", "...an empty cell with a legal move.", "...this empty cell.", "...this empty cell with a legal move."],
        heading: "Consider this cell as...",
        defaultIndex: 0,
    },
    occupied: {
        labels: ["...only stone color."],
        heading: "Take into account...",
        defaultIndex: 0,
    }
};

let alreadyFlipped = false;

let coachedPolicyStrings = ["", ""]; // 0 = white, 1 = black.

function D4(n = 8) {
    const zSize = n - 1;
    return [ // Dihedral group (n=4). Contains the 1 trivial (id) and 7 non-trivial transforms of D4 (3 rotations and 4 reflections).
        (x, y) => {return [x, y];}, // Identical transformation.
        (x, y) => {return [x, zSize - y];}, // Reflection wrt to x = 0.
        (x, y) => {return [zSize - x, y];}, // Reflection wrt to y = 0.
        (x, y) => {return [zSize - y, zSize - x];}, // Reflection wrt to y = x.
        (x, y) => {return [y, x];}, // Reflection wrt to y = -x.
        (x, y) => {return [zSize - y, x];}, // 90 deg rotation.
        (x, y) => {return [zSize - x, zSize - y];}, // 180 deg rotation.
        (x, y) => {return [y, zSize - x];}, // 270 deg rotation.
    ];
}

function initPattern() {
    existsHead = false;
    for (let i = -1; i < N_ROWS + 1; i++) {
        PATTERN[i] = new Array(N_COLS + 1);
        PATTERN_SEMANTICS[i] = new Array(N_COLS + 1);
        for (let j = -1; j < N_COLS + 1; j++) {
            PATTERN[i][j] = 0;
            PATTERN_SEMANTICS[i][j] = 0;
        }
    }
}

function toggleSingleAdvise() {
    const sab = document.getElementById("single-advise-button");
    if (sab.classList.contains("inactive") && existsValidPattern()) {
        sab.classList.remove("inactive");
        sab.addEventListener("click", provideAdvice, false);
    } else if (!sab.classList.contains("inactive") && !existsValidPattern()) {
        sab.classList.add("inactive");
        sab.removeEventListener("click", provideAdvice, false);
    }
}

function provideAdvice() {
    // removePatternCells();
    removeHighlights();
    const patternArea = document.getElementsByClassName("pattern-area")[0];
    const miniPatternGridContainer = document.getElementsByClassName("mini-pattern-grid-container")[0];
    miniPatternGridContainer.innerHTML = "";
    initMiniPatterns(patternArea);
    if (existsValidPattern()) {
        // console.log("EXISTS!");
        computeBasePatterns();
        // console.log("basePatterns:", basePatterns);
        updatePolicy();
        savedSession = false;
        hasProvidedAdvice = true;
    }
    initPattern();
}

function addPattern() {
    const rightContainer = document.getElementById("right-menu-container");
    const patternAreaContainer = document.createElement("div");
    patternAreaContainer.classList.add("pattern-area-container");
    const patternArea = document.createElement("div");
    patternArea.classList.add("pattern-area");
    initMiniPatterns(patternArea);
    // Single Advise Button
    const sabContainer = document.createElement("div");
    sabContainer.classList.add("single-advice-button-container");
    const singleAdviseButton = document.createElement("div");
    singleAdviseButton.classList.add(...["single-advice-button", "inactive"]);
    singleAdviseButton.id = "single-advise-button";
    const sabText = document.createElement("div");
    sabText.innerText = "Advise";
    singleAdviseButton.append(sabText);
    const sabIcon = document.createElement("i");
    sabIcon.classList.add("fa", "fa-chevron-circle-right");
    singleAdviseButton.append(sabIcon);
    sabContainer.append(singleAdviseButton);
    patternArea.append(sabContainer);
    // Control Buttons
    const doneButtonContainer = document.createElement("div");
    doneButtonContainer.classList.add("done-button-container");
    const doneButton = document.createElement("div");
    doneButton.classList.add("init-button", "play");
    doneButton.innerText = "Done";
    doneButton.addEventListener("click", () => {
        doneWithPattern();
    }, false);
    const cancelButton = document.createElement("div");
    cancelButton.classList.add("init-button", "cancel");
    cancelButton.innerText = "Cancel";
    cancelButton.addEventListener("click", () => {
        removePatternCells();
        removeHighlights();
        patternAreaContainer.remove();
        document.getElementById("blocker").remove();
    }, false);
    doneButtonContainer.append(cancelButton);
    doneButtonContainer.append(doneButton);
    patternArea.append(doneButtonContainer);
    patternAreaContainer.append(patternArea);
    rightContainer.append(patternAreaContainer);
    initPattern();
    const blocker = document.createElement("div");
    blocker.classList.add("blocker", "blurry");
    blocker.id = "blocker";
    document.body.append(blocker);
    addPatternCells();
}

function highlightCell(event) {
    const target = event.target;
    let backgroundCell, splitId = [];
    splitId = target.id.split("|");
    const row = parseInt(splitId[1]);
    const col = parseInt(splitId[2]);
    let borderCell = false;
    if (row < 0 || col < 0 || row === N_ROWS || col === N_COLS) {
        backgroundCell = document.getElementById("bc|" + row + "|" + col);
        borderCell = true;
    } else {
        backgroundCell = document.getElementById("oc-" + row + "-" + col);
    }
    if (PATTERN[row][col] === 0) {
        PATTERN[row][col] = 1;
        backgroundCell.classList.add("body-cell");
    } else if (PATTERN[row][col] === 1 && !existsHead && !borderCell) {
        PATTERN[row][col] = 2;
        backgroundCell.classList.remove("body-cell");
        backgroundCell.classList.add("head-cell");
        existsHead = true;
    } else if (PATTERN[row][col] === 1) {
        PATTERN[row][col] = 0;
        backgroundCell.classList.remove("body-cell");
    } else if (PATTERN[row][col] === 2) {
        PATTERN[row][col] = 3;
        backgroundCell.classList.remove("head-cell");
        backgroundCell.classList.add("negative-head-cell");
    } else {
        PATTERN[row][col] = 0;
        backgroundCell.classList.remove("negative-head-cell");
        existsHead = false;
    }
    updateMiniPatterns();
    toggleSingleAdvise();
}

/* 
BASE PATTERN = {
    body: [[i, j, 0|1|-1|-2, 0|1|...], ...], // 0 = default, 1,2,3... = as in LABELS.
    head: [x, y, 1|-1], // 0 = default, 1,2,3... = as in LABELS.
};
*/

// TODO You should not allow context menus in head literals.

function transformPattern(pattern, transform) {
    const transformed = {body: [], head: undefined};
    for (const cell of pattern.body) {
        if (cell[3] > 1) {
            transformed.body.push([...cell]);
        } else {
            transformed.body.push([...transform(cell[0], cell[1]), cell[2], cell[3]]);
        }
    }
    transformed.head = [...transform(pattern.head[0], pattern.head[1]), pattern.head[2]];
    return transformed;
}

function computeBasePatterns() {
    basePatterns = [];
    const basePattern = {body: [], head: undefined};
    for (let i = -1; i < N_ROWS + 1; i++) {
        for (let j = -1; j < N_COLS + 1; j++) {
            if (PATTERN[i][j] === 1) {
                if (i < 0 || j < 0 || i === N_ROWS || j === N_COLS) {
                    basePattern.body.push([i, j, -2, PATTERN_SEMANTICS[i][j]]);
                } else {
                    basePattern.body.push([i, j, BOARD[i][j], PATTERN_SEMANTICS[i][j]]);
                }
            } else if (PATTERN[i][j] === 2) {
                basePattern.head = [i, j, 1]; // 1 stands for move...
            } else if (PATTERN[i][j] === 3) {
                basePattern.head = [i, j, -1]; // ... -1 stands for -move...
            }
        }
    }
    // basePatterns.push(basePattern);
    for (const transform of D4()) {
        basePatterns.push(transformPattern(basePattern, transform));
    }
}

function transpileToRule(pattern) {
    const headLiteral = `${pattern.head[2] === -1 ? "-" : ""}move(X,Y);`;
    let bodyString = "legalMove(X,Y),";
    const headCoords = [pattern.head[0], pattern.head[1]];
    const bodyList = [];
    let bodyLit;
    for (const cell of pattern.body) {
        bodyLit = interpretSemantics(cell, headCoords);
        bodyList.push(bodyLit.substring(0, bodyLit.length - 1));
        bodyString += bodyLit;
        // x = cell[0] - headCoords[0];
        // y = cell[1] - headCoords[1];
        // bodyString += `cell(X${x > 0 ? ("+" + x) : (x === 0 ? "" : x)},Y${y > 0 ? ("+" + y) : (y === 0 ? "" : y)},${cell[2]}),`;
    }
    return {
        string: " :: " + bodyString.substring(0, bodyString.length - 1) + " implies " + headLiteral,
        bodyList: bodyList,
    };
}

function interpretSemantics(cell, headCoords) {
    const cellSemantics = PATTERN_SEMANTICS[cell[0]][cell[1]];
    let x, y;
    if (cellSemantics === 0) { // Default case.
        // return [cell[0] - headCoords[0], cell[1] - headCoords[1], cell[2]];
        x = cell[0] - headCoords[0];
        y = cell[1] - headCoords[1];
        return `cell(X${x > 0 ? ("+" + x) : (x === 0 ? "" : x)},Y${y > 0 ? ("+" + y) : (y === 0 ? "" : y)},${cell[2]}),`;
    }
    if (cell[0] < 0 || cell[1] < 0 || cell[0] === N_ROWS || cell[1] === N_COLS) { // Interpret border cell semantics.
        if (cellSemantics === 1) {
            x = cell[0] - headCoords[0];
            y = cell[1] - headCoords[1];
            return `cell(X${x > 0 ? ("+" + x) : (x === 0 ? "" : x)},Y${y > 0 ? ("+" + y) : (y === 0 ? "" : y)},0),`;
            // return [cell[0] - headCoords[0], cell[1] - headCoords[1], 0];
        } else if (cellSemantics === 2) {
            x = cell[0];
            y = cell[1];
            return `cell(${x},${y},-2),`;
            // return [cell[0], cell[1], -2];
        } else if (cellSemantics === 3) {
            x = cell[0];
            y = cell[1];
            return `cell(${x},${y},0),`;
            // return [cell[0], cell[1], 0];
        }
    }
    if (BOARD[cell[0]][cell[1]] === 0) { // Interpret empty cell semantics.
        if (cellSemantics === 1) {
            x = cell[0] - headCoords[0];
            y = cell[1] - headCoords[1];
            return `cell(X${x > 0 ? ("+" + x) : (x === 0 ? "" : x)},Y${y > 0 ? ("+" + y) : (y === 0 ? "" : y)},0),legalMove(X${x > 0 ? ("+" + x) : (x === 0 ? "" : x)},Y${y > 0 ? ("+" + y) : (y === 0 ? "" : y)}),`;
            // return [cell[0] - headCoords[0], cell[1] - headCoords[1], 2];
        } else if (cellSemantics === 2) {
            x = cell[0];
            y = cell[1];
            return `cell(${x},${y},0),`;
            // return [cell[0], cell[1], 0];
        } else if (cellSemantics === 3) {
            x = cell[0];
            y = cell[1];
            return `cell(${x},${y},0),legalMove(${x},${y}),`;
            // return [cell[0], cell[1], 2];
        }
    }
    return undefined; // No need to interpret occupied semantics so far.
}

function transpileToFn(pattern, ruleName) {
    const ruleTransforms = [];
    const headCoords = [pattern.head[0], pattern.head[1]];
    let x, y, z;
    for (const cell of pattern.body) {
        if (cell[3] > 1) {
            x = cell[0];
            y = cell[0];
            z = 1;
        } else {
            x = cell[0] - headCoords[0];
            y = cell[1] - headCoords[1];
            z = 0;
        }
        ruleTransforms.push((a, b) => {return [x + a, y + b];});
        if (RULE_MAP_JSON[CURRENT_PLAYER][ruleName]) {
            RULE_MAP_JSON[CURRENT_PLAYER][ruleName].push([x, y, z]);
        } else {
            RULE_MAP_JSON[CURRENT_PLAYER][ruleName] = [[x, y, z]];
        }
    }
    return ruleTransforms;
}

function updatePolicy() {
    const ruleEquals = (X, Y) => {
        for (const x of X) {
            if (!Y.includes(x)) {
                return false;
            }
        }
        return true;
    };
    const containsRule = (list, rule) => {
        for (const item of list) {
            if (ruleEquals(rule, item)) {
                return true;
            }
        }
        return false;
    };
    let ruleObject, ruleString, policyString = "", rules = [];
    console.log("bp:", basePatterns);
    for (const pattern of basePatterns) {
        ruleObject = transpileToRule(pattern);
        ruleString = ruleObject["string"];
        body = ruleObject["bodyList"];
        // console.log(N_RULES);
        if (!containsRule(rules, body)) {
            policyString += "R" + N_RULES[CURRENT_PLAYER] + ruleString + "\n";
            RULE_MAP.set("R" + N_RULES[CURRENT_PLAYER], transpileToFn(pattern, "R" + N_RULES[CURRENT_PLAYER]));
            rules.push(body);
            N_RULES[CURRENT_PLAYER]++;
            // RULE_MAP_JSON[CURRENT_PLAYER]["R" + N_RULES[CURRENT_PLAYER]] = pattern.body;
            // console.log(N_RULES, RULE_MAP_JSON);
        }
    }
    // console.log("pupdate:", RULE_MAP);
    // console.log("update time:", CURRENT_PLAYER);
    coachedPolicyStrings[CURRENT_PLAYER] += policyString;
}

function removeHighlights() {
    let backgroundCell;
    for (let i = -1; i < N_ROWS + 1; i++) {
        for (let j = -1; j < N_COLS + 1; j++) {
            if (i < 0 || j < 0 || i === N_ROWS || j === N_COLS) {
                backgroundCell = document.getElementById("bc|" + i + "|" + j);
            } else {
                backgroundCell = document.getElementById("oc-" + i + "-" + j);
            }
            if (backgroundCell.classList.contains("body-cell")) {
                backgroundCell.classList.remove("body-cell");
            } else if (backgroundCell.classList.contains("head-cell")) {
                backgroundCell.classList.remove("head-cell");
            } else if (backgroundCell.classList.contains("negative-head-cell")) {
                backgroundCell.classList.remove("negative-head-cell");
            }
        }
    }
}

function addPatternCells() {
    let cell, patternCell;
    for (let i = -1; i < N_ROWS + 1; i++) {
        for (let j = -1; j < N_COLS + 1; j++) {
            if (i < 0 || j < 0 || i === N_ROWS || j === N_COLS) {
                cell = document.getElementById("bc|" + i + "|" + j);
            } else {
                cell = document.getElementById("oc-" + i + "-" + j);
            }
            patternCell = document.createElement("div");
            patternCell.classList.add("pattern-cell");
            patternCell.id = "pc|" + i + "|" + j;
            patternCell.onclick = (event) => {highlightCell(event);};
            patternCell.addEventListener("contextmenu", openRightClickMenu);
            cell.append(patternCell);
        }
    }
}

function removePatternCells() {
    for (let i = -1; i < N_ROWS + 1; i++) {
        for (let j = -1; j < N_COLS + 1; j++) {
            document.getElementById("pc|" + i + "|" + j).remove();
        }
    }
}

function loadRuleMap() {
    let rulePoints, ruleTransforms;
    for (const rule in RULE_MAP_JSON[CURRENT_PLAYER]) {
        rulePoints = RULE_MAP_JSON[CURRENT_PLAYER][rule];
        ruleTransforms = [];
        for (const point of rulePoints) {
            ruleTransforms.push((a, b) => {
                if (point[2] === 1) {
                    return [point[0], point[1]];
                }
                return [point[0] + a, point[1] + b];
            });
        }
        RULE_MAP.set(rule, ruleTransforms);
    }
}

function downloadPolicy(player) {
    const policyJSON = preparePolicyForDownload(player); // TODO Redefine this function for a single policy!
    download(policyJSON["id"] + ".json", JSON.stringify(policyJSON, null, 2));
    savedSession = true;
}

function preparePolicyForDownload(player) { // 0 = white, 1 = black.
    // console.log(player, coachedPolicyStrings);
    // console.log(RULE_MAP_JSON, POLICIES);
    console.log(player, "RULE_MAP:", RULE_MAP_JSON);
    const policyJSON = {
        id: `${coachedPolicyStrings[player] === "" ? POLICIES[player]["id"] : "p" + Date.now()}`,
        nRules: N_RULES[player],
        policy: `${POLICIES[player]["text"][0] === "@" ? "" : "@Knowledge"}${POLICIES[player]["text"] ? POLICIES[player]["text"] : ""}\n${coachedPolicyStrings[player]}`,
        ruleMap: RULE_MAP_JSON[player], // TODO At some time, fix this stuff with x and 1 - x for player codes...
    };
    // console.log(policyJSON.policy);
    return policyJSON;
}

function download(filename, content) {
    let element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content));
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// function preparePoliciesForDownload() {
//     const policyJSON = {
//         policiesIds: [POLICIES[0]["id"], POLICIES[1]["id"]],
//         nRules: N_RULES,
//         policies: [
//             `${POLICIES[0]["text"][0] === "@" ? "" : "@Knowledge"}${POLICIES[0]["text"] ? POLICIES[0]["text"] : ""}\n${coachedPolicyStrings[0]}`,
//             `${POLICIES[1]["text"][0] === "@" ? "" : "@Knowledge"}${POLICIES[1]["text"] ? POLICIES[1]["text"] : ""}\n${coachedPolicyStrings[1]}`,
//         ],
//         ruleMap: RULE_MAP_JSON,
//     };
//     return policyJSON;
// }

function existsValidPattern() {
    // console.log("exists valid pattern?");
    // console.log(PATTERN);
    let containsHead = false, containsBody = false;
    for (let i = -1; i < N_ROWS + 1; i++) {
        for (let j = -1; j < N_COLS + 1; j++) {
            if (PATTERN[i][j] === 2 || PATTERN[i][j] === 3) {
                containsHead = true;
            } else if (PATTERN[i][j] === 1) {
                containsBody = true;
            }
            if (containsBody && containsHead) {
                // console.log("exists");
                return true;
            }
        }
    }
    // console.log("does not exist");
    return false;
}

function doneWithPattern() {
    removePatternCells();
    removeHighlights();
    // if (EXPLANATION["flipped"] && !alreadyFlipped) {
    //     flipPieces(EXPLANATION["flipped"]);
    // }
    if (existsValidPattern()) {
        // console.log("EXISTS!");
        computeBasePatterns();
        // console.log("basePatterns:", basePatterns);
        updatePolicy();
        savedSession = false;
        hasProvidedAdvice = false;
    }
    // const addButton = document.getElementById("add-button");
    // addButton.innerText = "Offer Advice";
    // addButton.onclick = addPattern;
    document.getElementById("blocker").remove();
    if (document.getElementById("rightClickMenu")) {
        closeRightClickMenu();
    }
    if (document.getElementsByClassName("pattern-area-container")) {
        document.getElementsByClassName("pattern-area-container")[0].remove();
    }
}

function openRightClickMenu(event) {
    event.preventDefault();
    const cell = event.target;
    let splitId;
    splitId = cell.id.split("|");
    pRow = parseInt(splitId[1]);
    pCol = parseInt(splitId[2]);
    if (PATTERN[pRow][pCol] > 1) {
        return;
    }
    let labels;
    if (pRow < 0 || pCol < 0 || pRow === N_ROWS || pCol === N_COLS) {
        labels = LABELS["border"];
    } else if (BOARD[pRow][pCol] === 0) {
        labels = LABELS["empty"];
    } else {
        labels = LABELS["occupied"];
    }
    const menuBlocker = document.createElement("div");
    menuBlocker.classList.add("specification-menu-blocker");
    menuBlocker.addEventListener("click", closeRightClickMenu);
    menuBlocker.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        closeRightClickMenu();
    });
    menuBlocker.id = "menuBlocker";
    document.body.append(menuBlocker);
    const rightClickMenu = document.createElement("div");
    rightClickMenu.classList.add("specification-menu-container");
    rightClickMenu.id = "rightClickMenu";
    rightClickMenu.style.top = event.pageY + "px";
    rightClickMenu.style.left = event.pageX + "px";
    rightClickMenu.innerHTML = labels["heading"];
    // rightClickMenu.appendChild(generateRadioRightClick(labels["labels"], labels["defaultIndex"]));
    rightClickMenu.appendChild(generateRadioRightClick(labels["labels"], PATTERN_SEMANTICS[pRow][pCol]));
    document.body.appendChild(rightClickMenu);
}

function closeRightClickMenu() {
    const menuBlocker = document.getElementById("menuBlocker");
    const rightClickMenu = document.getElementById("rightClickMenu");
    updatePatternSemantics();
    rightClickMenu.remove();
    menuBlocker.remove();
}

function updatePatternSemantics() {
    const radios = document.getElementsByName("menuRadio");
    let cellSemantics = 0;
    for (let i = 0; i < radios.length; i++) {
        if (radios[i].checked) {
            cellSemantics = i;
        }
    }
    PATTERN_SEMANTICS[pRow][pCol] = cellSemantics;
}

function generateRadioRightClick(labels, defaultIndex) {
    const container = document.createElement("div");
    let label, divElement, inputElement, labelElement;
    for (let i = 0; i < labels.length; i++) {
        label = labels[i]
        inputElement = document.createElement("input");
        inputElement.type = "radio";
        inputElement.id = label.toLowerCase().replace(/[^\w\s]/g,"").replace(/\s+/g,"-");
        inputElement.name = "menuRadio";
        // console.log(inputElement);
        if (i === defaultIndex) {
            inputElement.checked = true;
        }
        labelElement = document.createElement("label");
        labelElement.htmlFor = label.toLowerCase();
        labelElement.appendChild(document.createTextNode(label));
        divElement = document.createElement("div");
        divElement.appendChild(inputElement);
        divElement.appendChild(labelElement);
        container.appendChild(divElement);
    }
    return container;
}