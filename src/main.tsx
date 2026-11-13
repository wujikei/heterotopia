import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './styles/ink-base.css';
import './styles/ink-scenes.css';
import './styles/ink-dialogue.css';
import './styles/ink-choices.css';
import './styles/ink-modal.css';
import './styles/ink-library.css';
import './styles/ink-music.css';
import './styles/ink-ending.css';
import './styles/ink-perf.css';
import './styles/ink-interaction.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
