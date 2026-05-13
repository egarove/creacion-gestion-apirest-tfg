import { Tabs } from "../../types";

interface PanelTabsProps {
  currentTab: Tabs;
  endpointsCount: number;
  onTabChange: (tab: Tabs) => void;
}

export default function PanelTabs({
  currentTab,
  endpointsCount,
  onTabChange,
}: PanelTabsProps) {
  const tabs = [
    { id: "info", label: "Información" },
    { id: "endpoints", label: `Endpoints (${endpointsCount})` },
    { id: "logs", label: "Logs" },
  ];

  return (
    <div className="flex border-b border-borderNormal shrink-0 ">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onTabChange(id as Tabs)}
          className={`flex-1 py-3 text-xs font-semibold transition-colors ${
            currentTab === id
              ? "border-b-2 border-primary text-primary"
              : "text-textMuted hover:text-textSoft"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
