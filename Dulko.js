// --- Global Variables & Initial Setup ---
const board = []; // 9x9 grid: each cell will hold an object { piece, owner, ... }
const deadzone = { row: Math.floor(Math.random() * 9), col: Math.floor(Math.random() * 9) };
let currentPlayer = 1;
let playerScores = { 1: 0, 2: 0 };

// Each player starts with 40 pieces:
// Special: K (King), Q (Queen), B (Bishop), A (Ace)
// Numbers: "2" through "8" (5 of each)
const initialPieces = {
    K: 1,
    Q: 1,
    B: 1,
    A: 2,
    2: 5,
    3: 5,
    4: 5,
    5: 5,
    6: 5,
    7: 5,
    8: 5,
};
let playerPieces = {
    1: { ...initialPieces },
    2: { ...initialPieces },
};

let selectedPieceType = null; // Holds piece type when selected via click
let selectedPieceElement = null; // The DOM element that is selected
let gameEnded = false;

// --- Board Creation ---
function createBoard() {
    const gameBoard = document.getElementById("gameBoard");
    for (let row = 0; row < 9; row++) {
        board[row] = [];
        for (let col = 0; col < 9; col++) {
            const cellDiv = document.createElement("div");
            cellDiv.classList.add("cell");
            cellDiv.dataset.row = row;
            cellDiv.dataset.col = col;
            if (row === deadzone.row && col === deadzone.col) {
                cellDiv.classList.add("deadzone");
                board[row][col] = { deadzone: true };
            } else {
                board[row][col] = null;
                // Click-based placement:
                cellDiv.addEventListener("click", () => handleCellClick(row, col));
                // Drag & drop events:
                cellDiv.addEventListener("dragover", handleDragOver);
                cellDiv.addEventListener("drop", (e) => handleDrop(e, row, col));
            }
            gameBoard.appendChild(cellDiv);
        }
    }
}

// --- Piece Bank UI ---
function updatePieceBanks() {
    // Update Player 1 bank
    updatePlayerBank(1);
    // Update Player 2 bank
    updatePlayerBank(2);
}

function updatePlayerBank(playerNum) {
    const bank = document.getElementById(`player${playerNum}Pieces`);
    bank.innerHTML = "";

    const pieceTypes = ["2", "3", "4", "5", "6", "7", "8", "K", "Q", "B", "A"];

    pieceTypes.forEach(piece => {
        const pieceRow = document.createElement("div");
        pieceRow.classList.add("piece-row");

        for (let i = 0; i < playerPieces[playerNum][piece]; i++) {
            const pieceElem = createPieceElement(piece, playerNum);
            pieceRow.appendChild(pieceElem);
        }

        bank.appendChild(pieceRow);
    });
}

function createPieceElement(piece, playerNum) {
    const pieceElem = document.createElement("div");
    pieceElem.classList.add("piece");
    pieceElem.textContent = piece;
    pieceElem.dataset.piece = piece;
    pieceElem.dataset.player = playerNum;
    if (currentPlayer === playerNum) {
        pieceElem.draggable = true;
        pieceElem.addEventListener("click", () => handlePieceClick(pieceElem));
        pieceElem.addEventListener("dragstart", handleDragStart);
    } else {
        pieceElem.style.opacity = 0.5;
    }
    return pieceElem;
}

// --- Piece Selection & Drag/Drop Handlers ---
function handlePieceClick(pieceElem) {
  if (parseInt(pieceElem.dataset.player) !== currentPlayer) return;
  // Toggle selection: if already selected, deselect.
  if (selectedPieceElement) {
    selectedPieceElement.classList.remove("selected");
    if (selectedPieceElement === pieceElem) {
      selectedPieceElement = null;
      selectedPieceType = null;
      return;
    }
  }
  selectedPieceElement = pieceElem;
  selectedPieceType = pieceElem.dataset.piece;
  pieceElem.classList.add("selected");
}

function handleDragStart(e) {
  e.dataTransfer.setData("text/plain", e.target.dataset.piece);
}

function handleDragOver(e) {
  e.preventDefault(); // Allow drop
}

function handleDrop(e, row, col) {
  e.preventDefault();
  const piece = e.dataTransfer.getData("text/plain");
  if (!isValidMove(row, col, piece)) {
    //alert("Invalid move!");
    return;
  }
  placePiece(row, col, piece);
  // Clear any click selection.
  selectedPieceType = null;
  if (selectedPieceElement) {
    selectedPieceElement.classList.remove("selected");
    selectedPieceElement = null;
  }
  if (!gameEnded) switchPlayer();
}

// --- Board Cell Click (for click-to-place) ---
function handleCellClick(row, col) {
  if (!selectedPieceType) {
    alert("Select a piece from your bank first!");
    return;
  }
  if (!isValidMove(row, col, selectedPieceType)) {
    //alert("Invalid move!");
    return;
  }
  placePiece(row, col, selectedPieceType);
  selectedPieceType = null;
  if (selectedPieceElement) {
    selectedPieceElement.classList.remove("selected");
    selectedPieceElement = null;
  }
  if (!gameEnded) switchPlayer();
}

// --- Move Validation ---
// Numbers obey Sudoku rules; special pieces (K, Q, B, A) require no other special in row/col/square (and for Bishop, diagonals).
function isValidMove(row, col, piece) {
    if (board[row][col] !== null && piece !== "A") return false; // Aces can be placed anywhere
    if (row === deadzone.row && col === deadzone.col && piece !== "A") return false; // Aces can be placed anywhere

    if (isSpecial(piece) && piece !== "A") { // Aces are wild
        if (piece === "K"){
            if (hasOtherSpecialInRow(row, "A") || hasOtherSpecialInCol(col, "A") || hasOtherSpecialInSquare(row, col, "A")){
                return true;
            }
        }
        if (hasOtherSpecialInRow(row) && piece !=="K") return false;
        if (hasOtherSpecialInCol(col) && piece !=="K") return false;
        if (hasOtherSpecialInSquare(row, col) && piece !=="K") return false;
        if (piece === "B" && hasSpecialInDiagonals(row, col)) return false;
    } else if (!isSpecial(piece) && piece !== "A") { // Aces are wild
        if (hasNumberInRow(row, piece) || hasNumberInCol(col, piece) || hasNumberInSquare(row, col, piece)) return false;
    }
    return true;
}

//Is this used???
function isSpecial(piece) {
  return ["K", "Q", "B", "A"].includes(piece);
}

function hasOtherSpecialInRow(row, pieceToExclude) {
    for (let col = 0; col < 9; col++) {
        const cell = board[row][col];
        if (cell && cell.piece && isSpecial(cell.piece) && cell.piece !== pieceToExclude) return true;
    }
    return false;
}

function hasOtherSpecialInCol(col, pieceToExclude) {
    for (let row = 0; row < 9; row++) {
        const cell = board[row][col];
        if (cell && cell.piece && isSpecial(cell.piece) && cell.piece !== pieceToExclude) return true;
    }
    return false;
}

function hasOtherSpecialInSquare(row, col, pieceToExclude) {
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
            const cell = board[r][c];
            if (cell && cell.piece && isSpecial(cell.piece) && cell.piece !== pieceToExclude) return true;
        }
    }
    return false;
}

function hasSpecialInDiagonals(row, col) {
  // Check top-left to bottom-right diagonal
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (r - c === row - col) {
        const cell = board[r][c];
        if (cell && cell.piece && isSpecial(cell.piece)) return true;
      }
    }
  }
  // Check top-right to bottom-left diagonal
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (r + c === row + col) {
        const cell = board[r][c];
        if (cell && cell.piece && isSpecial(cell.piece)) return true;
      }
    }
  }
  return false;
}

function hasNumberInRow(row, num) {
  for (let col = 0; col < 9; col++) {
    const cell = board[row][col];
    if (cell && cell.piece === num) return true;
  }
  return false;
}
function hasNumberInCol(col, num) {
  for (let row = 0; row < 9; row++) {
    const cell = board[row][col];
    if (cell && cell.piece === num) return true;
  }
  return false;
}
function hasNumberInSquare(row, col, num) {
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      const cell = board[r][c];
      if (cell && cell.piece === num) return true;
    }
  }
  return false;
}

// --- Placing a Piece & Updating the Board ---
function placePiece(row, col, piece) {
    const cellObj = { piece, owner: currentPlayer };
    board[row][col] = cellObj;
    const cellDiv = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
    cellDiv.textContent = piece;
    cellDiv.classList.add(currentPlayer === 1 ? "player1" : "player2");

    // Calculate base score:
    let baseScore = 0;
    if (!isSpecial(piece)) {
        baseScore = parseInt(piece);
    } else {
        if (piece === "K") baseScore = 50;
        else if (piece === "A") {
            if (hasKingInRow(row) || hasKingInCol(col) || hasKingInSquare(row, col))
                baseScore = 11;
            else
                baseScore = 1;
        }
    }
    playerScores[currentPlayer] += baseScore;
    playerPieces[currentPlayer][piece]--;
    updateScore();
    updatePieceBanks();

    // Apply special piece capture effects.
    if (isSpecial(piece)) {
        applySpecialEffects(row, col, piece);
    }

    // Check for row/col/square conversion bonus.
    checkConversion(row, col);

    // Update Ace scores if a King is placed
    if (piece === "K") {
        updateAceScores(row, col);
    }
}

function updateAceScores(row, col) {
    // Check row
    for (let c = 0; c < 9; c++) {
        if (board[row][c] && board[row][c].piece === "A" && board[row][c].owner === currentPlayer) {
            playerScores[currentPlayer] -= 1; // Subtract old score
            playerScores[currentPlayer] += 11; // Add new score
        }
    }

    // Check column
    for (let r = 0; r < 9; r++) {
        if (board[r][col] && board[r][col].piece === "A" && board[r][col].owner === currentPlayer) {
            playerScores[currentPlayer] -= 1; // Subtract old score
            playerScores[currentPlayer] += 11; // Add new score
        }
    }

    // Check square
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
            if (board[r][c] && board[r][c].piece === "A" && board[r][c].owner === currentPlayer) {
                playerScores[currentPlayer] -= 1; // Subtract old score
                playerScores[currentPlayer] += 11; // Add new score
            }
        }
    }
    updateScore();
}

function hasKingInRow(row) {
  for (let col = 0; col < 9; col++) {
    const cell = board[row][col];
    if (cell && cell.piece === "K") return true;
  }
  return false;
}
function hasKingInCol(col) {
  for (let row = 0; row < 9; row++) {
    const cell = board[row][col];
    if (cell && cell.piece === "K") return true;
  }
  return false;
}
function hasKingInSquare(row, col) {
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      const cell = board[r][c];
      if (cell && cell.piece === "K") return true;
    }
  }
  return false;
}

// --- Special Effects & Capturing Mechanics ---
function applySpecialEffects(row, col, piece) {
  if (piece === "Q") {
    captureRowColSquare(row, col);
  } else if (piece === "K") {
    captureAdjacent(row, col);
  } else if (piece === "B") {
    captureDiagonals(row, col);
  }
  // Ace has no capture effect.
}

function captureCell(row, col) {
    const cell = board[row][col];
    if (!cell || !cell.piece || cell.deadzone) return;
    if (cell.owner === currentPlayer) return;

    let value = 0;
    if (!isSpecial(cell.piece)) value = parseInt(cell.piece);
    else if (cell.piece === "K") value = 50;
    else if (cell.piece === "A") {
        if (hasKingInRow(row) || hasKingInCol(col) || hasKingInSquare(row, col))
            value = 11;
        else
            value = 1;
    }

    playerScores[currentPlayer] += value;
    playerScores[cell.owner] -= value;
    cell.owner = currentPlayer;
    const cellDiv = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
    cellDiv.classList.remove("player1", "player2");
    cellDiv.classList.add(currentPlayer === 1 ? "player1" : "player2");
    updateScore();

    // End game immediately if a King is captured.
    if (cell.piece === "K") {
        alert(`Player ${currentPlayer} captured the King! Game over.`);
        disableBoard();
        gameEnded = true;
    }
}

function captureRowColSquare(row, col) {
  const toCapture = new Set();
  for (let c = 0; c < 9; c++) {
    if (c === col) continue;
    if (board[row][c] && board[row][c].piece && !board[row][c].deadzone && board[row][c].owner !== currentPlayer)
      toCapture.add(`${row},${c}`);
  }
  for (let r = 0; r < 9; r++) {
    if (r === row) continue;
    if (board[r][col] && board[r][col].piece && !board[r][col].deadzone && board[r][col].owner !== currentPlayer)
      toCapture.add(`${r},${col}`);
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      if (r === row && c === col) continue;
      if (board[r][c] && board[r][c].piece && !board[r][c].deadzone && board[r][c].owner !== currentPlayer)
        toCapture.add(`${r},${c}`);
    }
  }
  toCapture.forEach(coord => {
    const [r, c] = coord.split(",").map(Number);
    captureCell(r, c);
  });
}

function captureAdjacent(row, col) {
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1], [1, 0],  [1, 1]
  ];
  directions.forEach(([dr, dc]) => {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < 9 && c >= 0 && c < 9) {
      if (board[r][c] && board[r][c].piece && !board[r][c].deadzone && board[r][c].owner !== currentPlayer)
        captureCell(r, c);
    }
  });
}

function captureDiagonals(row, col) {
  let r = row - 1, c = col - 1;
  while (r >= 0 && c >= 0) {
    if (board[r][c] && board[r][c].piece && !board[r][c].deadzone && board[r][c].owner !== currentPlayer)
      captureCell(r, c);
    r--; c--;
  }
  r = row - 1; c = col + 1;
  while (r >= 0 && c < 9) {
    if (board[r][c] && board[r][c].piece && !board[r][c].deadzone && board[r][c].owner !== currentPlayer)
      captureCell(r, c);
    r--; c++;
  }
  r = row + 1; c = col - 1;
  while (r < 9 && c >= 0) {
    if (board[r][c] && board[r][c].piece && !board[r][c].deadzone && board[r][c].owner !== currentPlayer)
      captureCell(r, c);
    r++; c--;
  }
  r = row + 1; c = col + 1;
  while (r < 9 && c < 9) {
    if (board[r][c] && board[r][c].piece && !board[r][c].deadzone && board[r][c].owner !== currentPlayer)
      captureCell(r, c);
    r++; c++;
  }
}

// --- Conversion Bonus (Full Row/Col/Square) ---
function checkConversion(row, col) {
  if (isCompleteRow(row)) convertRow(row);
  if (isCompleteCol(col)) convertCol(col);
  if (isCompleteSquare(row, col)) convertSquare(row, col);
}
function isCompleteRow(row) {
  for (let col = 0; col < 9; col++) {
    if (row === deadzone.row && col === deadzone.col) continue;
    if (!board[row][col] || (board[row][col] && board[row][col].deadzone)) return false;
  }
  return true;
}
function isCompleteCol(col) {
  for (let row = 0; row < 9; row++) {
    if (row === deadzone.row && col === deadzone.col) continue;
    if (!board[row][col] || (board[row][col] && board[row][col].deadzone)) return false;
  }
  return true;
}
function isCompleteSquare(row, col) {
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      if (r === deadzone.row && c === deadzone.col) continue;
      if (!board[r][c] || (board[r][c] && board[r][c].deadzone)) return false;
    }
  }
  return true;
}
function convertRow(row) {
  for (let col = 0; col < 9; col++) {
    if (row === deadzone.row && col === deadzone.col) continue;
    if (board[row][col] && board[row][col].piece && board[row][col].owner !== currentPlayer)
      captureCell(row, col);
  }
}
function convertCol(col) {
  for (let row = 0; row < 9; row++) {
    if (row === deadzone.row && col === deadzone.col) continue;
    if (board[row][col] && board[row][col].piece && board[row][col].owner !== currentPlayer)
      captureCell(row, col);
  }
}
function convertSquare(row, col) {
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      if (r === deadzone.row && c === deadzone.col) continue;
      if (board[r][c] && board[r][c].piece && board[r][c].owner !== currentPlayer)
        captureCell(r, c);
    }
  }
}

// --- Turn & Score Management ---
function switchPlayer() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  document.getElementById("turnIndicator").textContent = `Player ${currentPlayer}'s Turn`;
  updatePieceBanks();
}
function updateScore() {
  document.getElementById("scoreDisplay").textContent =
    `Player 1: ${playerScores[1]} | Player 2: ${playerScores[2]}`;
}
function disableBoard() {
  document.querySelectorAll(".cell").forEach(cell => {
    cell.replaceWith(cell.cloneNode(true));
  });
  alert("Game Over");
}

// --- Initialization ---
createBoard();
updatePieceBanks();
updateScore();
