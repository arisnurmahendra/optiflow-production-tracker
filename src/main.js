import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';

if (import.meta.env.DEV) {
  const { installMockGas } = await import('./services/mock_gas.js');
  const { createMockGasPersistence } = await import('./services/mockGasPersistence.js');
  const mockGasPersistence = createMockGasPersistence();
  const initialState = await mockGasPersistence.loadState();

  installMockGas({
    initialState,
    onStateChange: (state) => {
      mockGasPersistence.saveState(state).catch(() => {});
    },
  });
}

createApp(App).mount('#app');
