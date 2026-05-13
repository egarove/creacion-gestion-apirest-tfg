interface LogsTabProps {
  logs: string;
  loading: boolean;
  onRefresh: () => void;
}

export default function LogsTab({ logs, loading, onRefresh }: LogsTabProps) {
  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={onRefresh}
          className="text-xs text-primary hover:text-purple-300 transition-colors"
        >
          <i className="fas fa-sync-alt mr-1"></i>Recargar
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-borderNormal border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <pre className="bg-card border border-borderNormal rounded-xl p-4 text-[11px] text-textSoft font-mono overflow-x-auto whitespace-pre-wrap max-h-[65vh] overflow-y-auto">
          {logs}
        </pre>
      )}
    </div>
  );
}
