import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Notification, NotificationType, createNotification } from '../services/notificationService';
import { NotificationContainer } from '../components/NotificationToast';

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (type: NotificationType, title: string, message: string, duration?: number) => void;
    removeNotification: (id: string) => void;
    clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

interface NotificationProviderProps {
    children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = useCallback(
        (type: NotificationType, title: string, message: string, duration: number = 5000) => {
            const notification = createNotification(type, title, message, duration);
            setNotifications((prev) => [...prev, notification]);
        },
        []
    );

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                addNotification,
                removeNotification,
                clearAllNotifications
            }}
        >
            {children}
            <NotificationContainer notifications={notifications} onDismiss={removeNotification} />
        </NotificationContext.Provider>
    );
};
