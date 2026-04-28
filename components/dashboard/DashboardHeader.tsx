import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface DashboardHeaderProps {
    userName?: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Selamat Pagi');
        else if (hour < 15) setGreeting('Selamat Siang');
        else if (hour < 18) setGreeting('Selamat Sore');
        else setGreeting('Selamat Malam');
    }, []);

    return (
        <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {greeting}, {userName || 'Admin'}!
            </h1>
            <p className="text-muted-foreground">
                Berikut adalah ringkasan aktivitas bisnis Anda hari ini, {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}.
            </p>
        </div>
    );
}
