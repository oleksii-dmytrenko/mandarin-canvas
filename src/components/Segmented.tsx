interface SegmentedProps {
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}

export function Segmented({ onChange, options, value }: SegmentedProps) {
  return (
    <div className="segmented">
      {options.map(([optionValue, label]) => (
        <button className={value === optionValue ? "active" : ""} key={optionValue} onClick={() => onChange(optionValue)} type="button">
          {label}
        </button>
      ))}
    </div>
  );
}
