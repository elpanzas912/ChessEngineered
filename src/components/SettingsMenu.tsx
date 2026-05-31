// src/components/SettingsMenu.tsx
'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
    // Optional trainer-specific actions
    onCopyPgn?: () => void;
    onCopyFen?: () => void;
    onLichess?: () => void;
    onSelectLine?: () => void;
    onResetProgress?: () => void;
    showTrainerActions?: boolean;
}

export default function SettingsMenu({
    isOpen,
    onClose,
    onCopyPgn,
    onCopyFen,
    onLichess,
    onSelectLine,
    onResetProgress,
    showTrainerActions = false
}: SettingsMenuProps) {
    const {
        boardTheme,
        setBoardTheme,
        pieceSet,
        setPieceSet,
        showEval,
        setShowEval,
        trainingArrows,
        setTrainingArrows,
        dialogBehavior,
        setDialogBehavior,
        hapticEnabled,
        setHapticEnabled
    } = useApp();

    // Local states for settings not yet in global context but stored in localStorage
    const [soundEnabled, setSoundEnabledState] = React.useState(true);
    const [confettiEnabled, setConfettiEnabledState] = React.useState(true);

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            setSoundEnabledState(localStorage.getItem('chessengineered_sound') !== 'false');
            setConfettiEnabledState(localStorage.getItem('chessengineered_confetti') !== 'false');
        }
    }, []);

    const toggleSound = () => {
        const next = !soundEnabled;
        setSoundEnabledState(next);
        localStorage.setItem('chessengineered_sound', String(next));
    };

    const toggleConfetti = () => {
        const next = !confettiEnabled;
        setConfettiEnabledState(next);
        localStorage.setItem('chessengineered_confetti', String(next));
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="settings-menu-backdrop" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
            <div 
                className="settings-menu open" 
                id="settingsMenu" 
                role="menu" 
                aria-label="Settings" 
                style={{ position: 'absolute', right: 0, top: '100%', zIndex: 999, display: 'block' }}
            >
                <div className="settings-menu-title">Settings</div>
                <div className="settings-menu-separator"></div>
                
                <button 
                    className={`settings-menu-item is-check ${showEval ? 'checked' : ''}`} 
                    type="button" 
                    role="menuitemcheckbox" 
                    aria-checked={showEval}
                    onClick={() => setShowEval(!showEval)}
                >
                    <span className="settings-check" aria-hidden="true" style={{ opacity: showEval ? 1 : 0 }}>✓</span>
                    <span>Show Evaluation Bar</span>
                </button>
                
                <button 
                    className={`settings-menu-item is-check ${confettiEnabled ? 'checked' : ''}`} 
                    type="button" 
                    role="menuitemcheckbox" 
                    aria-checked={confettiEnabled}
                    onClick={toggleConfetti}
                >
                    <span className="settings-check" aria-hidden="true" style={{ opacity: confettiEnabled ? 1 : 0 }}>✓</span>
                    <span>Show Confetti</span>
                </button>
                
                <button 
                    className={`settings-menu-item is-check ${soundEnabled ? 'checked' : ''}`} 
                    type="button" 
                    role="menuitemcheckbox" 
                    aria-checked={soundEnabled}
                    onClick={toggleSound}
                >
                    <span className="settings-check" aria-hidden="true" style={{ opacity: soundEnabled ? 1 : 0 }}>✓</span>
                    <span>Play Sounds</span>
                </button>
                
                <button 
                    className={`settings-menu-item is-check ${hapticEnabled ? 'checked' : ''}`} 
                    type="button" 
                    role="menuitemcheckbox" 
                    aria-checked={hapticEnabled}
                    onClick={() => setHapticEnabled(!hapticEnabled)}
                >
                    <span className="settings-check" aria-hidden="true" style={{ opacity: hapticEnabled ? 1 : 0 }}>✓</span>
                    <span>Haptic Feedback</span>
                </button>
                
                <div className="settings-menu-separator"></div>
                <div className="settings-menu-title">Board Style</div>
                
                <label className="settings-select-row">
                    <span>Piece Set</span>
                    <select 
                        id="settingsPieceSet" 
                        value={pieceSet} 
                        onChange={(e) => setPieceSet(e.target.value)}
                    >
                        <option value="staunty">Staunty</option>
                        <option value="maestro">Maestro</option>
                        <option value="standard">Standard</option>
                    </select>
                </label>
                
                <label className="settings-select-row">
                    <span>Chessboard Theme</span>
                    <select 
                        id="settingsBoardTheme" 
                        value={boardTheme} 
                        onChange={(e) => setBoardTheme(e.target.value)}
                    >
                        <option value="green">Green</option>
                        <option value="white-violet">White Violet</option>
                        <option value="white-blue">White Blue</option>
                        <option value="blue">Blue</option>
                        <option value="chessboard-js">Brown</option>
                        <option value="default">Classic</option>
                        <option value="black-and-white">Black & White</option>
                    </select>
                </label>
                
                {showTrainerActions && (
                    <>
                        <div className="settings-menu-separator"></div>
                        <div className="settings-menu-title">Export &amp; Share</div>
                        <button className="settings-menu-item" type="button" onClick={onLichess}>Open in Lichess</button>
                        <button className="settings-menu-item" type="button" onClick={onCopyPgn}>Copy PGN</button>
                        <button className="settings-menu-item" type="button" onClick={onCopyFen}>Copy FEN</button>
                        
                        <div className="settings-menu-separator"></div>
                        <div className="settings-menu-title">Learn Settings</div>
                        
                        <label className="settings-select-row">
                            <span>Training Arrows</span>
                            <select 
                                id="settingsTrainingArrows" 
                                value={trainingArrows}
                                onChange={(e) => setTrainingArrows(e.target.value)}
                            >
                                <option value="on">On</option>
                                <option value="off">Off</option>
                            </select>
                        </label>
                        
                        <label className="settings-select-row">
                            <span>Learn Dialog</span>
                            <select 
                                id="settingsDialogBehavior" 
                                value={dialogBehavior}
                                onChange={(e) => setDialogBehavior(e.target.value)}
                            >
                                <option value="auto">Auto</option>
                                <option value="open">Always Open</option>
                                <option value="closed">Closed</option>
                            </select>
                        </label>
                        
                        <button className="settings-menu-item settings-menu-chevron" type="button" onClick={onSelectLine}>
                            <span>Select Line</span>
                            <span aria-hidden="true">›</span>
                        </button>
                        
                        <button className="settings-menu-item" type="button" onClick={onResetProgress}>Reset Progress</button>
                    </>
                )}
            </div>
        </>
    );
}
