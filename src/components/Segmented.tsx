interface SegmentedProps {
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  preserveFocus?: boolean;
  value: string;
}

export function Segmented({ onChange, options, preserveFocus = true, value }: SegmentedProps) {
  return (
    <div className="segmented">
      {options.map(([optionValue, label]) => (
        <button
          className={value === optionValue ? "active" : ""}
          key={optionValue}
          onClick={() => onChange(optionValue)}
          onMouseDown={preserveFocus ? (event) => event.preventDefault() : undefined}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
