import { CalendarSection } from "./_components/calendar-section";
import { HistorySection } from "./_components/history-section";
import { InsightsSection } from "./_components/insights-section";
import { LastUpdated } from "./_components/last-updated";
import { AlertsSection } from "./_components/alerts-section";

export default function EnvironmentPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold">Environment</h1>
        <LastUpdated />
      </header>
      <AlertsSection />
      <InsightsSection />
      <HistorySection />
      <CalendarSection />
    </div>
  );
}
