import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  ACTIVE_BRANCH: '@active_branch',
  USER_DATA: '@user_data',
};

export const storage = {
  async setActiveBranch(branch) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_BRANCH, JSON.stringify(branch));
      return true;
    } catch (error) {
      console.error('Error saving active branch:', error);
      return false;
    }
  },

  async getActiveBranch() {
    try {
      const branch = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_BRANCH);
      return branch ? JSON.parse(branch) : null;
    } catch (error) {
      console.error('Error loading active branch:', error);
      return null;
    }
  },

  async removeActiveBranch() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_BRANCH);
      return true;
    } catch (error) {
      console.error('Error removing active branch:', error);
      return false;
    }
  },

  async setUserData(userData) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Error saving user data:', error);
      return false;
    }
  },

  async getUserData() {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  },

  async removeUserData() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      return true;
    } catch (error) {
      console.error('Error removing user data:', error);
      return false;
    }
  },

  async clearAll() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACTIVE_BRANCH,
        STORAGE_KEYS.USER_DATA,
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },
};
