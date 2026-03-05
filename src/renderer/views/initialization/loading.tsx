import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import lottie from 'lottie-web';
import lineLoopAnimation from '../../../../assets/line-loop.json';

const LoadingScreen = () => {
    const lottieRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!lottieRef.current) return;

        const instance = lottie.loadAnimation({
            container: lottieRef.current,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData: lineLoopAnimation,
        });

        return () => {
            instance.destroy();
        };
    }, []);

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
            <div
                ref={lottieRef}
                style={{
                    marginTop: '20px',
                    marginBottom: '10px',
                    width: '120px',
                    height: '24px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            />
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<LoadingScreen />);
}
