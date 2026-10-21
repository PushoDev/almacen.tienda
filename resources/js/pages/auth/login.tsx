import { Head, useForm } from '@inertiajs/react';
import { DoorOpen, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import { LiquidButton } from '@/components/animated/liquid-button';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout title="🔑 Autenticar su Cuenta" description="Introduzca sus credenciales para acceder al sistema">
            <Head title="Log in - 🏪🛒" />

            {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{status}</div>}

            <form className="animate__animated animate__fadeInUp flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">📧 Correo Electrónico</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="email@posglorieta.com"
                            className="border-sidebar-accent"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">🔐 Contraseña</Label>
                            {canResetPassword && (
                                <TextLink href={route('password.request')} className="ml-auto text-sm" tabIndex={4}>
                                    ¿Has olvidado tu contraseña?
                                </TextLink>
                            )}
                        </div>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="••••••••••••"
                                className="border-sidebar-accent pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                tabIndex={3}
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                <span className="sr-only">{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
                            </Button>
                        </div>
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="remember"
                            name="remember"
                            checked={data.remember}
                            onCheckedChange={(checked) => setData('remember', checked === true)}
                            tabIndex={5}
                        />
                        <Label htmlFor="remember">Recordar mi Cuenta</Label>
                    </div>

                    <LiquidButton
                        tabIndex={6}
                        type="submit"
                        className="border-sidebar cursor-pointer border-1 hover:animate-pulse dark:text-white"
                        disabled={processing}
                    >
                        {processing && <LoaderCircle className="h-4 w-4" />}
                        <DoorOpen />
                        Loguearse
                    </LiquidButton>
                </div>
            </form>
        </AuthLayout>
    );
}
