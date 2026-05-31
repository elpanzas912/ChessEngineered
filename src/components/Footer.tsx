// src/components/Footer.tsx
'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-inner">
                <div className="footer-grid">
                    <div className="footer-col">
                        <Link href="/openings" className="footer-logo" aria-label="ChessEngineered home">
                            <div className="logo-mark">
                                <svg viewBox="0 0 962 1973" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" clip-rule="evenodd" d="M260.013 382.733L182.267 165.24L354.227 210.947L475.627 0.0401493L598.907 214.787L773.933 165.24L696.826 380.947C636.506 335.054 561.24 307.787 479.6 307.787C396.893 307.787 320.733 335.76 260.013 382.733Z" fill="#FBBF24"/>
                                    <path fillRule="evenodd" clip-rule="evenodd" d="M480.067 401.747C619.853 401.747 733.173 515.067 733.173 654.853C733.173 740.693 690.427 816.547 625.067 862.307H676.12C699.52 862.307 718.653 881.453 718.653 904.84C718.653 928.24 699.52 947.373 676.12 947.373H635.28C635.28 947.373 577.187 1320.81 788.813 1474.35V1538.67C788.813 1538.67 927.813 1644.48 929.893 1700.49C931.96 1756.51 919.52 1783.48 919.52 1783.48C919.52 1783.48 977.613 1862.32 956.867 1920.41C937.867 1973.57 547.04 1972.87 480.92 1972.37C414.8 1972.87 23.96 1973.57 4.96001 1920.41C-15.7867 1862.32 42.3066 1783.48 42.3066 1783.48C42.3066 1783.48 29.8666 1756.51 31.9333 1700.49C34.0133 1644.48 173.013 1538.67 173.013 1538.67V1474.35C384.64 1320.81 326.547 947.373 326.547 947.373H290.227C266.84 947.373 247.693 928.24 247.693 904.84C247.693 881.453 266.84 862.307 290.227 862.307H335.067C269.693 816.547 226.947 740.693 226.947 654.853C226.947 515.067 340.28 401.747 480.067 401.747Z" fill="white"/>
                                </svg>
                            </div>
                        </Link>
                        <p className="footer-desc">The best website to help you master your chess opening repertoire.</p>
                    </div>
                    
                    <div className="footer-col">
                        <h3 className="footer-heading">Resources</h3>
                        <ul className="footer-links">
                            <li><Link href="/contact">Contact</Link></li>
                            <li><Link href="/plans">Pricing</Link></li>
                            <li><Link href="/privacy-policy">Privacy Policy</Link></li>
                            <li><Link href="/terms-and-conditions">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>
                
                <div className="footer-bottom">
                    <p className="footer-copy">© {new Date().getFullYear()} ChessEngineered</p>
                </div>
            </div>
        </footer>
    );
}
