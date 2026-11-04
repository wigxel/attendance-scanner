import { AlertsSection } from "./_components/alerts-section";
import { CalendarSection } from "./_components/calendar-section";
import { HistorySection } from "./_components/history-section";
import { InsightsSection } from "./_components/insights-section";
import { LastUpdated } from "./_components/last-updated";

export default function EnvironmentPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8 [--gap:--spacing(4)]">

      <header className="flex flex-wrap items-baseline justify-between gap-2 mb-8 md:mb-12">
        <h1 className="text-3xl font-bold">Environment</h1>
        <LastUpdated />
      </header>

      <div className="flex flex-col gap-(--gap)">
        <InsightsSection />

        <div className="flex gap-(--gap) md:flex-row flex-col">
          <div className="flex-1 flex *:flex-1 basis-8/12">
            <HistorySection />
          </div>

          <div className="basis-4/12 flex *:flex-1">
            <AlertsSection />
          </div>
        </div>

        <CalendarSection />
      </div>
    </div>
  );
}
