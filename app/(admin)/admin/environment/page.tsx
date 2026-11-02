import { AlertsSection } from "./_components/alerts-section";
import { CalendarSection } from "./_components/calendar-section";
import { HistorySection } from "./_components/history-section";
import { InsightsSection } from "./_components/insights-section";
import { LastUpdated } from "./_components/last-updated";

export default function EnvironmentPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold">Environment</h1>
        <LastUpdated />
      </header>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <InsightsSection />
          <HistorySection />
          <CalendarSection />
        </div>
        <div className="min-w-0 lg:sticky lg:top-(--header-height) lg:max-h-[calc(100svh-var(--header-height)-2rem)] lg:overflow-y-auto">
          <AlertsSection />
        </div>
      </div>
    </div>
  );
}
