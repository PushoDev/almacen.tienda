import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

export type PermisoPush = NotificationPermission | 'no-soportado';

interface ConfigPush {
    habilitado: boolean;
    public_key: string | null;
}

function claveVapidABytes(base64Url: string): Uint8Array<ArrayBuffer> {
    const relleno = '='.repeat((4 - (base64Url.length % 4)) % 4);
    const base64 = (base64Url + relleno).replace(/-/g, '+').replace(/_/g, '/');
    const binario = window.atob(base64);
    const bytes = new Uint8Array(new ArrayBuffer(binario.length));

    for (let i = 0; i < binario.length; i++) {
        bytes[i] = binario.charCodeAt(i);
    }

    return bytes;
}

function navegadorSoportaPush(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Estado y acciones de los avisos push de este dispositivo.
 * - `permiso`: lo que el navegador ya decidió ('default' = aún no se le preguntó).
 * - `suscrito`: este dispositivo está registrado en el servidor.
 * - `disponible`: el servidor tiene claves VAPID y el navegador soporta push.
 */
export function usePushNotifications() {
    const [permiso, setPermiso] = useState<PermisoPush>(() => (navegadorSoportaPush() ? Notification.permission : 'no-soportado'));
    const [suscrito, setSuscrito] = useState(false);
    const [disponible, setDisponible] = useState(false);
    const [listo, setListo] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [clavePublica, setClavePublica] = useState<string | null>(null);

    const suscribirDispositivo = useCallback(async (clave: string): Promise<boolean> => {
        const registro = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const existente = await registro.pushManager.getSubscription();
        const suscripcion =
            existente ?? (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveVapidABytes(clave) }));

        const datos = suscripcion.toJSON();

        await axios.post(route('push.suscripciones.store'), {
            endpoint: datos.endpoint,
            keys: datos.keys,
            contentEncoding: (PushManager.supportedContentEncodings ?? ['aesgcm'])[0],
        });

        return true;
    }, []);

    useEffect(() => {
        if (!navegadorSoportaPush()) {
            setListo(true);

            return;
        }

        let activo = true;

        (async () => {
            try {
                const { data } = await axios.get<ConfigPush>(route('push.config'));

                if (!activo) {
                    return;
                }

                setDisponible(data.habilitado);
                setClavePublica(data.public_key);

                if (!data.habilitado || !data.public_key) {
                    return;
                }

                const registro = await navigator.serviceWorker.register('/sw.js');
                const existente = await registro.pushManager.getSubscription();

                // Permiso ya concedido sin registro, o suscripción existente (se refresca en el servidor,
                // es idempotente, por si se perdió de la BD): en ambos casos se registra en silencio.
                if ((Notification.permission === 'granted' && !existente) || existente) {
                    await suscribirDispositivo(data.public_key);

                    if (activo) {
                        setSuscrito(true);
                    }
                }
            } catch (error) {
                console.error('No se pudo preparar los avisos push', error);
            } finally {
                if (activo) {
                    setListo(true);
                }
            }
        })();

        return () => {
            activo = false;
        };
    }, [suscribirDispositivo]);

    /** Pide permiso al navegador y registra este dispositivo. Devuelve true si quedó activo. */
    const activar = useCallback(async (): Promise<boolean> => {
        if (!navegadorSoportaPush() || !clavePublica) {
            return false;
        }

        setCargando(true);

        try {
            const resultado = await Notification.requestPermission();
            setPermiso(resultado);

            if (resultado !== 'granted') {
                return false;
            }

            await suscribirDispositivo(clavePublica);
            setSuscrito(true);

            return true;
        } catch (error) {
            console.error('No se pudieron activar los avisos push', error);

            return false;
        } finally {
            setCargando(false);
        }
    }, [clavePublica, suscribirDispositivo]);

    /** Quita la suscripción de este dispositivo (navegador y servidor). */
    const desactivar = useCallback(async (): Promise<void> => {
        if (!navegadorSoportaPush()) {
            return;
        }

        setCargando(true);

        try {
            const registro = await navigator.serviceWorker.getRegistration('/sw.js');
            const suscripcion = await registro?.pushManager.getSubscription();

            if (suscripcion) {
                await axios.delete(route('push.suscripciones.destroy'), { data: { endpoint: suscripcion.endpoint } });
                await suscripcion.unsubscribe();
            }

            setSuscrito(false);
        } catch (error) {
            console.error('No se pudieron desactivar los avisos push', error);
        } finally {
            setCargando(false);
        }
    }, []);

    return { permiso, suscrito, disponible, listo, cargando, activar, desactivar };
}
