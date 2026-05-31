// src/app/contact/page.tsx
'use client';

import React, { useState } from 'react';
import '@/styles/contact.css';

export default function ContactPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Thank you for your message! We will get in touch soon.');
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
    };

    return (
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
            <section className="contact-section" style={{ width: '100%' }}>
                <div className="contact-container">
                    <h1 className="contact-title">Get in touch</h1>
                    <p className="contact-lede">Have a question or feedback? We'd love to hear from you.</p>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input 
                                type="text" 
                                id="name" 
                                required 
                                placeholder="Magnus Carlsen"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input 
                                type="email" 
                                id="email" 
                                required 
                                placeholder="magnus@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="subject">Subject</label>
                            <input 
                                type="text" 
                                id="subject" 
                                required 
                                placeholder="How can we help?"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="message">Message</label>
                            <textarea 
                                id="message" 
                                required 
                                placeholder="Your message here..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            ></textarea>
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg btn-submit" style={{ width: '100%' }}>
                            Send Message
                        </button>
                    </form>
                </div>
            </section>
        </div>
    );
}
