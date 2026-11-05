import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './css/tailwind.css';
import TheraPlay from './TheraPlay.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <TheraPlay />
    </StrictMode>
);
