import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Check, CreditCard } from 'lucide-react';
import { useState } from 'react';

export interface BancoTarjeta {
    slug: string;
    nombre: string;
    imagen_url: string;
}

export interface CatalogoTarjetas {
    interna: BancoTarjeta[];
    externa: BancoTarjeta[];
}

interface SelectorBancoTarjetaProps {
    catalogo: CatalogoTarjetas;
    value: string | null;
    onChange: (slug: string | null) => void;
    disabled?: boolean;
}

export function SelectorBancoTarjeta({ catalogo, value, onChange, disabled = false }: SelectorBancoTarjetaProps) {
    const [abierto, setAbierto] = useState(false);

    const todos = [...catalogo.interna, ...catalogo.externa];
    const seleccionado = todos.find((b) => b.slug === value) ?? null;

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
                        <CreditCard className="text-muted-foreground h-4 w-4" />
                        <span className="text-muted-foreground">Sin banco asignado (genérico)</span>
                    </>
                )}
            </button>

            <Dialog open={abierto} onOpenChange={setAbierto}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Elegir banco / diseño de tarjeta</DialogTitle>
                        <DialogDescription>
                            Se usará como logo e identidad visual de esta cuenta. Puedes dejarla sin banco — se verá con un diseño genérico.
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
                        <CreditCard className="text-muted-foreground h-5 w-5" />
                        <span>Sin banco asignado (genérico)</span>
                        {value === null && <Check className="text-primary ml-auto h-4 w-4" />}
                    </button>

                    <Tabs defaultValue="interna">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="interna">Internas</TabsTrigger>
                            <TabsTrigger value="externa">Externas</TabsTrigger>
                        </TabsList>

                        <TabsContent value="interna">
                            <GrillaBancos bancos={catalogo.interna} seleccionado={value} onElegir={elegir} />
                        </TabsContent>
                        <TabsContent value="externa">
                            <GrillaBancos bancos={catalogo.externa} seleccionado={value} onElegir={elegir} />
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </>
    );
}

function GrillaBancos({
    bancos,
    seleccionado,
    onElegir,
}: {
    bancos: BancoTarjeta[];
    seleccionado: string | null;
    onElegir: (slug: string) => void;
}) {
    if (bancos.length === 0) {
        return <p className="text-muted-foreground py-6 text-center text-sm">Sin opciones en este grupo todavía.</p>;
    }

    return (
        <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-3">
            {bancos.map((banco) => {
                const activo = banco.slug === seleccionado;
                return (
                    <button
                        key={banco.slug}
                        type="button"
                        onClick={() => onElegir(banco.slug)}
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
                        <img src={banco.imagen_url} alt={banco.nombre} className="h-12 w-full object-contain" />
                        <span className="text-xs font-medium">{banco.nombre}</span>
                    </button>
                );
            })}
        </div>
    );
}
