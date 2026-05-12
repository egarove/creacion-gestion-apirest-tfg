interface LoadingOverlayProps {
  message: string;
}

export default function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-[#060b14]/85 z-[400] flex flex-col items-center justify-center gap-4">
      <div className="w-11 h-11 border-4 border-borderNormal border-t-primary rounded-full animate-spin-custom"></div>
      <div className="text-textSoft text-sm text-center max-w-[300px]">{message}</div>
    </div>
  );
}
