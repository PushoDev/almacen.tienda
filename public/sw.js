/*
 * Service worker de los avisos push. Vive en la raíz (/sw.js) para controlar todo el sitio.
 * No guarda nada en caché: solo recibe el push y muestra la notificación del sistema,
 * incluso con la pestaña (o el navegador) cerrados.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    let aviso = {};

    try {
        aviso = event.data ? event.data.json() : {};
    } catch {
        aviso = { title: 'Nuevo aviso', body: event.data ? event.data.text() : '' };
    }

    const titulo = aviso.title || 'Nuevo aviso';
    const opciones = {
        body: aviso.body || '',
        icon: aviso.icon || '/apple-touch-icon.png',
        badge: aviso.badge || '/favicon.svg',
        tag: aviso.tag || undefined,
        renotify: Boolean(aviso.tag),
        data: aviso.data || {},
    };

    event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const destino = new URL((event.notification.data && event.notification.data.url) || '/dashboard', self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
            for (const ventana of ventanas) {
                if (new URL(ventana.url).origin === self.location.origin && 'focus' in ventana) {
                    return ventana.focus().then((enfocada) => ('navigate' in enfocada ? enfocada.navigate(destino) : enfocada));
                }
            }

            return self.clients.openWindow(destino);
        }),
    );
});
