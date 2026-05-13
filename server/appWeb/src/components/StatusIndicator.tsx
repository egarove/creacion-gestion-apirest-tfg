interface StatusIndicatorProps {
  status: "running" | "stopped";
}

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  return (
    <span
      className={`w-2 h-2 rounded-full ${status === "running" ? "bg-success" : "bg-danger"}`}
    ></span>
  );
}
