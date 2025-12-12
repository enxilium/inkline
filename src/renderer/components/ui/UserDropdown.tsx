import React, { useState, useRef, useEffect } from 'react';
import { MenuIcon } from './Icons';

interface UserDropdownProps {
    userEmail: string;
    onLogout: () => void;
    onSettings: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ userEmail, onLogout, onSettings }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="user-dropdown-container" ref={dropdownRef} style={{ position: 'relative' }}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none' }}
            >
                <MenuIcon color="var(--text-subtle)" size={24} />
            </button>

            {isOpen && (
                <div className="project-card-menu" style={{ top: '100%', right: 0, marginTop: '0.5rem', width: '200px' }}>
                    <div className="project-card-menu-item-noninteractive">
                        <p>LOGGED IN AS</p>
                        {userEmail}
                    </div>
                    <button className="project-card-menu-item" onClick={() => {
                        setIsOpen(false);
                        onSettings();
                    }}>
                        Settings
                    </button>
                    <button 
                        className="project-card-menu-item is-danger" 
                        onClick={() => {
                            setIsOpen(false);
                            onLogout();
                        }}
                    >
                        Log out
                    </button>
                </div>
            )}
        </div>
    );
};
