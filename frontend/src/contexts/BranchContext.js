
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
  }
};

const BranchContext = createContext();

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};

export const BranchProvider = ({ children }) => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const response = await branchApi.getAll();
      const branchData = Array.isArray(response.data) ? response.data : [];
      setBranches(branchData);
      
      const savedBranchId = await storage.getItem('selectedBranchId');
      if (savedBranchId && branchData.length > 0) {
        const savedBranch = branchData.find(b => b.id === parseInt(savedBranchId));
        if (savedBranch) {
          setSelectedBranch(savedBranch);
        } else {
          setSelectedBranch(branchData[0]);
          await storage.setItem('selectedBranchId', branchData[0].id.toString());
        }
      } else if (branchData.length > 0) {
        setSelectedBranch(branchData[0]);
        await storage.setItem('selectedBranchId', branchData[0].id.toString());
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([]);
      setSelectedBranch(null);
    } finally {
      setLoading(false);
    }
  };

  const selectBranch = async (branch) => {
    setSelectedBranch(branch);
    if (branch) {
      await storage.setItem('selectedBranchId', branch.id.toString());
    }
  };

  return (
    <BranchContext.Provider value={{ branches, selectedBranch, selectBranch, loading }}>
      {children}
    </BranchContext.Provider>
  );
};
