/**
 * Mendapatkan waktu saat ini di zona waktu Jakarta (GMT+7)
 * @returns String dalam format 'YYYY-MM-DD HH:mm:ss'
 */
export function getJakartaNow(): string {
  // Buat waktu UTC sekarang
  const now = new Date();
  // Tambah offset 7 jam (dalam ms)
  const jakartaTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  // Format ke SQL datetime (YYYY-MM-DD HH:mm:ss)
  return jakartaTime.toISOString().slice(0, 19).replace('T', ' ');
}

export function formatRupiah(value: number): string {
  // Handle NaN, null, or undefined values
  if (value == null || isNaN(value)) {
    return "Rp0";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRupiahCompact(value: number): string {
  // Handle NaN, null, or undefined values
  if (value == null || isNaN(value)) {
    return "Rp0";
  }
  
  if (value >= 1000000000) {
    return `Rp${(value / 1000000000).toFixed(1)}M`;
  } else if (value >= 1000000) {
    return `Rp${(value / 1000000).toFixed(1)}jt`;
  } else if (value >= 1000) {
    return `Rp${(value / 1000).toFixed(0)}rb`;
  } else {
    return `Rp${value.toLocaleString('id-ID')}`;
  }
}

export function formatTanggal(d: Date | string | number): string {
  if (d === null || d === undefined) {
    return "-";
  }
  
  let date: Date;
  
  try {
    if (typeof d === "string") {
      // Handle SQLite datetime format (YYYY-MM-DD HH:MM:SS) - from D1 database
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(d)) {
        // Waktu sudah dalam format Jakarta (UTC+7), jadi parsing dengan +7 jam
        const [datePart, timePart] = d.split(' ');
        date = new Date(`${datePart}T${timePart}+07:00`);
      }
      // Handle ISO string with timezone
      else if (d.endsWith('Z')) {
        // If it's an ISO string with Z (UTC), convert to Jakarta time
        date = new Date(d);
      }
      else if (d.includes('T')) {
        // If it's an ISO string, check if it already includes timezone
        if (d.includes('+') || d.includes('-')) {
          date = new Date(d); // Timezone already included
        } else {
          // No timezone info, assume it's in local time
          date = new Date(d);
        }
      }
      // Handle numeric string (timestamp)
      else if (/^\d+$/.test(d)) {
        date = new Date(parseInt(d));
      } 
      // Fallback to Date constructor
      else {
        date = new Date(d);
      }
    } else if (typeof d === "number") {
      // Handle epoch timestamp (milliseconds)
      date = new Date(d);
    } else {
      // Already a Date object
      date = d;
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "-";
    }
    
    // Format options for Jakarta timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    
    return new Intl.DateTimeFormat('id-ID', options).format(date);
  } catch (error) {
    return "-";
  }
}
