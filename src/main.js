import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';

if (import.meta.env.DEV) {
  const { installMockGas } = await import('./services/mock_gas.js');
  installMockGas();
}

createApp(App).mount('#app');
