interface ControlGroupHeadingProps {
  title: string;
  tooltip: string;
}

export function ControlGroupHeading({ title, tooltip }: ControlGroupHeadingProps) {
  return (
    <div className="group-head">
      <div className="group-title">{title}</div>
      <span className="group-help" data-tooltip={tooltip}>
        ?
      </span>
    </div>
  );
}
