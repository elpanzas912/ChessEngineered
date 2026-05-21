import { Chessboard, COLOR, INPUT_EVENT_TYPE, BORDER_TYPE, FEN } from '../lib/cm-chessboard-src/Chessboard.js';
import { Markers } from '../lib/cm-chessboard-src/extensions/markers/Markers.js';
import { RightClickAnnotator } from '../lib/cm-chessboard-src/extensions/right-click-annotator/RightClickAnnotator.js';

let pendingIncorrectMove = null;

export function initBoard(element) {
    const board = new Chessboard(element, {
        assetsUrl: "../lib/cm-chessboard-assets/",
        position: FEN.start,
        style: {
            pieces: { file: "pieces/staunty.svg", tileSize: 40 },
            cssClass: "default",
            borderType: BORDER_TYPE.none,
            animationDuration: 250
        },
        orientation: COLOR.white,
        extensions: [{ class: Markers }, { class: RightClickAnnotator }]
    });
    return board;
}

export function moveInputHandler(event) {
    const trainer = window.trainer;
    const game = window.game;
    const board = window.board;

    if (!trainer || trainer.completed || trainer.isTransitioning) {
        return false;
    }

    if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
        document.body.classList.remove('show-mobile-modes');
        clearIncorrectCross();
        if (trainer.mode === 'puzzle' && trainer.historyIndex !== trainer.positionHistory.length - 1) {
            return false;
        }
        const piece = game.get(event.squareFrom);
        let playerColor;
        if (trainer.mode === 'puzzle') {
            playerColor = trainer.puzzlePlayerColor || game.turn();
        } else {
            playerColor = trainer.opening.playerSide;
        }
        if (!piece || piece.color !== playerColor) {
            return false;
        }
        const moves = game.moves({ square: event.squareFrom, verbose: true });
        if (moves.length > 0) {
            event.chessboard.addLegalMovesMarkers(moves);
        }
        return moves.length > 0;
    }

    if (event.type === INPUT_EVENT_TYPE.movingOverSquare) {
        return;
    }

    if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
        event.chessboard.removeLegalMovesMarkers();
        const legalMoves = game.moves({ square: event.squareFrom, verbose: true });
        const isLegal = legalMoves.some(m => m.from === event.squareFrom && m.to === event.squareTo);
        if (!isLegal) {
            pendingIncorrectMove = null;
            return false;
        }
        const valid = trainer.validateMove(event.squareFrom, event.squareTo);
        if (!valid) {
            pendingIncorrectMove = { from: event.squareFrom, to: event.squareTo };
            return true;
        }
        pendingIncorrectMove = null;
        return true;
    }

    if (event.type === INPUT_EVENT_TYPE.moveInputFinished) {
        if (pendingIncorrectMove) {
            showIncorrectCross(pendingIncorrectMove.to);
            setTimeout(() => {
                clearIncorrectCross();
                if (trainer && trainer.mode === 'puzzle' && trainer.currentPuzzle) {
                    board.setPosition(game.fen(), true);
                    setTimeout(() => {
                        trainer.enableCurrentMoveInput();
                        trainer.updateHistoryButtons();
                    }, 300);
                } else {
                    board.setPosition(game.fen(), true);
                    setTimeout(() => {
                        if (trainer && !trainer.completed) {
                            const playerColor = trainer.opening.playerSide === 'w' ? COLOR.white : COLOR.black;
                            board.enableMoveInput(moveInputHandler, playerColor);
                        }
                    }, 300);
                }
                pendingIncorrectMove = null;
            }, 700);
            return;
        }
        if (event.legalMove) {
            trainer.applyMove(event.squareFrom, event.squareTo);
            event.chessboard.disableMoveInput();
            setTimeout(() => {
                trainer && trainer.playOpponentMoves();
            }, trainer.mode === 'drill' ? 250 : 500);
        }
    }

    if (event.type === INPUT_EVENT_TYPE.moveInputCanceled) {
        event.chessboard.removeLegalMovesMarkers();
        clearIncorrectCross();
    }
}

export function highlightLastMove(from, to) {
    document.querySelectorAll('.cm-chessboard .square.last-move-from, .cm-chessboard .square.last-move-to').forEach(el => {
        el.classList.remove('last-move-from', 'last-move-to');
    });
    const fromEl = document.querySelector(`.cm-chessboard .square[data-square="${from}"]`);
    const toEl = document.querySelector(`.cm-chessboard .square[data-square="${to}"]`);
    if (fromEl) fromEl.classList.add('last-move-from');
    if (toEl) toEl.classList.add('last-move-to');
}

export function clearLastMove() {
    document.querySelectorAll('.cm-chessboard .square.last-move-from, .cm-chessboard .square.last-move-to').forEach(el => {
        el.classList.remove('last-move-from', 'last-move-to');
    });
}

export function showCorrectCheckmark(square) {
    clearCorrectCheckmark();
    const b = window.board;
    if (!b || !b.view) return;
    const svg = b.view.svg;
    const point = b.view.squareToPoint(square);
    const size = b.view.squareWidth * 0.38;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "correct-checkmark");
    g.setAttribute("transform", `translate(${point.x}, ${point.y})`);

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bg.setAttribute("cx", size / 2);
    bg.setAttribute("cy", size / 2);
    bg.setAttribute("r", size / 2);
    bg.setAttribute("fill", "#22c55e");
    g.appendChild(bg);

    const check = document.createElementNS("http://www.w3.org/2000/svg", "path");
    check.setAttribute("d", `M ${size * 0.22},${size * 0.52} L ${size * 0.42},${size * 0.72} L ${size * 0.78},${size * 0.30}`);
    check.setAttribute("stroke", "#fff");
    check.setAttribute("stroke-width", size * 0.13);
    check.setAttribute("fill", "none");
    check.setAttribute("stroke-linecap", "round");
    check.setAttribute("stroke-linejoin", "round");
    g.appendChild(check);

    svg.appendChild(g);
}

function clearCorrectCheckmark() {
    const b = window.board;
    if (!b || !b.view || !b.view.svg) return;
    b.view.svg.querySelectorAll(".correct-checkmark").forEach(el => el.remove());
}

export function showIncorrectCross(square) {
    clearIncorrectCross();
    const b = window.board;
    if (!b || !b.view) return;
    const svg = b.view.svg;
    const point = b.view.squareToPoint(square);
    const size = b.view.squareWidth * 0.38;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "incorrect-cross");
    g.setAttribute("transform", `translate(${point.x}, ${point.y})`);

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bg.setAttribute("cx", size / 2);
    bg.setAttribute("cy", size / 2);
    bg.setAttribute("r", size / 2);
    bg.setAttribute("fill", "#ca3331");
    g.appendChild(bg);

    const xPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    xPath.setAttribute("d", `M ${size * 0.28},${size * 0.28} L ${size * 0.72},${size * 0.72} M ${size * 0.72},${size * 0.28} L ${size * 0.28},${size * 0.72}`);
    xPath.setAttribute("stroke", "#fff");
    xPath.setAttribute("stroke-width", size * 0.14);
    xPath.setAttribute("fill", "none");
    xPath.setAttribute("stroke-linecap", "round");
    g.appendChild(xPath);

    svg.appendChild(g);
}

function clearIncorrectCross() {
    const b = window.board;
    if (!b || !b.view || !b.view.svg) return;
    b.view.svg.querySelectorAll(".incorrect-cross").forEach(el => el.remove());
}

export { clearCorrectCheckmark, clearIncorrectCross };

export function highlightHintSquare(square) {
    clearHintSquare();
    const squareEl = document.querySelector(`.cm-chessboard .square[data-square="${square}"]`);
    if (squareEl) {
        squareEl.classList.add('hint-square');
    }
}

function clearHintSquare() {
    document.querySelectorAll('.cm-chessboard .square.hint-square').forEach(el => el.classList.remove('hint-square'));
}

export { clearHintSquare };
