
// IST (Indian Standard Time) utility functions
// IST is UTC+5:30

export const toIST = (date) => {
  if (!date) return null;
  const utcDate = new Date(date);
  return utcDate;
};

// Format: DD/MM/YYYY hh:mm:ss AM/PM IST
export const formatISTDateTime = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }) + ' IST';
  } catch (error) {
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
