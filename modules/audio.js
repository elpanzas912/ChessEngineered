const sounds = {
    gameStart: new Audio('sounds/game-start.mp3'),
    gameEnd: new Audio('sounds/game-end.mp3'),
    capture: new Audio('sounds/capture.mp3'),
    castle: new Audio('sounds/castle.mp3'),
    premove: new Audio('sounds/premove.mp3'),
    moveSelf: new Audio('sounds/move-self.mp3'),
    moveOpponent: new Audio('sounds/move-opponent.mp3'),
    check: new Audio('sounds/move-check.mp3'),
    promote: new Audio('sounds/promote.mp3'),
    notify: new Audio('sounds/notify.mp3'),
    illegal: new Audio('sounds/illegal.mp3'),
    tenSeconds: new Audio('sounds/tenseconds.mp3')
};

function soundsEnabled() {
    return localStorage.getItem('chesspeps_sound') !== 'false';
}

function playSound(name) {
    if (!soundsEnabled()) return;
    const snd = sounds[name];
    if (!snd) return;
    snd.currentTime = 0;
    snd.play().catch(() => {});
}

function moveHasFlag(move, flag) {
    return typeof move?.flags === 'string' && move.flags.includes(flag);
}

function isPlayerMove(move) {
    const trainer = window.trainer;
    if (!move?.color || !trainer) return true;

    if (trainer.mode === 'puzzle' && trainer.puzzlePlayerColor) {
        return move.color === trainer.puzzlePlayerColor;
    }

    return move.color === trainer.opening?.playerSide;
}

export function playMoveSound(move, options = {}) {
    if (!soundsEnabled()) return;

    if (options.illegal) {
        playSound('illegal');
        return;
    }

    if (window.game?.in_checkmate?.()) {
        playSound('check');
        window.setTimeout(() => playSound('gameEnd'), 120);
        return;
    }

    if (window.game?.in_check?.()) {
        playSound('check');
        return;
    }

    if (move?.promotion || moveHasFlag(move, 'p')) {
        playSound('promote');
        return;
    }

    if (moveHasFlag(move, 'k') || moveHasFlag(move, 'q') || move?.san === 'O-O' || move?.san === 'O-O-O') {
        playSound('castle');
        return;
    }

    if (move?.captured || moveHasFlag(move, 'c') || moveHasFlag(move, 'e') || move?.san?.includes('x')) {
        playSound('capture');
        return;
    }

    playSound(isPlayerMove(move) ? 'moveSelf' : 'moveOpponent');
}

export function playGameStartSound() {
    playSound('gameStart');
}

export function playCheckSound() {
    playSound('check');
}

export function playCheckmateSound() {
    playSound('check');
    window.setTimeout(() => playSound('gameEnd'), 120);
}

export function playCompletionSound() {
    playSound('notify');
}

export function playNotificationSound() {
    playSound('notify');
}

export function playIllegalMoveSound() {
    playSound('illegal');
}

export function playTenSecondsSound() {
    playSound('tenSeconds');
}

export function playPremoveSound() {
    playSound('premove');
}
