import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../design-tokens.css';
import '../styles.css';
import '../exe-ui.css';
import { App } from './app/App';

createRoot(document.getElementById('root') as HTMLElement).render(<StrictMode><App /></StrictMode>);
