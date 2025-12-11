import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";

export const SettingsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const [accent, setAccent] = useState("#2ef6ad");
    const [surface, setSurface] = useState("#222324");
    const [surfaceStrong, setSurfaceStrong] = useState("#202022");
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        const styles = getComputedStyle(document.documentElement);
        const getHex = (varName: string) => {
            const val = styles.getPropertyValue(varName).trim();
            if (val.startsWith('#') && val.length > 7) {
                return val.substring(0, 7);
            }
            return val;
        };

        const currentAccent = getHex('--accent');
        if (currentAccent) setAccent(currentAccent);

        const currentSurface = getHex('--surface');
        if (currentSurface) setSurface(currentSurface);

        const currentSurfaceStrong = getHex('--surface-strong');
        if (currentSurfaceStrong) setSurfaceStrong(currentSurfaceStrong);
        
        const textColor = styles.getPropertyValue('--text').trim();
        // Check if text is light (indicating dark mode)
        // #f6f7fb is the default light text color
        setIsDarkMode(textColor.toLowerCase() === '#f6f7fb');
    }, []);

    const updateCssVar = (name: string, value: string) => {
        document.documentElement.style.setProperty(name, value);
    };

    const handleAccentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAccent(val);
        updateCssVar('--accent', val);
        updateCssVar('--accent-transparent', val + '11');
        updateCssVar('--accent-transparent2', val + '44');
        updateCssVar('--accent-light', val); 
    };

    const handleSurfaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSurface(val);
        updateCssVar('--surface', val);
    };

    const handleSurfaceStrongChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSurfaceStrong(val);
        updateCssVar('--surface-strong', val);
    };

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        if (newMode) {
            updateCssVar('--text', '#f6f7fb');
        } else {
            updateCssVar('--text', '#242424');
        }
    };

    const handleReset = () => {
        setAccent("#2ef6ad");
        setSurface("#222324");
        setSurfaceStrong("#202022");
        setIsDarkMode(true);

        updateCssVar('--accent', '#2ef6ad');
        updateCssVar('--accent-transparent', '#2ef6ad11');
        updateCssVar('--accent-transparent2', '#2ef6ad44');
        updateCssVar('--accent-light', '#b4ffeb');
        
        updateCssVar('--surface', '#22232400');
        updateCssVar('--surface-strong', '#20202200');
        
        updateCssVar('--text', '#f6f7fb');
    };

    return (
        <div className="gateway-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="panel-label-container">
                <p className="panel-label">Settings</p>
                <Button onClick={handleReset} variant="ghost" className="btn-sm">
                    Reset to Defaults
                </Button>
            </div>
            <h2>Application Settings</h2>
            <p className="panel-subtitle">
                Customize the look and feel of Inkline.
            </p>
            
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                <div className="dialog-field">
                    <Label>Theme Mode</Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Button onClick={toggleTheme} variant="secondary" style={{ flex: 1 }}>
                            {isDarkMode ? "Switch to Light Mode (Text)" : "Switch to Dark Mode (Text)"}
                        </Button>
                    </div>
                    <p className="helper-text">Toggles the text color between light and dark.</p>
                </div>

                <div className="dialog-field">
                    <Label htmlFor="accent-color">Accent Color</Label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <Input 
                            id="accent-color" 
                            type="color" 
                            value={accent} 
                            onChange={handleAccentChange} 
                            style={{ height: '40px', padding: '2px', width: '60px', flex: 'none' }}
                        />
                        <span style={{ fontFamily: 'monospace' }}>{accent}</span>
                    </div>
                </div>

                <div className="dialog-field">
                    <Label htmlFor="surface-color">Surface Color</Label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <Input 
                            id="surface-color" 
                            type="color" 
                            value={surface} 
                            onChange={handleSurfaceChange} 
                            style={{ height: '40px', padding: '2px', width: '60px', flex: 'none' }}
                        />
                        <span style={{ fontFamily: 'monospace' }}>{surface}</span>
                    </div>
                </div>

                <div className="dialog-field">
                    <Label htmlFor="surface-strong-color">Surface Strong Color</Label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <Input 
                            id="surface-strong-color" 
                            type="color" 
                            value={surfaceStrong} 
                            onChange={handleSurfaceStrongChange} 
                            style={{ height: '40px', padding: '2px', width: '60px', flex: 'none' }}
                        />
                        <span style={{ fontFamily: 'monospace' }}>{surfaceStrong}</span>
                    </div>
                </div>

                {onBack && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--stroke)', paddingTop: '1rem' }}>
                        <Button onClick={onBack} variant="ghost">
                            Back to Projects
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};