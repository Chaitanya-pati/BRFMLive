
import { API_BASE_URL } from '../api/client';

/**
 * Convert relative image path to full URL
 * @param {string} imagePath - Relative path like '/uploads/image.jpg'
 * @returns {string} Full URL for the image
 */
export const getFullImageUrl = (imagePath) => {
  if (!imagePath) {
    return null;
  }

  // If already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Ensure path starts with /
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

  // Construct full URL using API_BASE_URL
  return `${API_BASE_URL}${path}`;
};

/**
 * Convert array of relative image paths to full URLs
 * @param {string[]} imagePaths - Array of relative paths
 * @returns {string[]} Array of full URLs
 */
export const getFullImageUrls = (imagePaths) => {
  if (!imagePaths || !Array.isArray(imagePaths)) {
    return [];
  }
  return imagePaths.map(getFullImageUrl).filter(Boolean);
};
