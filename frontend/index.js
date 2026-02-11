import { registerRootComponent } from 'expo';
import App from './App';

// Add error boundary wrapper
const AppWithErrorBoundary = () => {
  try {
    return <App />;
  } catch (error) {
    console.error('App Error:', error);
    return null;
  }
};

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(AppWithErrorBoundary);
