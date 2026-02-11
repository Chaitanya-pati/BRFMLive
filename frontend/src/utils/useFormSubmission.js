
import { useState } from 'react';
import { showError } from './customAlerts';

/**
 * Custom hook to handle form submissions with loading state and duplicate prevention
 * Supports two usage patterns:
 * 1. Pass submitFunction at hook initialization: useFormSubmission(submitFn, options)
 * 2. Pass submitFunction at call time: handleFormSubmission(async () => {...})
 * @param {Function} submitFunction - Optional async function to execute on submit
 * @param {Object} options - Configuration options
 * @returns {Object} - { isSubmitting, handleSubmit, handleFormSubmission }
 */
export const useFormSubmission = (submitFunction = null, options = {}) => {
  const {
    successMessage = null,
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

    if (!submitFunction) {
      console.error('❌ No submit function provided');
      return;
    }

    setIsSubmitting(true);

    try {
      // Execute the submit function
      const result = await submitFunction(...args);

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

  // Alternative pattern: pass submit function at call time
  const handleFormSubmission = async (submitFn) => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('⚠️ Form submission already in progress, ignoring duplicate request');
      return;
    }

    if (typeof submitFn !== 'function') {
      console.error('❌ handleFormSubmission requires a function argument');
      return;
    }

    setIsSubmitting(true);

    try {
      // Execute the submit function
      const result = await submitFn();

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

  return { isSubmitting, handleSubmit, handleFormSubmission };
};

export default useFormSubmission;
