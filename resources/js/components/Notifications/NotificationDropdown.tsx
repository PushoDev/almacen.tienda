import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check } from 'lucide-react';
import React from 'react';
import { NotificationItem } from './NotificationItem';

interface NotificationDropdownProps {
    notifications: any[];
    unreadCount: number;
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    isLoading: boolean;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
    notifications,
    unreadCount,
    onMarkAsRead,
    onMarkAllAsRead,
    isLoading,
}) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-0.5 -right-0.5">
                            <Badge variant="destructive" className="flex h-5 w-5 items-center justify-center rounded-full px-0 py-0 text-[10px]">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                        </motion.div>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[380px]">
                <div className="flex items-center justify-between p-4 pb-2">
                    <DropdownMenuLabel className="p-0 text-base font-semibold">Notificaciones</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-primary h-auto p-0 text-xs"
                            onClick={onMarkAllAsRead}
                        >
                            <Check className="mr-1 h-3 w-3" />
                            Marcar todo leído
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[400px]">
                    <div className="flex flex-col">
                        <AnimatePresence initial={false}>
                            {notifications.length > 0 ? (
                                notifications.map((notification) => (
                                    <NotificationItem key={notification.id} notification={notification} onRead={onMarkAsRead} />
                                ))
                            ) : (
                                <div className="text-muted-foreground flex flex-col items-center justify-center py-10 text-center">
                                    <Bell className="mb-2 h-10 w-10 opacity-20" />
                                    <p className="text-sm">No tienes notificaciones</p>
                                </div>
                            )}
                        </AnimatePresence>
                        {isLoading && <div className="text-muted-foreground p-4 text-center text-xs">Actualizando...</div>}
                    </div>
                </ScrollArea>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <div className="text-muted-foreground hover:text-primary w-full cursor-pointer p-2 text-center text-xs">
                        Ver todas las notificaciones
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
