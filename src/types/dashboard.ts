// ── Widget types ────────────────────────────────────────────────────────────
export type WidgetType =
  | 'state' | 'camera' | 'cameraTalk'
  | 'solar' | 'energy' | 'wallbox'
  | 'heating' | 'grafana' | 'weather'
  | 'numpad' | 'link' | 'log'
  | 'script' | 'systemStats';

// ── Layout ──────────────────────────────────────────────────────────────────
export type Breakpoint = 'desktop' | 'tablet' | 'phone';

export type GridPos = { x: number; y: number; w: number; h: number };

export type Layouts = Partial<Record<Breakpoint, GridPos>>;

// ── Sounds ──────────────────────────────────────────────────────────────────
export type SoundKey =
  | 'tap1' | 'tap2' | 'tap3' | 'tap4' | 'tap5'
  | 'maximize' | 'minimize' | 'confirm' | 'scroll' | 'error';

// ── Appearance ──────────────────────────────────────────────────────────────
export type WidgetAppearance = {
  accentColor?: string;
  accentColor2?: string;
  cardColor?: string;
  textColor?: string;
  iconColor?: string;
};

// ── Widget interaction sounds ────────────────────────────────────────────────
export type WidgetSounds = {
  press?: SoundKey;
  toggle?: SoundKey;
  open?: SoundKey;
  close?: SoundKey;
  confirm?: SoundKey;
  error?: SoundKey;
  scroll?: SoundKey;
};

// ── Base ─────────────────────────────────────────────────────────────────────
export type WidgetBase = {
  id: string;
  type: WidgetType;
  title: string;
  showTitle?: boolean;
  layouts: Layouts;
  appearance?: WidgetAppearance;
  sounds?: WidgetSounds;
};

// ── State widget ─────────────────────────────────────────────────────────────
export type StateWidgetConfig = WidgetBase & {
  type: 'state';
  stateId: string;
  writeable: boolean;
  format?: 'boolean' | 'number' | 'string' | 'button';
  onLabel?: string;
  offLabel?: string;
  labelOn?: string;
  labelOff?: string;
  activeValue?: string;
  valueLabels?: Record<string, string>;
  decimals?: number;
  unit?: string;
  iconImage?: string;
  maximizeStateId?: string;
};

// ── Camera widget ─────────────────────────────────────────────────────────────
export type CameraSource = 'snapshot' | 'mjpeg' | 'flv';

export type CameraWidgetConfig = WidgetBase & {
  type: 'camera' | 'cameraTalk';
  previewMode?: CameraSource;
  fullscreenMode?: CameraSource;
  snapshotUrl?: string;
  mjpegUrl?: string;
  flvUrl?: string;
  fullscreenSnapshotUrl?: string;
  fullscreenMjpegUrl?: string;
  fullscreenFlvUrl?: string;
  refreshMs?: number;
  aspectRatio?: string;
  audioEnabled?: boolean;
  maximizeStateId?: string;
  // Reolink talkback
  reolinkTalkUrl?: string;
  reolinkUser?: string;
  reolinkPass?: string;
  reolinkChannel?: number;
  // Instar talkback
  instarBaseUrl?: string;
  instarUser?: string;
  instarPass?: string;
  instarChannel?: number;
  pushToTalk?: boolean;
};

// ── Solar widget ──────────────────────────────────────────────────────────────
export type SolarStatCard = {
  label: string;
  stateId: string;
  unit?: string;
  color?: string;
};

export type SolarWidgetConfig = WidgetBase & {
  type: 'solar';
  statePrefix?: string;
  pvStateId?: string;
  homeStateId?: string;
  gridStateId?: string;
  batteryStateId?: string;
  socStateId?: string;
  pvDayStateId?: string;
  homeDayStateId?: string;
  selfDayStateId?: string;
  battTempStateId?: string;
  stats?: SolarStatCard[];
  showWallbox?: boolean;
  wallboxStateId?: string;
};

// ── Energy widget ─────────────────────────────────────────────────────────────
export type EnergyWidgetConfig = WidgetBase & {
  type: 'energy';
  pvStateId?: string;
  houseStateId?: string;
  batteryStateId?: string;
  gridStateId?: string;
};

// ── Wallbox / go-e ────────────────────────────────────────────────────────────
export type WallboxWidgetConfig = WidgetBase & {
  type: 'wallbox';
  statePrefix?: string;
  powerStateId?: string;
  socStateId?: string;
  statusStateId?: string;
  chargedStateId?: string;
  allowedCurrentStateId?: string;
  writeCurrentStateId?: string;
  toggleStateId?: string;
};

// ── Heating widget ────────────────────────────────────────────────────────────
export type HeatingWidgetConfig = WidgetBase & {
  type: 'heating';
  tempActualStateId?: string;
  tempSetStateId?: string;
  tempSetNormalStateId?: string;
  tempSetReducedStateId?: string;
  tempSetFrostStateId?: string;
  modeReadStateId?: string;
  modeWriteStateId?: string;
  activeProgStateId?: string;
  humidityStateId?: string;
  valveStateId?: string;
  backgroundImage?: string;
  minTemp?: number;
  maxTemp?: number;
};

// ── Grafana widget ────────────────────────────────────────────────────────────
export type GrafanaWidgetConfig = WidgetBase & {
  type: 'grafana';
  snapshotUrl: string;
  refreshMs?: number;
  fullscreenUrl?: string;
  width?: number;
  height?: number;
};

// ── Weather widget ────────────────────────────────────────────────────────────
export type WeatherWidgetConfig = WidgetBase & {
  type: 'weather';
  source?: 'open-meteo' | 'iobroker';
  latitude?: number;
  longitude?: number;
  locationName?: string;
  tempStateId?: string;
  conditionStateId?: string;
  humidityStateId?: string;
};

// ── Numpad widget ─────────────────────────────────────────────────────────────
export type NumpadWidgetConfig = WidgetBase & {
  type: 'numpad';
  stateId?: string;
  maxLength?: number;
  confirmStateId?: string;
  pinMode?: boolean;
};

// ── Link widget ───────────────────────────────────────────────────────────────
export type LinkWidgetConfig = WidgetBase & {
  type: 'link';
  url: string;
  label?: string;
  iconImage?: string;
  openInOverlay?: boolean;
};

// ── Log widget ────────────────────────────────────────────────────────────────
export type LogWidgetConfig = WidgetBase & {
  type: 'log';
  levelFilter?: ('debug' | 'info' | 'warn' | 'error')[];
  minLevel?: 'debug' | 'info' | 'warn' | 'error';
  sourceFilter?: string;
  maxLines?: number;
};

// ── Script widget ─────────────────────────────────────────────────────────────
export type ScriptWidgetConfig = WidgetBase & {
  type: 'script';
  scriptId?: string;
  buttonLabel?: string;
  showOutput?: boolean;
};

// ── SystemStats widget ────────────────────────────────────────────────────────
export type SystemStatsWidgetConfig = WidgetBase & {
  type: 'systemStats';
  host?: string;
  refreshMs?: number;
};

// ── Union ─────────────────────────────────────────────────────────────────────
export type WidgetConfig =
  | StateWidgetConfig
  | CameraWidgetConfig
  | SolarWidgetConfig
  | EnergyWidgetConfig
  | WallboxWidgetConfig
  | HeatingWidgetConfig
  | GrafanaWidgetConfig
  | WeatherWidgetConfig
  | NumpadWidgetConfig
  | LinkWidgetConfig
  | LogWidgetConfig
  | ScriptWidgetConfig
  | SystemStatsWidgetConfig;

// ── Page ──────────────────────────────────────────────────────────────────────
export type DashboardPage = {
  id: string;
  label: string;
  widgets: WidgetConfig[];
  backgroundImage?: string;
  backgroundOpacity?: number;
};

// ── Dashboard settings ────────────────────────────────────────────────────────
export type SoundSettings = {
  enabled: boolean;
  volume: number;
};

export type DashboardSettings = {
  title?: string;
  homeLabel?: string;
  rowHeight: number;
  soundSettings?: SoundSettings;
};

// ── Root config ───────────────────────────────────────────────────────────────
export type DashboardConfig = {
  version: 3;
  settings: DashboardSettings;
  pages: DashboardPage[];
};

// ── ioBroker state ────────────────────────────────────────────────────────────
export type IoBrokerState = {
  val: string | number | boolean | null;
  ts: number;
  ack: boolean;
};
