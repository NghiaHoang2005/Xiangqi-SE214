import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import { router } from './router';
import { initServices } from './services';
import './styles.css';

const root = createRoot(document.getElementById('root')!);

initServices().then(
  (services) => {
    if (services.kind === 'mock') console.info('[xiangqi] Running against the mock backend');

    root.render(
      <StrictMode>
        <ToastProvider>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </ToastProvider>
      </StrictMode>,
    );
  },
  (err: unknown) => {
    console.error('[xiangqi] Could not start the app', err);
    root.render(
      <section className="page" role="alert">
        <p>Không tải được ứng dụng. Vui lòng tải lại trang.</p>
      </section>,
    );
  },
);
