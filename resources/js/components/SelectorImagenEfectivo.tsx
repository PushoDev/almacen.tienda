import type { BancoTarjeta } from '@/components/SelectorBancoTarjeta';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Check, Wallet } from 'lucide-react';
import { useState } from 'react';

interface SelectorImagenEfectivoProps {
    catalogo: BancoTarjeta[];
    value: string | null;
    onChange: (slug: string | null) => void;
    disabled?: boolean;
}

/**
 * Mismo patrón visual que SelectorBancoTarjeta (botón + Dialog + grilla con check de
 * selección) pero sin pestañas Internas/Externas — el catálogo de efectivo es una lista
 * plana por moneda (USD/CUP/EUR), no tiene grupos que separar.
 */
export function SelectorImagenEfectivo({ catalogo, value, onChange, disabled = false }: SelectorImagenEfectivoProps) {
    const [abierto, setAbierto] = useState(false);

    const seleccionado = catalogo.find((item) => item.slug === value) ?? null;

    function elegir(slug: string | null) {
        onChange(slug);
        setAbierto(false);
    }

    return (
        <>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setAbierto(true)}
                className={cn(
                    'border-input bg-background flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm shadow-xs transition-colors',
                    disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-accent hover:text-accent-foreground cursor-pointer',
                )}
            >
                {seleccionado ? (
                    <>
                        <img src={seleccionado.imagen_url} alt="" className="h-5 w-8 object-contain" />
                        <span className="truncate">{seleccionado.nombre}</span>
                    </>
                ) : (
                    <>
                        <Wallet className="text-muted-foreground h-4 w-4" />
                        <span className="text-muted-foreground">Sin insignia asignada (genérico)</span>
                    </>
                )}
            </button>

            <Dialog open={abierto} onOpenChange={setAbierto}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Elegir insignia de moneda</DialogTitle>
                        <DialogDescription>
                            Se usará como identidad visual de esta cuenta en efectivo. Puedes dejarla sin insignia — se verá con un diseño genérico.
                        </DialogDescription>
                    </DialogHeader>

                    <button
                        type="button"
                        onClick={() => elegir(null)}
                        className={cn(
                            'flex w-full items-center gap-2 rounded-lg border-2 p-3 text-sm transition-colors',
                            value === null ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
                        )}
                    >
                        <Wallet className="text-muted-foreground h-5 w-5" />
                        <span>Sin insignia asignada (genérico)</span>
                        {value === null && <Check className="text-primary ml-auto h-4 w-4" />}
                    </button>

                    {catalogo.length === 0 ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">Sin opciones todavía.</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-3">
                            {catalogo.map((item) => {
                                const activo = item.slug === value;
                                return (
                                    <button
                                        key={item.slug}
                                        type="button"
                                        onClick={() => elegir(item.slug)}
                                        className={cn(
                                            'relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
                                            activo ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
                                        )}
                                    >
                                        {activo && (
                                            <span className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full">
                                                <Check className="h-3 w-3" />
                                            </span>
                                        )}
                                        <img src={item.imagen_url} alt={item.nombre} className="h-12 w-full object-contain" />
                                        <span className="text-xs font-medium">{item.nombre}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
