import { useEffect, useState } from 'react';
import { useIoBrokerStates } from '../../hooks/useIoBrokerStates';
import type { WeatherWidgetConfig } from '../../types/dashboard';

interface Props { widget: WeatherWidgetConfig }

interface WeatherData { temp: number; windspeed: number; weathercode: number }

const WMO_ICONS: Record<number, string> = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫',
  51: '🌦', 53: '🌦', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '🌧',
  71: '🌨', 73: '🌨', 75: '❄️',
  80: '🌦', 81: '🌧', 82: '⛈',
  85: '🌨', 86: '❄️',
  95: '⛈', 96: '⛈', 99: '⛈',
};

export default function WeatherWidget({ widget }: Props) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);

  const ids = [widget.tempStateId, widget.conditionStateId, widget.humidityStateId].filter(Boolean) as string[];
  const states = useIoBrokerStates(ids);

  // Prefer ioBroker states over Open-Meteo
  const ioTemp = widget.tempStateId ? parseFloat(String(states[widget.tempStateId]?.val ?? 'NaN')) : NaN;

  useEffect(() => {
    if (!widget.latitude || !widget.longitude) return;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${widget.latitude}&longitude=${widget.longitude}&current_weather=true`;
    fetch(url)
      .then(r => r.json())
      .then(j => setData(j.current_weather))
      .catch(() => setError(true));
  }, [widget.latitude, widget.longitude]);

  const temp = isNaN(ioTemp) ? data?.temp : ioTemp;
  const humidity = widget.humidityStateId ? parseFloat(String(states[widget.humidityStateId]?.val ?? 'NaN')) : NaN;
  const icon = data?.weathercode != null ? (WMO_ICONS[data.weathercode] ?? '🌡') : '🌡';

  return (
    <div className="widget-card">
      {widget.showTitle !== false && <div className="widget-title">{widget.locationName ?? widget.title}</div>}
      <div className="widget-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <div style={{ fontSize: 36 }}>{icon}</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
          {temp != null ? `${temp.toFixed(1)}°C` : error ? 'Fehler' : '…'}
        </div>
        {!isNaN(humidity) && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{Math.round(humidity)}% Luftfeuchte</div>
        )}
        {data?.windspeed != null && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{Math.round(data.windspeed)} km/h Wind</div>
        )}
      </div>
    </div>
  );
}
