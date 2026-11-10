import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initPhysics } from './game/simulation/physics';
import './ui/ui.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

await initPhysics();
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
