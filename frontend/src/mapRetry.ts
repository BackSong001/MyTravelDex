// 한 번의 복구만 예약한다. 웹이 다시 보이거나 연결되면 대기 중인 작업을 바로 실행한다.
export function scheduleMapRetry(attempt: number, retry: () => void) {
  const browser = typeof document !== 'undefined' && typeof window !== 'undefined';
  const timer = setTimeout(run, Math.min(60_000, 2000 * 2 ** Math.min(attempt, 5)));
  function cancel() {
    clearTimeout(timer);
    if (browser) {
      window.removeEventListener('online', run);
      document.removeEventListener('visibilitychange', run);
    }
  }
  function run() {
    if (browser && (document.hidden || navigator.onLine === false)) return;
    cancel();
    retry();
  }
  if (browser) {
    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', run);
  }
  return cancel;
}
