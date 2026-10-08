export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startZineSchedule } = await import("@/lib/zine-schedule");
    startZineSchedule();
  }
}
