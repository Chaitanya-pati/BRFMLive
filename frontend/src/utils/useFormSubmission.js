
import { useState } from 'react';
import { showSuccess, showError } from './customAlerts';

/**
 * Custom hook to handle form submissions with loading state and duplicate prevention
 * @param {Function} submitFunction - The async function to execute on submit
 * @param {Object} options - Configuration options
 * @returns {Object} - { isSubmitting, handleSubmit }
 */
export const useFormSubmission = (submitFunction, options = {}) => {
  const {
    successMessage = 'Operation completed successfully',
    errorMessage = 'An error occurred',
    onSuccess = null,
    onError = null,
  } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (...args) => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('⚠️ Form submission already in progress, ignoring duplicate request');
      return;
    }

    setIsSubmitting(true);

    try {
      // Execute the submit function
      const result = await submitFunction(...args);

      // Show success message
      if (successMessage) {
        showSuccess(successMessage);
      }

      // Call success callback if provided
      if (onSuccess) {
        await onSuccess(result);
      }

      return result;
    } catch (error) {
      console.error('❌ Form submission error:', error);

      // Show error message
      const errorMsg = error.response?.data?.detail || error.message || errorMessage;
      showError(errorMsg);

      // Call error callback if provided
      if (onError) {
        onError(error);
      }

      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, handleSubmit };
};

export default useFormSubmission;
