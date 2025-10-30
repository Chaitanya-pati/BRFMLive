
// IST (Indian Standard Time) utility functions
// IST is UTC+5:30

export const toIST = (date) => {
  if (!date) return null;
  const utcDate = new Date(date);
  
  // Add 5 hours 30 minutes to convert UTC to IST
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istDate = new Date(utcDate.getTime() + istOffset);
  
  return istDate;
};

// Format: DD/MM/YYYY hh:mm:ss AM/PM IST
export const formatISTDateTime = (date) => {
  if (!date) return '-';
  try {
    // Parse the date string (assuming it's in UTC or ISO format from backend)
    const d = new Date(date);
    
    // Ensure it's a valid date
    if (isNaN(d.getTime())) return '-';
    
    // Format in IST timezone
    const formatted = d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    return formatted + ' IST';
  } catch (error) {
    console.error('Date formatting error:', error, 'for date:', date);
    return '-';
  }
};

// Format: DD/MM/YYYY
export const formatISTDate = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return '-';
  }
};

// Format: hh:mm:ss AM/PM IST
export const formatISTTime = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }) + ' IST';
  } catch (error) {
    return '-';
  }
};

export const getCurrentISTTimestamp = () => {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) + ' IST';
};
