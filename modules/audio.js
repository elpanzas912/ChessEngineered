const sounds = {
    move: new Audio('sounds/move.mp3'),
    capture: new Audio('sounds/capture.mp3')
};

export function playMoveSound(move) {
    const isCapture = move && (move.captured || (move.san && move.san.includes('x')));
    const snd = isCapture ? sounds.capture : sounds.move;
    snd.currentTime = 0;
    snd.play().catch(() => {});

    setTimeout(() => {
        detectCheckSounds();
    }, 150);
}

function detectCheckSounds() {
    if (!window.game) return;
    if (window.game.in_checkmate()) {
        playCheckmateSound();
    } else if (window.game.in_check()) {
        playCheckSound();
    }
}

function playCheckSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        [0, 0.08].forEach((delay, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.value = 1200 + i * 200;
            gain.gain.setValueAtTime(0.12, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);
            osc.start(now + delay);
            osc.stop(now + delay + 0.15);
        });
    } catch (e) {}
}

function playCheckmateSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.5);
        });
    } catch (e) {}
}

function playCompletionSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523.25, 659.25, 783.99, 1046.50];
        const now = audioCtx.currentTime;
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.08, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.6);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.6);
        });
    } catch (e) {}
}

export { playCheckSound, playCheckmateSound, playCompletionSound };