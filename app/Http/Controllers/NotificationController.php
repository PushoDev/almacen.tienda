<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NotificationController extends Controller
{
    /**
     * Fetch unread notifications for the authenticated user.
     * Used for polling.
     */
    public function index()
    {
        $user = Auth::user();

        $notifications = $user->unreadNotifications()->take(10)->get();
        $count = $user->unreadNotifications()->count();

        return response()->json([
            'notifications' => $notifications,
            'count' => $count,
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead($id)
    {
        $user = Auth::user();

        $notification = $user->notifications()->where('id', $id)->first();

        if ($notification) {
            $notification->markAsRead();
        }

        return response()->json(['success' => true]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead()
    {
        $user = Auth::user();
        $user->unreadNotifications->markAsRead();

        return response()->json(['success' => true]);
    }

    /**
     * View all notifications (history) with pagination.
     */
    public function history()
    {
        $user = Auth::user();

        // Ensure we only retrieve the authenticated user's notifications
        $notifications = $user->notifications()->paginate(20);

        return Inertia::render('Notifications/Index', [
            'notifications' => $notifications,
        ]);
    }
}
