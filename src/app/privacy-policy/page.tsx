// src/app/privacy-policy/page.tsx
'use client';

import React from 'react';
import '@/styles/legal.css';

export default function PrivacyPolicyPage() {
    return (
        <div style={{ minHeight: '80vh' }}>
            <main className="legal-section">
                <header className="legal-header">
                    <h1 className="legal-title">Privacy Policy</h1>
                    <p className="legal-date">Last updated: May 26, 2026</p>
                </header>
                
                <div className="legal-content">
                    <p>At ChessEngineered, we take your privacy seriously. This policy describes what personal information we collect and how we use it.</p>
                    
                    <h2>1. Information We Collect</h2>
                    <p>We collect information you provide directly to us when you create an account, such as your name, email address, and password. We also collect data about your chess training progress, such as openings learned and time spent on the platform.</p>
                    
                    <h2>2. How We Use Information</h2>
                    <p>We use the information we collect to:</p>
                    <ul>
                        <li>Provide, maintain, and improve our services.</li>
                        <li>Track your training progress and sync it across devices.</li>
                        <li>Send you technical notices, updates, and support messages.</li>
                    </ul>

                    <h2>3. Information Sharing</h2>
                    <p>We do not share your personal information with third parties except as necessary to provide our services (e.g., payment processors like Stripe) or to comply with the law.</p>

                    <h2>4. Security</h2>
                    <p>We implement reasonable security measures to protect the security of your personal information both online and offline.</p>

                    <h2>5. Contact Us</h2>
                    <p>If you have any questions about this Privacy Policy, please contact us at support@chessengineered.com.</p>
                </div>
            </main>
        </div>
    );
}
