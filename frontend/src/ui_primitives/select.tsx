import { ChangeEvent } from 'react';
import '../ui_v2/theme/tokens.css';
import { cx } from '../ui_v2/utils/classNames';

type SelectOption = {
  label: string;
  value: string;
};

type TGSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
};

export function TGSelect({ value, onValueChange, options, placeholder, className }: TGSelectProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onValueChange(event.target.value);
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      className={cx('tg-ui2', className)}
      style={{
        width: '100%',
        border: '1px solid var(--tg-border)',
        borderRadius: 'var(--tg-radius-sm)',
        padding: '6px 10px',
        backgroundColor: 'var(--tg-panel)',
        color: 'var(--tg-text)',
        fontSize: 'var(--tg-font-sm)',
      }}
    >
      {placeholder ? (
        <option value="" hidden>
          {placeholder}
        </option>
      ) : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
