import { DropdownMenuItem } from '@/Components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, Lock, ShoppingCart, Truck } from 'lucide-react';
import React from 'react';

interface NotificationItemProps {
    notification: any;
    onRead: (id: string) => void;
}

const getIcon = (iconName: string) => {
    switch (iconName) {
        case 'shopping-cart':
            return <ShoppingCart className="h-4 w-4" />;
        case 'truck':
            return <Truck className="h-4 w-4" />;
        case 'lock':
            return <Lock className="h-4 w-4" />;
        case 'check':
            return <CheckCircle className="h-4 w-4" />;
        default:
            return <Bell className="h-4 w-4" />;
    }
};

const getColorClass = (color: string) => {
    switch (color) {
        case 'green':
            return 'text-green-500 bg-green-100 dark:bg-green-900/20';
        case 'blue':
            return 'text-blue-500 bg-blue-100 dark:bg-blue-900/20';
        case 'red':
            return 'text-red-500 bg-red-100 dark:bg-red-900/20';
        case 'purple':
            return 'text-purple-500 bg-purple-100 dark:bg-purple-900/20';
        default:
            return 'text-gray-500 bg-gray-100 dark:bg-gray-800';
    }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRead }) => {
    const { data, read_at, created_at } = notification;
    const isRead = !!read_at;

    return (
        <DropdownMenuItem
            className="cursor-pointer p-0 focus:bg-transparent"
            onClick={(e) => {
                e.preventDefault();
                onRead(notification.id);
            }}
        >
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                    'hover:bg-muted/50 flex w-full items-start gap-3 p-3 transition-colors',
                    isRead ? 'opacity-60' : 'bg-blue-50/50 dark:bg-blue-900/10',
                )}
            >
                <div className={cn('rounded-full p-2', getColorClass(data.color))}>{getIcon(data.icon)}</div>
                <div className="flex-1 space-y-1">
                    <p className="text-sm leading-none font-medium">{data.title}</p>
                    <p className="text-muted-foreground w-[240px] truncate text-xs">{data.message}</p>
                    <p className="text-muted-foreground/70 text-[10px]">{new Date(created_at).toLocaleString()}</p>
                </div>
                {!isRead && <div className="mt-2 h-2 w-2 rounded-full bg-blue-500" />}
            </motion.div>
        </DropdownMenuItem>
    );
};
