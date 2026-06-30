import { useEffect, useState } from 'react';
import { useIoBrokerStates } from '../../hooks/useIoBrokerStates';
import type { WeatherWidgetConfig } from '../../types/dashboard';

interface Props { widget: WeatherWidgetConfig }

interface WeatherData { temp: number; windspeed: number; weathercode: number }
interface DailyForecast {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

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

const WMO_LABELS: Record<number, string> = {
  0: 'Klar', 1: 'Heiter', 2: 'Wolkig', 3: 'Bedeckt',
  45: 'Nebel', 48: 'Nebel',
  51: 'Nieselregen', 53: 'Nieselregen', 55: 'Nieselregen',
  61: 'Regen', 63: 'Regen', 65: 'Regen',
  71: 'Schnee', 73: 'Schnee', 75: 'Schnee',
  80: 'Schauer', 81: 'Schauer', 82: 'Schauer',
  85: 'Schneeschauer', 86: 'Schneeschauer',
  95: 'Gewitter', 96: 'Gewitter', 99: 'Gewitter',
};

const DAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export default function WeatherWidget({ widget }: Props) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [daily, setDaily] = useState<DailyForecast | null>(null);
  const [error, setError] = useState(false);

  const ids = [widget.tempStateId, widget.conditionStateId, widget.humidityStateId].filter(Boolean) as string[];
  const states = useIoBrokerStates(ids);

  // Prefer ioBroker states over Open-Meteo
  const ioTemp = widget.tempStateId ? parseFloat(String(states[widget.tempStateId]?.val ?? 'NaN')) : NaN;

  useEffect(() => {
    if (!widget.latitude || !widget.longitude) return;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${widget.latitude}&longitude=${widget.longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
    fetch(url)
      .then(r => r.json())
      .then(j => { setData(j.current_weather); setDaily(j.daily ?? null); })
      .catch(() => setError(true));
  }, [widget.latitude, widget.longitude]);

  const temp = isNaN(ioTemp) ? data?.temp : ioTemp;
  const humidity = widget.humidityStateId ? parseFloat(String(states[widget.humidityStateId]?.val ?? 'NaN')) : NaN;
  const code = data?.weathercode;
  const icon = code != null ? (WMO_ICONS[code] ?? '🌡') : '🌡';
  const label = code != null ? (WMO_LABELS[code] ?? '') : '';

  const forecastDays = daily?.time?.slice(0, 6) ?? [];

  return (
    <div
      className="widget-card"
      style={{
        background: 'var(--grad-blue)',
        border: '1px solid rgba(255,255,255,0.14)',
      }}
    >
      {widget.showTitle !== false && (
        <div className="widget-title" style={{ color: 'rgba(255,255,255,0.72)' }}>
          {widget.locationName ?? widget.title}
        </div>
      )}
      <div className="widget-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ fontSize: 44, lineHeight: 1 }}>{icon}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
              {temp != null ? `${Math.round(temp)}°` : error ? 'Fehler' : '…'}
            </div>
            {label && (
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>{label}</div>
            )}
            {(!isNaN(humidity) || data?.windspeed != null) && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', display: 'flex', gap: 8 }}>
                {!isNaN(humidity) && <span>{Math.round(humidity)}% Luftfeuchte</span>}
                {data?.windspeed != null && <span>{Math.round(data.windspeed)} km/h</span>}
              </div>
            )}
          </div>
        </div>

        {forecastDays.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${forecastDays.length}, 1fr)`,
              gap: 4,
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid rgba(255,255,255,0.16)',
            }}
          >
            {forecastDays.map((d, i) => {
              const dt = new Date(d);
              const dayCode = daily!.weathercode[i];
              const max = daily!.temperature_2m_max[i];
              const min = daily!.temperature_2m_min[i];
              return (
                <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>
                    {DAY_LABELS[dt.getDay()]}
                  </div>
                  <div style={{ fontSize: 16 }}>{WMO_ICONS[dayCode] ?? '🌡'}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
                    {Math.round(max)}°
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
                    {Math.round(min)}°
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
