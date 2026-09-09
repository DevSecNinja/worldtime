import type { TimeFormat } from '../domain/event';

interface TimeInputProps {
  id: string;
  value: string;
  format: TimeFormat;
  onChange: (value: string) => void;
  labels: {
    time: string;
    hour: string;
    minute: string;
    period: string;
  };
}

const pad = (value: number) => String(value).padStart(2, '0');

export function TimeInput({ id, value, format, onChange, labels }: TimeInputProps) {
  const [hourValue, minuteValue] = value.split(':').map(Number);
  const isPm = hourValue >= 12;
  const displayHour = format === 'h12'
    ? hourValue % 12 || 12
    : hourValue;

  const update = (hour: number, minute: number, periodIsPm = isPm) => {
    const normalizedHour = format === 'h12'
      ? (hour % 12) + (periodIsPm ? 12 : 0)
      : hour;
    onChange(`${pad(normalizedHour)}:${pad(minute)}`);
  };

  return (
    <div className='time-input' id={id} role='group' aria-label={labels.time}>
      <label>
        <span className='sr-only'>{labels.hour}</span>
        <select
          value={displayHour}
          aria-label={labels.hour}
          onChange={(event) => update(Number(event.target.value), minuteValue)}
        >
          {Array.from({ length: format === 'h12' ? 12 : 24 }, (_, index) => {
            const hour = format === 'h12' ? index + 1 : index;
            return <option value={hour} key={hour}>{pad(hour)}</option>;
          })}
        </select>
      </label>
      <span aria-hidden='true'>:</span>
      <label>
        <span className='sr-only'>{labels.minute}</span>
        <select
          value={minuteValue}
          aria-label={labels.minute}
          onChange={(event) => update(displayHour, Number(event.target.value))}
        >
          {Array.from(
            { length: 60 },
            (_, minute) => <option value={minute} key={minute}>{pad(minute)}</option>,
          )}
        </select>
      </label>
      {format === 'h12' && (
        <label className='period-label'>
          <span className='sr-only'>{labels.period}</span>
          <select
            value={isPm ? 'pm' : 'am'}
            aria-label={labels.period}
            onChange={(event) => update(displayHour, minuteValue, event.target.value === 'pm')}
          >
            <option value='am'>AM</option>
            <option value='pm'>PM</option>
          </select>
        </label>
      )}
    </div>
  );
}
