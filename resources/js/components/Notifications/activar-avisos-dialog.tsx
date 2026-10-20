import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { BellRing, CheckCircle2, Loader2, ShieldAlert, Smartphone, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

const CLAVE_POSPUESTO = 'avisos-push-pospuesto-hasta';
const DIAS_POSPUESTO = 3;
const RETRASO_APARICION_MS = 2500;

function estaPospuesto(): boolean {
    try {
        const hasta = Number(window.localStorage.getItem(CLAVE_POSPUESTO) ?? 0);

        return hasta > Date.now();
    } catch {
        return false;
    }
}

function posponer(): void {
    try {
        window.localStorage.setItem(CLAVE_POSPUESTO, String(Date.now() + DIAS_POSPUESTO * 24 * 60 * 60 * 1000));
    } catch {
        // Sin almacenamiento disponible: simplemente volverá a preguntar en la próxima carga.
    }
}

type Paso = 'invitacion' | 'listo' | 'bloqueado' | 'error';

/**
 * Invita al usuario a activar los avisos push de este dispositivo. Aparece solo si el navegador
 * lo soporta, el servidor tiene claves VAPID, todavía no se le preguntó y no lo pospuso hace poco.
 */
export default function ActivarAvisosDialog() {
    const { permiso, suscrito, disponible, listo, cargando, activar } = usePushNotifications();
    const [abierto, setAbierto] = useState(false);
    const [paso, setPaso] = useState<Paso>('invitacion');

    useEffect(() => {
        if (!listo || !disponible || suscrito || permiso !== 'default' || estaPospuesto()) {
            return;
        }

        const temporizador = window.setTimeout(() => setAbierto(true), RETRASO_APARICION_MS);

        return () => window.clearTimeout(temporizador);
    }, [listo, disponible, suscrito, permiso]);

    const manejarActivar = async () => {
        const resultado = await activar();

        if (resultado === 'activado') {
            setPaso('listo');
            window.setTimeout(() => setAbierto(false), 2200);
        } else if (resultado === 'bloqueado') {
            setPaso('bloqueado');
        } else {
            setPaso('error');
        }
    };

    const manejarCerrar = (valor: boolean) => {
        if (!valor && paso === 'invitacion') {
            posponer();
        }

        setAbierto(valor);
    };

    return (
        <Dialog open={abierto} onOpenChange={manejarCerrar}>
            <DialogContent className="max-w-md overflow-hidden border-sky-400/30 p-0 sm:max-w-md">
                {/* Cabecera con degradado y la campana animada sangrando hacia el cuerpo */}
                <div className="relative h-36 bg-gradient-to-br from-sky-500 via-indigo-600 to-violet-700">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
                    <div className="absolute -bottom-10 left-1/2 flex h-24 w-24 -translate-x-1/2 items-center justify-center">
                        <span className="avisos-onda absolute inset-0 rounded-full bg-sky-400/40" />
                        <span className="avisos-onda avisos-onda-retraso absolute inset-0 rounded-full bg-indigo-400/40" />
                        <span className="absolute inset-0 rounded-full bg-sky-400/30 blur-2xl" />
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/40 bg-gradient-to-br from-white to-sky-100 shadow-xl shadow-sky-500/40 dark:from-slate-100 dark:to-sky-200">
                            {paso === 'listo' ? (
                                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                            ) : paso === 'bloqueado' || paso === 'error' ? (
                                <ShieldAlert className="h-10 w-10 text-amber-600" />
                            ) : (
                                <BellRing className="avisos-campana h-10 w-10 text-indigo-600" />
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4 px-6 pt-12 pb-6 text-center">
                    {paso === 'invitacion' && (
                        <>
                            <div className="space-y-1.5">
                                <DialogTitle className="text-xl font-bold">Activa los avisos en este dispositivo</DialogTitle>
                                <DialogDescription>
                                    Entérate al instante de lo que necesita tu atención, aunque tengas la pestaña cerrada.
                                </DialogDescription>
                            </div>

                            <ul className="space-y-2 text-left text-sm">
                                <li className="flex items-start gap-3 rounded-xl border border-sky-400/30 bg-sky-500/10 p-3 backdrop-blur-sm">
                                    <Zap className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" />
                                    <span>Avisos de ventas, envíos por confirmar y cierres, en tiempo real.</span>
                                </li>
                                <li className="flex items-start gap-3 rounded-xl border border-violet-400/30 bg-violet-500/10 p-3 backdrop-blur-sm">
                                    <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
                                    <span>Llegan como cualquier notificación de tu teléfono o computadora.</span>
                                </li>
                            </ul>

                            <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
                                <Button
                                    onClick={manejarActivar}
                                    disabled={cargando}
                                    className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/30 hover:scale-[1.02]"
                                >
                                    {cargando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                                    Activar avisos
                                </Button>
                                <Button variant="ghost" onClick={() => manejarCerrar(false)} disabled={cargando} className="flex-1">
                                    Ahora no
                                </Button>
                            </div>
                            <p className="text-muted-foreground text-xs">Podrás desactivarlos cuando quieras desde la configuración del navegador.</p>
                        </>
                    )}

                    {paso === 'listo' && (
                        <div className="space-y-1.5 py-2">
                            <DialogTitle className="text-xl font-bold">¡Avisos activados!</DialogTitle>
                            <DialogDescription>Este dispositivo recibirá los avisos aunque cierres la pestaña.</DialogDescription>
                        </div>
                    )}

                    {paso === 'error' && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <DialogTitle className="text-xl font-bold">No se pudieron activar los avisos</DialogTitle>
                                <DialogDescription>
                                    El servicio de avisos de este navegador rechazó el registro. En Chrome, revisa que esté activado «Usar servicios de
                                    Google para mensajería push» en Configuración, y que haya conexión a internet. En Chromium o navegadores sin
                                    cuenta de Google puede no estar disponible.
                                </DialogDescription>
                            </div>
                            <Button variant="outline" onClick={() => setAbierto(false)} className="w-full">
                                Entendido
                            </Button>
                        </div>
                    )}

                    {paso === 'bloqueado' && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <DialogTitle className="text-xl font-bold">El navegador bloqueó los avisos</DialogTitle>
                                <DialogDescription>
                                    Para activarlos, permite las notificaciones de este sitio desde el candado junto a la dirección y recarga la
                                    página.
                                </DialogDescription>
                            </div>
                            <Button variant="outline" onClick={() => setAbierto(false)} className="w-full">
                                Entendido
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
