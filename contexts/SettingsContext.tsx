import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    cloudSaveEnabled: boolean;
    toggleCloudSave: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('app_theme');
        return (saved as 'light' | 'dark') || 'light';
    });

    const [cloudSaveEnabled, setCloudSaveEnabled] = useState<boolean>(() => {
        const saved = localStorage.getItem('app_cloud_save');
        return saved !== null ? JSON.parse(saved) : true; // Default to true
    });

    useEffect(() => {
        localStorage.setItem('app_theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('app_cloud_save', JSON.stringify(cloudSaveEnabled));
    }, [cloudSaveEnabled]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const toggleCloudSave = () => {
        setCloudSaveEnabled(prev => !prev);
    };

    return (
        <SettingsContext.Provider value={{ theme, toggleTheme, cloudSaveEnabled, toggleCloudSave }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
