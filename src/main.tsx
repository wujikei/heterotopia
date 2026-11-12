import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './music-room.css';
import './styles/ink-base.css';
import './styles/ink-scenes.css';
import './styles/ink-dialogue.css';
import './styles/ink-choices.css';
import './styles/ink-modal.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
