// Re-export from dateUtils for backward compatibility
export { formatISTDateTime, formatISTDate, formatISTTime, toIST, getCurrentISTTimestamp } from './dateUtils';

export const parseISTDateTime = (dateString) => {
  if (!dateString) return null;
  try {
    return new Date(dateString);
  } catch (error) {
    console.error('Error parsing IST datetime:', error);
    return null;
  }
};

export const toISTISOString = (date) => {
  if (!date) return null;
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    return dateObj.toISOString();
  } catch (error) {
    console.error('Error converting to IST ISO string:', error);
    return null;
  }
};

export const getCurrentISTDate = () => {
  return new Date();
};