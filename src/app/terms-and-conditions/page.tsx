// src/app/terms-and-conditions/page.tsx
'use client';

import React from 'react';
import '@/styles/legal.css';

export default function TermsAndConditionsPage() {
    return (
        <div style={{ minHeight: '80vh' }}>
            <main className="legal-section">
                <header className="legal-header">
                    <h1 className="legal-title">Terms and Conditions</h1>
                    <p className="legal-date">Last updated: May 26, 2026</p>
                </header>
                
                <div className="legal-content">
                    <p>Please read these terms and conditions carefully before using the ChessEngineered website and application.</p>
                    
                    <h2>1. Acceptance of Terms</h2>
                    <p>By accessing or using our service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the service.</p>
                    
                    <h2>2. Subscriptions and Payments</h2>
                    <p>Some parts of the service are billed on a subscription basis ("Unlimited Pass"). You will be billed in advance on a recurring and periodic basis (e.g., annually). Your subscription will automatically renew under the exact same conditions unless you cancel it or ChessEngineered cancels it.</p>

                    <h2>3. Accounts</h2>
                    <p>When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms.</p>

                    <h2>4. Intellectual Property</h2>
                    <p>The Service and its original content, features, and functionality are and will remain the exclusive property of ChessEngineered and its licensors.</p>

                    <h2>5. Termination</h2>
                    <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
                </div>
            </main>
        </div>
    );
}
