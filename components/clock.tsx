'use client';

import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon } from 'lucide-react';

export function Clock() {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format the date in Indonesian locale
  const formattedDate = time.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format the time in Indonesian locale (24-hour format)
  const formattedTime = time.toLocaleTimeString('id-ID', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex items-center justify-end gap-2">
      <div className="text-right">
        <div className="text-sm font-medium text-muted-foreground">
          {formattedDate}
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <ClockIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-base font-bold text-foreground">
            {formattedTime}
          </span>
        </div>
      </div>
    </div>
  );
}