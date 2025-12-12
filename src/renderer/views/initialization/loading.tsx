import React from 'react';
import { createRoot } from 'react-dom/client';

const LoadingScreen = () => {
    return (
        <div style={{
            fontFamily: 'sans-serif',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#e0e0e0',
            flexDirection: 'column',
            margin: 0,
            padding: '0px',
            userSelect: 'none',
            WebkitAppRegion: 'drag'
        } as React.CSSProperties}>
            <h2 style={{ marginTop: '10px', marginBottom: '10px' }}>INKLINE STUDIO</h2>
            <div style={{ fontSize: '14px', color: '#5e5f66ff' }}>Launching App...</div>
            <div style={{
                marginTop: '20px',
                marginBottom: '10px',
                width: '100px',
                height: '24px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <svg width="120" height="24" viewBox="0 0 100 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4a90e2" />
                            <stop offset="100%" stopColor="#50e39c" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M1 12C15 12 15 4 30 4C45 4 45 20 60 20C75 20 75 12 99 12"
                        stroke="transparent"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <path
                        d="M1 12C15 12 15 4 30 4C45 4 45 20 60 20C75 20 75 12 99 12"
                        stroke="url(#strokeGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray="110"
                        strokeDashoffset="110"
                        style={{ animation: 'draw 2s ease-in-out infinite' }}
                    />
                </svg>
            </div>
            <style>{`
                @keyframes draw {
                    0% { stroke-dashoffset: 110; }
                    50% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: -110; }
                }
            `}</style>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<LoadingScreen />);
}
