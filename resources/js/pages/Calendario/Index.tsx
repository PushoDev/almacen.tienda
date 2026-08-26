import HeadingSmall from '@/components/heading-small';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { CalendarIcon } from 'lucide-react';
import { Scheduler, type CalendarEvent, type CalendarTranslations, type ViewType } from 'calendarkit-pro';
import { es } from 'date-fns/locale';
import { useState } from 'react';

// El prop `language` de calendarkit-pro solo soporta 'en'/'fr' (sin español) — se traduce
// el resto del texto de la interfaz manualmente vía `translations`. `locale` (date-fns)
// cubre el formato de fechas/meses/días (ej. "agosto 2026" en vez de "August 2026").
// `localTime`/`calendars` no están en el tipo `CalendarTranslations` del paquete pero sí
// se leen en tiempo de ejecución (dist/index.mjs) — el .d.ts publicado quedó incompleto.
const translations: Partial<CalendarTranslations> & Record<string, string> = {
    localTime: 'Hora local',
    calendars: 'Calendarios',
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
    agenda: 'Agenda',
    resource: 'Recurso',
    createEvent: 'Crear evento',
    editEvent: 'Editar evento',
    delete: 'Eliminar',
    save: 'Guardar',
    cancel: 'Cancelar',
    title: 'Título',
    start: 'Inicio',
    end: 'Fin',
    allDay: 'Todo el día',
    description: 'Descripción',
    repeat: 'Repetir',
    noRepeat: 'No repetir',
    selectCalendar: 'Seleccionar calendario',
    selectType: 'Seleccionar tipo',
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual',
    yearly: 'Anual',
    event: 'Evento',
    task: 'Tarea',
    appointmentSchedule: 'Horario de la cita',
    new: 'Nuevo',
    dateAndTime: 'Fecha y hora',
    timezone: 'Zona horaria',
    whosJoining: 'Quién participa',
    suggestedTimes: 'Horarios sugeridos',
    viewSuggestions: 'Ver sugerencias',
    whereWillItBe: 'Dónde será',
    location: 'Ubicación',
    descriptionAndAttachments: 'Descripción y archivos adjuntos',
    dragAndDrop: 'Arrastrar y soltar',
    guests: 'Invitados',
    addAttachment: 'Agregar archivo adjunto',
    moreOptions: 'Más opciones',
    doesNotRepeat: 'No se repite',
    locationHelpText: 'Agrega una ubicación',
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Calendario de Historial',
        href: '#',
    },
];

export default function Index() {
    // Solo se está mostrando el calendario por ahora (terreno preparado) — sin eventos reales
    // ni acciones conectadas todavía. readOnly evita crear/arrastrar/editar hasta que se
    // conecten las operaciones reales del negocio.
    const [view, setView] = useState<ViewType>('month');
    const [date, setDate] = useState(new Date());
    const events: CalendarEvent[] = [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Calendario de Historial" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Calendario de Historial" description="Consulta el historial de operaciones del negocio organizado por fecha." />
                    <CalendarIcon
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Card className="overflow-hidden">
                    <CardContent className="h-[75vh] p-0">
                        <Scheduler
                            events={events}
                            view={view}
                            onViewChange={setView}
                            date={date}
                            onDateChange={setDate}
                            readOnly
                            locale={es}
                            translations={translations}
                            calendars={[]}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
