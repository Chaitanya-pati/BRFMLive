import React, { createContext, useState, useContext, useEffect } from 'react';
import { branchApi } from '../api/client';

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
      setBranches(response.data || []);
      
      const savedBranchId = localStorage.getItem('selectedBranchId');
      if (savedBranchId && response.data) {
        const savedBranch = response.data.find(b => b.id === parseInt(savedBranchId));
        if (savedBranch) {
          setSelectedBranch(savedBranch);
        } else if (response.data.length > 0) {
          setSelectedBranch(response.data[0]);
          localStorage.setItem('selectedBranchId', response.data[0].id);
        }
      } else if (response.data && response.data.length > 0) {
        setSelectedBranch(response.data[0]);
        localStorage.setItem('selectedBranchId', response.data[0].id);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectBranch = (branch) => {
    setSelectedBranch(branch);
    if (branch) {
      localStorage.setItem('selectedBranchId', branch.id);
    } else {
      localStorage.removeItem('selectedBranchId');
    }
  };

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranch,
        selectBranch,
        loading,
        refreshBranches: loadBranches
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};
