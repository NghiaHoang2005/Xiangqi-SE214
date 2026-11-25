import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import { router } from './router';
import { initServices } from './services';
import './styles.css';

void initServices().then((services) => {
  if (services.kind === 'mock') console.info('[xiangqi] Running against the mock backend');

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ToastProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </ToastProvider>
    </StrictMode>,
  );
});
