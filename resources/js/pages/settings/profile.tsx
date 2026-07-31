import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Opciones Generales', href: '/dashboard' },
    { title: 'Configuración de Perfil', href: '/settings/profile' },
];

const roleLabels: Record<string, string> = {
    admin:     'Administrador',
    moderador: 'Moderador',
    vendedor:  'Vendedor',
};

const roleVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
    admin:     'default',
    moderador: 'secondary',
    vendedor:  'outline',
};

type ProfileForm = {
    name:   string;
    email:  string;
    avatar: File | null;
};

export default function Profile({
    mustVerifyEmail,
    status,
    telegramToken,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    telegramToken?: string | null;
}) {
    const { auth } = usePage<SharedData>().props;
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm<ProfileForm>({
        name:   auth.user.name,
        email:  auth.user.email,
        avatar: null,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'), { preserveScroll: true });
    };

    const handleGenerateToken = () => {
        router.post(route('profile.telegram.token'), {}, { preserveScroll: true });
    };

    const handleDisconnect = () => {
        router.delete(route('profile.telegram.disconnect'), { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuración de Perfil" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Información de Perfil"
                        description="Actualice su nombre, correo, avatar y conexión con Telegram"
                    />

                    <form onSubmit={submit} className="space-y-6">

                        {/* Rol — solo lectura */}
                        <div className="grid gap-2">
                            <Label>Rol</Label>
                            <div>
                                <Badge variant={roleVariants[auth.user.role] ?? 'outline'}>
                                    {roleLabels[auth.user.role] ?? auth.user.role}
                                </Badge>
                            </div>
                        </div>

                        {/* Nombre */}
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Nombre completo"
                            />
                            <InputError message={errors.name} />
                        </div>

                        {/* Correo */}
                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="correo@ejemplo.com"
                            />
                            <InputError message={errors.email} />
                        </div>

                        {/* Avatar */}
                        <div className="grid gap-2">
                            <Label>Avatar</Label>
                            <div className="flex items-center gap-4">
                                {auth.user.avatar_url ? (
                                    <img
                                        src={auth.user.avatar_url}
                                        alt="Avatar actual"
                                        className="h-16 w-16 rounded-full object-cover border"
                                    />
                                ) : (
                                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xl font-bold border">
                                        {auth.user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] ?? null;
                                            setData('avatar', file);
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => avatarInputRef.current?.click()}
                                    >
                                        Cambiar foto
                                    </Button>
                                    {data.avatar && (
                                        <span className="text-xs text-muted-foreground">{data.avatar.name}</span>
                                    )}
                                    <span className="text-xs text-muted-foreground">JPG, PNG, GIF o WebP · máx. 5 MB</span>
                                </div>
                            </div>
                            <InputError message={errors.avatar} />
                        </div>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <p className="text-muted-foreground text-sm">
                                Tu correo electrónico no está verificado.
                            </p>
                        )}

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Guardar cambios</Button>
                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-chart-2 text-sm">Cambios guardados correctamente</p>
                            </Transition>
                        </div>
                    </form>

                    {/* Sección Telegram — admin y vendedor (moderador queda fuera del bot por ahora) */}
                    {(auth.user.role === 'admin' || auth.user.role === 'vendedor') && <div className="border-t pt-6 grid gap-3">
                        <HeadingSmall
                            title="Conexión con Telegram"
                            description="Recibe notificaciones del sistema directamente en Telegram"
                        />

                        {auth.user.telegram_chat_id ? (
                            <div className="flex items-center gap-3">
                                <Badge variant="default">Conectado</Badge>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDisconnect}
                                >
                                    Desconectar
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <Badge variant="secondary">No conectado</Badge>

                                {telegramToken ? (
                                    <div className="rounded-md border bg-muted p-4 space-y-2">
                                        <p className="text-sm font-medium">Tu código de vinculación:</p>
                                        <p className="text-2xl font-mono font-bold tracking-widest">{telegramToken}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Envía este mensaje al bot:{' '}
                                            <strong className="font-mono">/vincular {telegramToken}</strong>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Bot: <strong>@laglorietatienda_bot</strong>
                                        </p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleGenerateToken}
                                        >
                                            Generar nuevo código
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleGenerateToken}
                                    >
                                        Generar código de vinculación
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>}
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
