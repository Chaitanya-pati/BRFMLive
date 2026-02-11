import React, { createContext, useState, useContext, useEffect } from 'react';
import { storage } from '../utils/storage';

const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
  const [activeBranch, setActiveBranchState] = useState(null);
  const [userBranches, setUserBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveBranch();
  }, []);

  const loadActiveBranch = async () => {
    try {
      const branch = await storage.getActiveBranch();
      const userData = await storage.getUserData();
      
      if (branch) {
        setActiveBranchState(branch);
      }
      
      if (userData && userData.branches) {
        setUserBranches(userData.branches);
      }
    } catch (error) {
      console.error('Error loading active branch:', error);
    } finally {
      setLoading(false);
    }
  };

  const setActiveBranch = async (branch) => {
    try {
      await storage.setActiveBranch(branch);
      setActiveBranchState(branch);
      // Ensure state update is complete
      await new Promise(resolve => setTimeout(resolve, 50));
      return true;
    } catch (error) {
      console.error('Error setting active branch:', error);
      return false;
    }
  };

  const clearActiveBranch = async () => {
    try {
      await storage.removeActiveBranch();
      setActiveBranchState(null);
      return true;
    } catch (error) {
      console.error('Error clearing active branch:', error);
      return false;
    }
  };

  const value = {
    activeBranch,
    userBranches,
    setActiveBranch,
    clearActiveBranch,
    setUserBranches,
    loading,
  };

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};
