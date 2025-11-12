export const formatISTDate = (isoString) => {
  if (!isoString) return '';
  
  try {
    const dateObj = new Date(isoString);
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting IST date:', error);
    return '';
  }
};

export const formatISTDateOnly = (isoString) => {
  if (!isoString) return '';
  
  try {
    const dateObj = new Date(isoString);
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting IST date only:', error);
    return '';
  }
};

export const formatISTTime = (isoString) => {
  if (!isoString) return '';
  
  try {
    const dateObj = new Date(isoString);
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }

    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting IST time:', error);
    return '';
  }
};

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
