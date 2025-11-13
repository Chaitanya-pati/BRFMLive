
import React, { createContext, useState, useEffect, useContext } from 'react';
import { branchApi } from '../api/client';

// Web-compatible storage wrapper
const storage = {
  async getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    } catch (e) {
      console.error('Storage getItem error:', e);
      return null;
    }
  },
  async setItem(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error('Storage setItem error:', e);
    }
  },
  async removeItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error('Storage removeItem error:', e);
    }
  }
};

const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await branchApi.getAll();
      setBranches(response.data);

      // Try to restore selected branch from storage
      const savedBranchId = await storage.getItem('selectedBranchId');
      if (savedBranchId) {
        const branch = response.data.find(b => b.id === parseInt(savedBranchId));
        if (branch) {
          setSelectedBranch(branch);
        } else if (response.data.length > 0) {
          // If saved branch not found, select first branch
          setSelectedBranch(response.data[0]);
          await storage.setItem('selectedBranchId', response.data[0].id.toString());
        }
      } else if (response.data.length > 0) {
        // No saved branch, select first one
        setSelectedBranch(response.data[0]);
        await storage.setItem('selectedBranchId', response.data[0].id.toString());
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectBranch = async (branch) => {
    setSelectedBranch(branch);
    if (branch) {
      await storage.setItem('selectedBranchId', branch.id.toString());
    } else {
      await storage.removeItem('selectedBranchId');
    }
  };

  return (
    <BranchContext.Provider value={{ branches, selectedBranch, selectBranch, loading }}>
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
