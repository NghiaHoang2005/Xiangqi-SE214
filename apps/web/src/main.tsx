import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import { router } from './router';
import { initServices } from './services';
import './styles.css';

// Pick the real or mock backend before anything renders. The socket connects after the
// guest session exists (AppLayout → ensureSession).
void initServices().then((services) => {
  if (services.kind === 'mock') console.info('[xiangqi] Running against the mock backend');

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
});
