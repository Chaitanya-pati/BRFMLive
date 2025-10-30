
// IST (Indian Standard Time) utility functions

export const toIST = (date) => {
  if (!date) return null;
  return new Date(date);
};

// Format: DD/MM/YYYY hh:mm:ss AM/PM IST
export const formatISTDateTime = (date) => {
  if (!date) return '-';
  try {
    // Parse the UTC date string from backend
    const d = new Date(date);
    
    // Ensure it's a valid date
    if (isNaN(d.getTime())) return '-';
    
    // Convert UTC to IST for display
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
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) + ' IST';
};
