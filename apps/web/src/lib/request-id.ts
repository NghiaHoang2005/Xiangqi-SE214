/** Same shape the server accepts (8-64 chars of [A-Za-z0-9_-]), so it is kept in server logs. */
export function newRequestId(): string {
  return crypto.randomUUID();
}
