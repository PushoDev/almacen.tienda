import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { BellRing } from 'lucide-react';
import { useState } from 'react';

/**
 * Interruptor de los avisos push de este dispositivo (vive en el panel de la campana). Se oculta si
 * el navegador o el servidor no soportan push; si el navegador los bloqueó, queda apagado con la pista.
 */
export default function AvisosPushSwitch() {
    const { permiso, suscrito, disponible, listo, cargando, activar, desactivar } = usePushNotifications();
    const [mensaje, setMensaje] = useState<string | null>(null);

    if (!listo || !disponible || permiso === 'no-soportado') {
        return null;
    }

    const bloqueado = permiso === 'denied';

    const manejarCambio = async (encendido: boolean) => {
        setMensaje(null);

        if (!encendido) {
            await desactivar();

            return;
        }

        const resultado = await activar();

        if (resultado === 'bloqueado') {
            setMensaje('El navegador bloqueó los avisos. Permítelos desde el candado de la barra de direcciones.');
        } else if (resultado === 'error') {
            setMensaje('El servicio de avisos de este navegador rechazó el registro. En Brave, actívalo en Privacidad → «Usar servicios de Google para mensajería push».');
        }
    };

    return (
        <div className="px-4 py-2">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                    <BellRing className="text-muted-foreground h-4 w-4" />
                    <span className="font-medium">Avisos en este dispositivo</span>
                </div>
                <Switch
                    checked={suscrito && !bloqueado}
                    disabled={cargando || bloqueado}
                    onCheckedChange={manejarCambio}
                    aria-label="Avisos push en este dispositivo"
                />
            </div>
            {bloqueado && <p className="text-muted-foreground mt-1 text-[11px]">Bloqueados en el navegador: permítelos desde el candado de la barra de direcciones.</p>}
            {mensaje && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">{mensaje}</p>}
        </div>
    );
}
