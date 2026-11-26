/** Every screen in SRS 9.1, in one place so links never drift from the router. */
export const paths = {
  home: '/',
  createRoom: '/room/new',
  room: (roomId = ':roomId') => `/room/${roomId}`,
  aiSetup: '/play/ai',
  match: (matchId = ':matchId') => `/match/${matchId}`,
  history: '/history',
  replay: (matchId = ':matchId') => `/history/${matchId}`,
  login: '/login',
  ranked: '/ranked',
  leaderboard: '/leaderboard',
} as const;
