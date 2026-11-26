import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import {
  AiSetupPage,
  CreateRoomPage,
  HistoryPage,
  HomePage,
  LeaderboardPage,
  LoginPage,
  MatchPage,
  NotFoundPage,
  RankedPage,
  ReplayPage,
  RoomPage,
} from './pages';
import { paths } from './routes';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: paths.home, element: <HomePage /> },
      // Static segment outranks :roomId in React Router, so "new" never reaches RoomPage.
      { path: paths.createRoom, element: <CreateRoomPage /> },
      { path: paths.room(), element: <RoomPage /> },
      { path: paths.aiSetup, element: <AiSetupPage /> },
      { path: paths.match(), element: <MatchPage /> },
      { path: paths.history, element: <HistoryPage /> },
      { path: paths.replay(), element: <ReplayPage /> },
      { path: paths.login, element: <LoginPage /> },
      { path: paths.ranked, element: <RankedPage /> },
      { path: paths.leaderboard, element: <LeaderboardPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

/** Opt in to React Router v7 behaviour now, so the upgrade later changes nothing. */
export const routerOptions = {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
} as const;

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(
  routes,
  routerOptions,
);
