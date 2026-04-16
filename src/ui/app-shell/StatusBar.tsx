interface StatusBarProps {
  modeSummary: string;
  fileSummary: string;
}

export function StatusBar({ modeSummary, fileSummary }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="status-section status-section-left">
        <span className="status-pen">✎</span>
        <span className="status-value" data-mode-summary>
          {modeSummary}
        </span>
      </div>
      <div className="status-section status-section-center">
        <span className="status-value" data-file-summary>
          {fileSummary}
        </span>
      </div>
    </div>
  );
}
