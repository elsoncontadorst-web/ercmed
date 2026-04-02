import React, { useEffect } from 'react';
import { X, CheckCircle, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { Notification, NotificationType } from '../services/notificationService';

interface NotificationToastProps {
    notification: Notification;
    onDismiss: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
    useEffect(() => {
        if (notification.duration && notification.duration > 0) {
            const timer = setTimeout(() => {
                onDismiss(notification.id);
            }, notification.duration);

            return () => clearTimeout(timer);
        }
    }, [notification.id, notification.duration, onDismiss]);

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-5 h-5" />;
            case 'info':
                return <Info className="w-5 h-5" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5" />;
            case 'error':
                return <AlertCircle className="w-5 h-5" />;
        }
    };

    const getStyles = (type: NotificationType) => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-green-200 text-green-800';
            case 'info':
                return 'bg-blue-50 border-blue-200 text-blue-800';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            case 'error':
                return 'bg-red-50 border-red-200 text-red-800';
        }
    };

    const getIconColor = (type: NotificationType) => {
        switch (type) {
            case 'success':
                return 'text-green-500';
            case 'info':
                return 'text-blue-500';
            case 'warning':
                return 'text-yellow-500';
            case 'error':
                return 'text-red-500';
        }
    };

    return (
        <div
            className={`flex items-start gap-3 p-4 mb-3 border rounded-lg shadow-lg animate-slide-in-right ${getStyles(
                notification.type
            )}`}
            role="alert"
        >
            <div className={`flex-shrink-0 ${getIconColor(notification.type)}`}>
                {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold">{notification.title}</h4>
                <p className="text-sm mt-1 whitespace-pre-line">{notification.message}</p>
            </div>
            <button
                onClick={() => onDismiss(notification.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fechar notificação"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

interface NotificationContainerProps {
    notifications: Notification[];
    onDismiss: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
    notifications,
    onDismiss
}) => {
    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] w-full max-w-sm">
            {notifications.map((notification) => (
                <NotificationToast
                    key={notification.id}
                    notification={notification}
                    onDismiss={onDismiss}
                />
            ))}
        </div>
    );
};

export default NotificationToast;
