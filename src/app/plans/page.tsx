// src/app/plans/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import '@/styles/pricing.css';

export default function PlansPage() {
    return (
        <div style={{ minHeight: '80vh' }}>
            {/* ── HEADER ── */}
            <header className="pricing-header">
                <div className="header-inner">
                    <div className="header-copy">
                        <h1 className="pricing-title">
                            Master your repertoire<br/>
                            <span className="accent">with Unlimited Pass</span>
                        </h1>
                        <p className="pricing-subtitle">
                            Unlock all 30+ openings, interactive training tools, and cloud synchronization.
                        </p>
                    </div>

                    <div className="pricing-cards-container">
                        <div className="pricing-card premium-card">
                            <div className="pricing-card-top">
                                <span className="pricing-badge">Unlimited Pass</span>
                                <div className="pricing-price">
                                    <span className="price-currency">$</span>
                                    <span className="price-value">11.99</span>
                                    <span className="price-period">/year</span>
                                </div>
                                <p className="pricing-equivalent">Less than $1/month</p>
                            </div>

                            <ul className="pricing-features">
                                <li>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                    All 30+ opening courses
                                </li>
                                <li>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                    Interactive board trainer
                                </li>
                                <li>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                    All modes: Learn, Practice, Drill, Time, Puzzles
                                </li>
                                <li>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                    Cloud sync across devices
                                </li>
                                <li>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                    Progress tracking
                                </li>
                            </ul>

                            <Link href="/checkout" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--space-md)' }}>
                                Upgrade — $11.99/year
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Free vs Unlimited ── */}
            <section className="compare-section">
                <div className="section-inner">
                    <h2 className="section-title">What you get</h2>
                    <div className="compare-grid">
                        <div className="compare-card">
                            <h3 className="compare-heading">Free</h3>
                            <ul className="compare-list">
                                <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>1 opening of your choice</li>
                                <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>All game modes</li>
                                <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>Progress tracking</li>
                                <li className="compare-no"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>Cloud sync</li>
                                <li className="compare-no"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>Multiple openings</li>
                            </ul>
                            <Link href="/openings" className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                                Get Started Free
                            </Link>
                        </div>
                        <div className="compare-card compare-premium">
                            <div className="compare-badge">Best Value</div>
                            <h3 className="compare-heading">Unlimited Pass</h3>
                            <div className="compare-price">
                                <span className="compare-amount">$11.99</span>
                                <span className="compare-period">/year</span>
                            </div>
                            <ul className="compare-list">
                                <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>All 30+ openings</li>
                                <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>All game modes</li>
                                <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>Progress tracking</li>
                                <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>Cloud sync</li>
                                <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>New openings added</li>
                            </ul>
                            <Link href="/checkout" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                                Upgrade Now
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Stats ── */}
            <section className="stats-section">
                <div className="section-inner stats-grid-3">
                    <div className="stat-item">
                        <span className="stat-number">500K+</span>
                        <span className="stat-label">active players</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">30+</span>
                        <span className="stat-label">opening courses</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">4.9</span>
                        <span className="stat-label">average rating</span>
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section className="faq-section">
                <div className="section-inner">
                    <h2 className="section-title">Common questions</h2>
                    <div className="faq-list">
                        <details className="faq-item">
                            <summary>What's included in the free tier?</summary>
                            <p>You get full access to one opening of your choice. All game modes, all lines, all features within that opening. No credit card required, no time limit.</p>
                        </details>
                        <details className="faq-item">
                            <summary>Can I change my free opening later?</summary>
                            <p>No, once you pick your free opening it's locked in. But you can upgrade to Unlimited Pass anytime to unlock all 30+ openings.</p>
                        </details>
                        <details className="faq-item">
                            <summary>Will it actually improve my game?</summary>
                            <p>Yes. Consistent practice with our trainer builds pattern recognition. Most users report feeling more confident in the opening within the first week.</p>
                        </details>
                        <details className="faq-item">
                            <summary>Can I use it on multiple devices?</summary>
                            <p>With Unlimited Pass, yes — your progress syncs automatically. The free tier saves locally on one device.</p>
                        </details>
                    </div>
                </div>
            </section>

            {/* ── Final CTA ── */}
            <section className="final-cta">
                <div className="section-inner final-cta-inner">
                    <div className="final-cta-copy">
                        <h2 className="final-cta-title">
                            Unlock everything<br/><span className="accent">for $11.99/year</span>
                        </h2>
                        <p className="final-cta-price">Less than $1/month. Cancel anytime.</p>
                    </div>
                    <div className="final-cta-actions">
                        <Link href="/checkout" className="btn btn-primary btn-lg">
                            Upgrade Now
                        </Link>
                        <p className="pricing-note">30-day money-back guarantee.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
