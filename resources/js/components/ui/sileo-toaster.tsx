import { useAppearance } from '@/hooks/use-appearance';
import { Toaster as SileoToaster } from 'sileo';
import type { ComponentProps } from 'react';

type ToasterProps = ComponentProps<typeof SileoToaster>;

function Toaster({ theme, ...props }: ToasterProps) {
    const { appearance } = useAppearance();

    return <SileoToaster theme={theme ?? appearance} {...props} />;
}

export { Toaster };
