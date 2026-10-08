import { CalendarSection } from "./_components/calendar-section";
import { HistorySection } from "./_components/history-section";
import { InsightsSection } from "./_components/insights-section";

export default function EnvironmentPage() {
  return (
    <div className="p-8 flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Environment</h1>
      <InsightsSection />
      <HistorySection />
      <CalendarSection />
    </div>
  );
}
