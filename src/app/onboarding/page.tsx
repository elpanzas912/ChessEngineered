// src/app/onboarding/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '@/styles/onboarding.css';

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [selections, setSelections] = useState<any>({
        rating: '',
        color: '',
        goal: '',
        commitment: ''
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('chessengineered_onboarding');
            if (stored) {
                try {
                    setSelections(JSON.parse(stored));
                } catch (e) {}
            }
        }
    }, []);

    const saveSelection = (key: string, value: string) => {
        const updated = { ...selections, [key]: value };
        setSelections(updated);
        localStorage.setItem('chessengineered_onboarding', JSON.stringify(updated));
    };

    const nextStep = () => {
        setStep(prev => Math.min(prev + 1, 5));
    };

    const prevStep = () => {
        setStep(prev => Math.max(prev - 1, 1));
    };

    const handleRatingSelect = (val: string) => {
        saveSelection('rating', val);
        nextStep();
    };

    const handleColorSelect = (val: string) => {
        saveSelection('color', val);
        nextStep();
    };

    const handleGoalSelect = (val: string) => {
        saveSelection('goal', val);
        nextStep();
    };

    const handleCommitmentSelect = (val: string) => {
        saveSelection('commitment', val);
        router.push('/checkout');
    };

    const progressPct = (step / 5) * 100;

    return (
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="onboarding-wrap" id="onboarding" style={{ display: 'block', width: '100%', maxWidth: '640px' }}>
                
                {/* Progress Header */}
                <div className="onboarding-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xl)' }}>
                    <button 
                        className="back-btn" 
                        id="backBtn" 
                        onClick={prevStep}
                        style={{ visibility: step > 1 ? 'visible' : 'hidden', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink)' }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6"/>
                        </svg>
                    </button>
                    <div className="progress-track-onboarding" style={{ flex: 1, height: '6px', background: 'var(--color-paper-2)', borderRadius: '3px', margin: '0 var(--space-md)', overflow: 'hidden' }}>
                        <div 
                            className="progress-fill-onboarding" 
                            id="progressBar" 
                            style={{ width: `${progressPct}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.3s ease' }}
                        ></div>
                    </div>
                    <div className="header-spacer" style={{ width: '24px' }}></div>
                </div>

                {/* Step 1: Welcome */}
                {step === 1 && (
                    <div className="step active">
                        <div className="step-content">
                            <div className="step-hero" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                                <div className="step-icon" style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>♟</div>
                                <h1 className="step-title">Welcome to the best chess opening trainer</h1>
                                <p className="step-lede" style={{ color: 'var(--color-muted)' }}>
                                    Master your openings with interactive practice. Join 500,000+ players.
                                </p>
                            </div>
                            <div className="step-options">
                                <button className="btn btn-primary btn-lg" onClick={nextStep} style={{ width: '100%' }}>
                                    Get Started
                                </button>
                                <p className="step-note" style={{ textAlign: 'center', marginTop: 'var(--space-md)', color: 'var(--color-muted)' }}>
                                    Already have an account? <Link href="/checkout" style={{ textDecoration: 'underline', color: 'var(--color-primary)' }}>Log in</Link>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Rating */}
                {step === 2 && (
                    <div className="step active">
                        <div className="step-content">
                            <h1 className="step-title" style={{ textAlign: 'center' }}>What's your current rating?</h1>
                            <p className="step-lede" style={{ textAlign: 'center', color: 'var(--color-muted)', marginBottom: 'var(--space-xl)' }}>
                                We'll build your plan around your level.
                            </p>
                            <div className="step-options" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <button className="option-btn option-select" onClick={() => handleRatingSelect('Under 1000')}>
                                    <span className="option-label">Under 1000</span>
                                    <span className="option-desc">Just starting out</span>
                                </button>
                                <button className="option-btn option-select" onClick={() => handleRatingSelect('1000 – 1400')}>
                                    <span className="option-label">1000 – 1400</span>
                                    <span className="option-desc">Club player</span>
                                </button>
                                <button className="option-btn option-select" onClick={() => handleRatingSelect('1400 – 1800')}>
                                    <span className="option-label">1400 – 1800</span>
                                    <span className="option-desc">Competitive player</span>
                                </button>
                                <button className="option-btn option-select" onClick={() => handleRatingSelect('1800+')}>
                                    <span className="option-label">1800+</span>
                                    <span className="option-desc">Tournament player</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Color */}
                {step === 3 && (
                    <div className="step active">
                        <div className="step-content">
                            <h1 className="step-title" style={{ textAlign: 'center' }}>Which side do you play most?</h1>
                            <p className="step-lede" style={{ textAlign: 'center', color: 'var(--color-muted)', marginBottom: 'var(--space-xl)' }}>
                                We'll prioritize openings for your color.
                            </p>
                            <div className="step-options step-options-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-md)' }}>
                                <button className="option-btn option-card" onClick={() => handleColorSelect('White')}>
                                    <span className="option-emoji" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>♔</span>
                                    <span className="option-label" style={{ fontWeight: 'bold' }}>White</span>
                                    <span className="option-desc" style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>1.e4 or 1.d4</span>
                                </button>
                                <button className="option-btn option-card" onClick={() => handleColorSelect('Black')}>
                                    <span className="option-emoji" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>♚</span>
                                    <span className="option-label" style={{ fontWeight: 'bold' }}>Black</span>
                                    <span className="option-desc" style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Sicilian, Caro-Kann...</span>
                                </button>
                                <button className="option-btn option-card" onClick={() => handleColorSelect('Both')}>
                                    <span className="option-emoji" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>♔♚</span>
                                    <span className="option-label" style={{ fontWeight: 'bold' }}>Both</span>
                                    <span className="option-desc" style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Build a full repertoire</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Goal */}
                {step === 4 && (
                    <div className="step active">
                        <div className="step-content">
                            <h1 className="step-title" style={{ textAlign: 'center' }}>What's your chess goal?</h1>
                            <p className="step-lede" style={{ textAlign: 'center', color: 'var(--color-muted)', marginBottom: 'var(--space-xl)' }}>
                                We'll tailor your training plan.
                            </p>
                            <div className="step-options" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <button className="option-btn option-select" onClick={() => handleGoalSelect('Stop blundering')}>
                                    <span className="option-label">Stop blundering in the opening</span>
                                    <span className="option-desc">Learn solid lines</span>
                                </button>
                                <button className="option-btn option-select" onClick={() => handleGoalSelect('Build repertoire')}>
                                    <span className="option-label">Build a reliable repertoire</span>
                                    <span className="option-desc">Know what to play every game</span>
                                </button>
                                <button className="option-btn option-select" onClick={() => handleGoalSelect('Gain rating')}>
                                    <span className="option-label">Gain rating points fast</span>
                                    <span className="option-desc">Trap-heavy, aggressive lines</span>
                                </button>
                                <button className="option-btn option-select" onClick={() => handleGoalSelect('Tournaments')}>
                                    <span className="option-label">Prepare for tournaments</span>
                                    <span className="option-desc">Deep theory, main lines</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 5: Commitment */}
                {step === 5 && (
                    <div className="step active">
                        <div className="step-content">
                            <h1 className="step-title" style={{ textAlign: 'center' }}>This is where you're headed</h1>
                            <p className="step-lede" style={{ textAlign: 'center', color: 'var(--color-muted)', marginBottom: 'var(--space-xl)' }}>
                                It won't happen overnight — but players who stick with it see real gains within 2 weeks.
                            </p>
                            <div className="step-options" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <button className="option-btn option-select" onClick={() => handleCommitmentSelect('5 min')}>
                                    <span className="option-label">5 min / day</span>
                                    <span className="option-desc">Casual progress</span>
                                </button>
                                <button className="option-btn option-select" onClick={() => handleCommitmentSelect('15 min')}>
                                    <span className="option-label">15 min / day</span>
                                    <span className="option-desc">Steady improvement</span>
                                </button>
                                <button className="option-btn option-select" onClick={() => handleCommitmentSelect('30 min')}>
                                    <span className="option-label">30 min / day</span>
                                    <span className="option-desc">Rapid growth</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
