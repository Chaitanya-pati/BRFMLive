
// IST (Indian Standard Time) utility functions

export const toIST = (date) => {
  if (!date) return null;
  return new Date(date);
};

// Format: 08-Dec-2025, 04:28pm (DateTime with time)
export const formatISTDateTime = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    
    // Ensure it's a valid date
    if (isNaN(d.getTime())) return '-';
    
    // Get IST date parts
    const options = {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    
    const parts = new Intl.DateTimeFormat('en-IN', options).formatToParts(d);
    
    const day = parts.find(p => p.type === 'day')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const year = parts.find(p => p.type === 'year')?.value;
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;
    const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value.toLowerCase();
    
    return `${day}-${month}-${year}, ${hour}:${minute}${dayPeriod}`;
  } catch (error) {
    console.error('Date formatting error:', error, 'for date:', date);
    return '-';
  }
};

// Format: 08-Dec-2025 (Date only)
export const formatISTDate = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    
    if (isNaN(d.getTime())) return '-';
    
    const options = {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };
    
    const parts = new Intl.DateTimeFormat('en-IN', options).formatToParts(d);
    
    const day = parts.find(p => p.type === 'day')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const year = parts.find(p => p.type === 'year')?.value;
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Date formatting error:', error);
    return '-';
  }
};

// Format: 04:28pm (Time only, without seconds)
export const formatISTTime = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    
    if (isNaN(d.getTime())) return '-';
    
    const options = {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    
    const parts = new Intl.DateTimeFormat('en-IN', options).formatToParts(d);
    
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;
    const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value.toLowerCase();
    
    return `${hour}:${minute}${dayPeriod}`;
  } catch (error) {
    return '-';
  }
};

export const getCurrentISTTimestamp = () => {
  return formatISTDateTime(new Date());
};
