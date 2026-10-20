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

const CLAVE_DESACTIVADO = 'avisos-push-desactivados';

/** El usuario apagó los avisos en este dispositivo: no se vuelve a registrar solo al recargar. */
function estaDesactivadoPorUsuario(): boolean {
    try {
        return window.localStorage.getItem(CLAVE_DESACTIVADO) === '1';
    } catch {
        return false;
    }
}

function marcarDesactivadoPorUsuario(desactivado: boolean): void {
    try {
        if (desactivado) {
            window.localStorage.setItem(CLAVE_DESACTIVADO, '1');
        } else {
            window.localStorage.removeItem(CLAVE_DESACTIVADO);
        }
    } catch {
        // Sin almacenamiento disponible: el apagado dura hasta la próxima carga.
    }
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

                if (!data.habilitado || !data.public_key || estaDesactivadoPorUsuario()) {
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

    /**
     * Pide permiso al navegador y registra este dispositivo.
     * - 'activado': quedó registrado.
     * - 'bloqueado': el usuario o el navegador negó el permiso.
     * - 'error': hubo permiso, pero el servicio push del navegador rechazó el registro.
     */
    const activar = useCallback(async (): Promise<'activado' | 'bloqueado' | 'error'> => {
        if (!navegadorSoportaPush() || !clavePublica) {
            return 'error';
        }

        setCargando(true);

        try {
            const resultado = await Notification.requestPermission();
            setPermiso(resultado);

            if (resultado !== 'granted') {
                return 'bloqueado';
            }

            await suscribirDispositivo(clavePublica);
            marcarDesactivadoPorUsuario(false);
            setSuscrito(true);

            return 'activado';
        } catch (error) {
            console.error('No se pudieron activar los avisos push', error);

            return 'error';
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

            marcarDesactivadoPorUsuario(true);
            setSuscrito(false);
        } catch (error) {
            console.error('No se pudieron desactivar los avisos push', error);
        } finally {
            setCargando(false);
        }
    }, []);

    return { permiso, suscrito, disponible, listo, cargando, activar, desactivar };
}
