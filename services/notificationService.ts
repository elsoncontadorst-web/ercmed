import { Appointment } from '../types/health';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    duration?: number; // in milliseconds, 0 = no auto-dismiss
}

// Request browser notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return Notification.permission;
};

// Show browser native notification
export const showBrowserNotification = (title: string, options?: NotificationOptions): void => {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return;
    }

    if (Notification.permission === 'granted') {
        new Notification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            ...options
        });
    }
};

// Show notification for new appointment
export const notifyNewAppointment = (appointment: Appointment): void => {
    const title = 'Novo Agendamento';
    const message = `${appointment.patientName} - ${appointment.professionalName}\n${new Date(appointment.date).toLocaleDateString('pt-BR')} às ${appointment.time}`;

    showBrowserNotification(title, {
        body: message,
        tag: `appointment-${appointment.id}`,
        requireInteraction: false
    });
};

// Show notification for appointment status change
export const notifyAppointmentStatusChange = (appointment: Appointment, oldStatus: string): void => {
    const statusMap: Record<string, string> = {
        scheduled: 'Agendada',
        confirmed: 'Confirmada',
        completed: 'Realizada',
        cancelled: 'Cancelada'
    };

    const title = 'Status de Consulta Alterado';
    const message = `${appointment.patientName}\nStatus: ${statusMap[oldStatus]} → ${statusMap[appointment.status]}`;

    showBrowserNotification(title, {
        body: message,
        tag: `appointment-status-${appointment.id}`,
        requireInteraction: false
    });
};

// Generate unique notification ID
export const generateNotificationId = (): string => {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Create in-app notification object
export const createNotification = (
    type: NotificationType,
    title: string,
    message: string,
    duration: number = 5000
): Notification => {
    return {
        id: generateNotificationId(),
        type,
        title,
        message,
        duration
    };
};
