import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import { connectSocket } from './lib/socket';
import { router } from './router';
import './styles.css';

connectSocket();

/*
 * Review fix (SCRUM-129): Mount ToastProvider at the root level so useToast()
 * can be safely called from any page or component without throwing an unmounted context error.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </ToastProvider>
  </StrictMode>,
);
