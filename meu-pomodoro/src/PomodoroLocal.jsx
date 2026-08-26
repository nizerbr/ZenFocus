import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Pomodoro.css';

// ─── Dados dos temas ───────────────────────────────────────
const themeDetails = {
  forest: {
    name: 'Floresta Fria',
    desc: 'Pássaros, folhas e vento suave.',
    bg: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80&auto=format',
    icon: 'forest',
  },
  campfire: {
    name: 'Fogueira',
    desc: 'Floresta e fogueira crepitando.',
    bg: 'https://images.unsplash.com/photo-1475483768296-6163e08872a1?w=1920&q=80&auto=format',
    icon: 'local_fire_department',
  },
  snow: {
    name: 'Nevada',
    desc: 'Frio e ruído branco calmante.',
    bg: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=1920&q=80&auto=format',
    icon: 'ac_unit',
  },
};

// ─── Web Audio API — sons ambiente gerados ──────────────────
class AmbientAudioEngine {
  constructor() {
    this.ctx = null;
    this.nodes = [];
    this.masterGain = null;
    this.isPlaying = false;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0;
  }

  stop() {
    this.nodes.forEach(n => {
      try { n.stop(); } catch {}
      try { n.disconnect(); } catch {}
    });
    this.nodes = [];
    this.isPlaying = false;
  }

  setVolume(v) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
    }
  }

  createNoise(type = 'white') {
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (last + 0.02 * white) / 1.02;
        last = data[i];
        data[i] *= 3.5;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  playForest() {
    this.stop();
    this.init();

    // Brown noise filtered = wind
    const noise = this.createNoise('brown');
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 400;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.4;
    noise.connect(lpf).connect(gain).connect(this.masterGain);
    noise.start();
    this.nodes.push(noise);

    // Bird chirps using oscillators
    const chirpLoop = () => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      const baseFreq = 2000 + Math.random() * 2000;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq + 800, now + 0.05);
      osc.frequency.linearRampToValueAtTime(baseFreq - 200, now + 0.1);
      osc.frequency.linearRampToValueAtTime(baseFreq + 400, now + 0.15);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.08, now + 0.02);
      g.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.connect(g).connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
      setTimeout(chirpLoop, 3000 + Math.random() * 8000);
    };
    this.isPlaying = true;
    setTimeout(chirpLoop, 1000);
  }

  playCampfire() {
    this.stop();
    this.init();

    // Brown noise = fire crackle base
    const noise = this.createNoise('brown');
    const bpf = this.ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 800;
    bpf.Q.value = 0.5;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.5;
    noise.connect(bpf).connect(gain).connect(this.masterGain);
    noise.start();
    this.nodes.push(noise);

    // Crackling pops
    const crackle = () => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 100 + Math.random() * 300;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.15, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05 + Math.random() * 0.1);
      osc.connect(g).connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.2);
      setTimeout(crackle, 100 + Math.random() * 600);
    };
    this.isPlaying = true;
    setTimeout(crackle, 200);

    // Low rumble
    const rumble = this.createNoise('brown');
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 150;
    const gRumble = this.ctx.createGain();
    gRumble.gain.value = 0.2;
    rumble.connect(lpf).connect(gRumble).connect(this.masterGain);
    rumble.start();
    this.nodes.push(rumble);
  }

  playSnow() {
    this.stop();
    this.init();

    // Pink noise = wind + snow ambience
    const noise = this.createNoise('pink');
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 600;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.45;
    noise.connect(lpf).connect(gain).connect(this.masterGain);
    noise.start();
    this.nodes.push(noise);

    // Gentle high wind
    const wind = this.createNoise('white');
    const hpf = this.ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 3000;
    const gWind = this.ctx.createGain();
    gWind.gain.value = 0.06;
    wind.connect(hpf).connect(gWind).connect(this.masterGain);
    wind.start();
    this.nodes.push(wind);
  }

  playForTheme(theme) {
    switch (theme) {
      case 'forest': this.playForest(); break;
      case 'campfire': this.playCampfire(); break;
      case 'snow': this.playSnow(); break;
      default: this.playForest();
    }
  }
}

const audioEngine = new AmbientAudioEngine();

// ─── Constants ─────────────────────────────────────────────
const DEFAULT_FOCUS = 25;
const DEFAULT_BREAK = 5;
const DEFAULT_DAILY_GOAL = 8;

// ─── Helpers ──────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getTodayStr() {
  return new Date().toLocaleDateString();
}

function loadHistory() {
  return JSON.parse(localStorage.getItem('zenfocus_history') || '[]');
}

function saveHistory(history) {
  localStorage.setItem('zenfocus_history', JSON.stringify(history));
}

function loadSettings() {
  const defaults = { focusMin: DEFAULT_FOCUS, breakMin: DEFAULT_BREAK, dailyGoal: DEFAULT_DAILY_GOAL };
  try {
    const s = JSON.parse(localStorage.getItem('zenfocus_settings'));
    return { ...defaults, ...s };
  } catch { return defaults; }
}

function saveSettings(settings) {
  localStorage.setItem('zenfocus_settings', JSON.stringify(settings));
}

function calcStats(history) {
  const today = history.filter(s => s.dateString === getTodayStr());
  const focusSessions = today.filter(s => s.type === 'focus');
  return {
    completedToday: focusSessions.length,
    minutesToday: focusSessions.reduce((acc, s) => acc + s.durationMinutes, 0),
  };
}

function calcWeeklyStats(history) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString();
    const daySessions = history.filter(s => s.dateString === dateStr && s.type === 'focus');
    days.push({
      label: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
      sessions: daySessions.length,
      minutes: daySessions.reduce((acc, s) => acc + s.durationMinutes, 0),
    });
  }
  return days;
}

function calcStreak(history) {
  const focusOnly = history.filter(s => s.type === 'focus');
  if (focusOnly.length === 0) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString();
    const has = focusOnly.some(s => s.dateString === dateStr);
    if (has) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function calcTotalStats(history) {
  const focusOnly = history.filter(s => s.type === 'focus');
  return {
    totalSessions: focusOnly.length,
    totalMinutes: focusOnly.reduce((acc, s) => acc + s.durationMinutes, 0),
    totalHours: Math.floor(focusOnly.reduce((acc, s) => acc + s.durationMinutes, 0) / 60),
  };
}

// ─── Componente principal ──────────────────────────────────
export default function PomodoroLocal() {
  const savedSettings = loadSettings();

  // Timer
  const [timeLeft, setTimeLeft] = useState(savedSettings.focusMin * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [timerType, setTimerType] = useState('focus');

  // Visual
  const [theme, setTheme] = useState('forest');
  const [activePanel, setActivePanel] = useState(null); // 'theme' | 'analytics' | 'config' | null

  // Áudio
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.5);

  // Modal
  const [showCongrats, setShowCongrats] = useState(false);

  // Settings
  const [focusMin, setFocusMin] = useState(savedSettings.focusMin);
  const [breakMin, setBreakMin] = useState(savedSettings.breakMin);
  const [dailyGoal, setDailyGoal] = useState(savedSettings.dailyGoal);

  // Stats
  const [stats, setStats] = useState({ completedToday: 0, minutesToday: 0 });
  const [history, setHistory] = useState([]);

  // ── Load on mount ──
  useEffect(() => {
    const h = loadHistory();
    setHistory(h);
    setStats(calcStats(h));
  }, []);

  // ── Timer engine ──
  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      setShowCongrats(true);
      handleSessionComplete();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // ── Audio engine ──
  useEffect(() => {
    if (!isMuted) {
      audioEngine.playForTheme(theme);
      audioEngine.setVolume(volume);
    } else {
      audioEngine.setVolume(0);
      audioEngine.stop();
    }
    return () => audioEngine.stop();
  }, [theme, isMuted]);

  useEffect(() => {
    if (!isMuted) audioEngine.setVolume(volume);
  }, [volume]);

  // ── Ações ──
  function handlePlayPause() {
    const next = !isRunning;
    setIsRunning(next);
    if (next && isMuted) setIsMuted(false);
  }

  function handleReset() {
    setIsRunning(false);
    setTimeLeft((timerType === 'focus' ? focusMin : breakMin) * 60);
  }

  function handleTypeChange(type) {
    setIsRunning(false);
    setTimerType(type);
    setTimeLeft((type === 'focus' ? focusMin : breakMin) * 60);
  }

  function handleSessionComplete() {
    const duration = timerType === 'focus' ? focusMin : breakMin;
    const session = {
      type: timerType,
      durationMinutes: duration,
      timestamp: Date.now(),
      dateString: getTodayStr(),
    };
    const h = loadHistory();
    h.push(session);
    saveHistory(h);
    setHistory(h);
    setStats(calcStats(h));
  }

  function handleTakeBreak() {
    setShowCongrats(false);
    handleTypeChange('break');
  }

  function handleKeepFocus() {
    setShowCongrats(false);
    handleTypeChange('focus');
  }

  function handleSaveSettings() {
    const s = { focusMin, breakMin, dailyGoal };
    saveSettings(s);
    if (!isRunning) {
      setTimeLeft((timerType === 'focus' ? focusMin : breakMin) * 60);
    }
  }

  function handleClearHistory() {
    if (confirm('Tem certeza que deseja apagar todo o histórico?')) {
      saveHistory([]);
      setHistory([]);
      setStats({ completedToday: 0, minutesToday: 0 });
    }
  }

  // ── Valores derivados ──
  const FOCUS_TIME = focusMin * 60;
  const BREAK_TIME = breakMin * 60;
  const DAILY_GOAL = dailyGoal;
  const currentCycle = stats.completedToday + 1;
  const goalPct = Math.min((stats.completedToday / DAILY_GOAL) * 100, 100);
  const horasFoco = Math.floor(stats.minutesToday / 60);
  const minFoco = stats.minutesToday % 60;
  const weeklyStats = calcWeeklyStats(history);
  const streak = calcStreak(history);
  const totalStats = calcTotalStats(history);
  const maxWeekly = Math.max(...weeklyStats.map(d => d.sessions), 1);

  // ── Render ─────────────────────────────────────────────
  return (
    <div className={`pomodoro-layout theme-${theme} ${isRunning ? 'focus-active' : ''}`}>

      {/* Fundo */}
      <div className="bg-container">
        {Object.entries(themeDetails).map(([key, val]) => (
          <img
            key={key}
            src={val.bg}
            alt={val.name}
            className={`bg-image-transition ${theme === key ? 'active' : 'inactive'}`}
          />
        ))}
        <div className="atmospheric-overlay" />
      </div>

      {/* ── Sidebar ── */}
      <aside className="sidebar-nav">
        <div className="sidebar-branding-wrapper">
          <div className="sidebar-branding">
            <span className="material-symbols-outlined logo-icon">eco</span>
            <div className="branding-text">
              <h2>ZenFocus</h2>
              <p>Modo Local</p>
            </div>
          </div>
        </div>

        <nav className="nav-menu">
          <button
            className={`nav-item ${activePanel === null ? 'active' : ''}`}
            onClick={() => setActivePanel(null)}
          >
            <span className="material-symbols-outlined">timer</span>
            <span className="nav-label">Focus</span>
          </button>

          <button
            className={`nav-item ${activePanel === 'theme' ? 'active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'theme' ? null : 'theme')}
          >
            <span className="material-symbols-outlined">palette</span>
            <span className="nav-label">Ambientes</span>
          </button>

          <button
            className={`nav-item ${activePanel === 'analytics' ? 'active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'analytics' ? null : 'analytics')}
          >
            <span className="material-symbols-outlined">bar_chart</span>
            <span className="nav-label">Analytics</span>
          </button>

          <button
            className={`nav-item ${activePanel === 'config' ? 'active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'config' ? null : 'config')}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="nav-label">Config</span>
          </button>
        </nav>

        {/* Widget de progresso */}
        <div className="progress-widget" style={{ background: 'rgba(126,207,173,0.05)' }}>
          <div className="widget-overlay" />
          <div className="widget-content">
            <span className="widget-title">Hoje</span>
            <div className="widget-metric">
              <span className="metric-number">{stats.completedToday}</span>
              <span className="metric-label">Pomodoro{stats.completedToday !== 1 ? 's' : ''}</span>
            </div>
            <div className="widget-time">
              <span className="material-symbols-outlined">schedule</span>
              <span>{stats.minutesToday} min</span>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <span className="material-symbols-outlined">account_circle</span>
            <span className="user-email">usuário local</span>
          </div>
        </div>
      </aside>

      {/* ── Timer Central ── */}
      <main className="timer-canvas">
        <div className="session-switcher">
          <button
            className={`session-tab ${timerType === 'focus' ? 'active' : ''}`}
            onClick={() => handleTypeChange('focus')}
          >
            Foco
          </button>
          <button
            className={`session-tab ${timerType === 'break' ? 'active' : ''}`}
            onClick={() => handleTypeChange('break')}
          >
            Pausa
          </button>
        </div>

        <div className="timer-ring-container" onClick={handlePlayPause}>
          <svg className="timer-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" className="ring-path-bg" />
            <circle cx="50" cy="50" r="45" className="ring-path-progress" />
          </svg>
          <div className="timer-inner-content">
            <span className="timer-state-label">
              {timerType === 'focus' ? 'Concentração' : 'Pausa'}
            </span>
            <div className="timer-digits">{formatTime(timeLeft)}</div>
            <div className="timer-unit-label">minutos</div>
            <span className="timer-action-hint">
              {isRunning ? 'Clique para pausar' : 'Clique para iniciar'}
            </span>
          </div>
        </div>

        <div className="timer-actions">
          <button className="action-circle-btn" onClick={handleReset} title="Reiniciar">
            <span className="material-symbols-outlined">history</span>
          </button>
          <button className="action-circle-btn play-btn" onClick={handlePlayPause}>
            <span className="material-symbols-outlined">
              {isRunning ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button className="action-circle-btn" onClick={() => setIsMuted(!isMuted)}>
            <span className="material-symbols-outlined">
              {isMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>
        </div>
      </main>

      {/* ── Painel Direito ── */}
      <aside className="right-panel">
        <div className="stats-block">
          <div className="stats-block-label"><span>Hoje</span></div>
          <div className="stats-big-time">
            <span className="val">{horasFoco}h</span>
            <span className="unit">{minFoco}m</span>
          </div>
          <div className="stats-sub">Tempo de foco total</div>
          <div className="stats-progress-bar">
            <div className="stats-progress-fill" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="stats-progress-pct">↑ {Math.round(goalPct)}%</div>
        </div>

        <div className="focus-row">
          <div className="focus-card">
            <div className="focus-card-label">Ciclo</div>
            <div className="focus-card-value">#{String(currentCycle).padStart(2, '0')}</div>
          </div>
          <div className="focus-card">
            <div className="focus-card-label">Meta</div>
            <div className="focus-card-value">{String(DAILY_GOAL).padStart(2, '0')}</div>
          </div>
        </div>

        <div className="sounds-block">
          <div className="sounds-block-label">Sons Ambientes</div>
          <div className="sound-list">
            {Object.entries(themeDetails).map(([key, val]) => (
              <button
                key={key}
                className={`sound-item ${theme === key ? 'active' : ''}`}
                onClick={() => { setTheme(key); if (isMuted) setIsMuted(false); }}
              >
                <span className="material-symbols-outlined">{val.icon}</span>
                <span className="sound-item-name">{val.name}</span>
                {theme === key && <span className="sound-active-dot" />}
              </button>
            ))}
          </div>
        </div>

        <div className="volume-section">
          <div className="volume-header">
            <span>Volume do Som</span>
            <span className="vol-pct">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.05"
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="volume-range-input"
            style={{
              background: `linear-gradient(to right, #7ecfad ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`
            }}
          />
        </div>
      </aside>

      {/* ── Painel flutuante de temas ── */}
      <div className={`floating-panel ${activePanel === 'theme' ? 'panel-open' : 'panel-closed'}`}>
        <div className="panel-header">
          <h3>Selecionar Ambiente</h3>
          <button className="panel-close-btn" onClick={() => setActivePanel(null)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="themes-grid">
          {Object.entries(themeDetails).map(([key, val]) => (
            <div
              key={key}
              className={`theme-card ${theme === key ? 'active' : ''}`}
              onClick={() => { setTheme(key); if (isMuted) setIsMuted(false); }}
            >
              <div className="theme-card-img-wrapper">
                <img src={val.bg} alt={val.name} />
                <div className="theme-card-overlay" />
              </div>
              <div className="theme-card-info">
                <h4>{val.name}</h4>
                <p>{val.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Painel Analytics ── */}
      <div className={`floating-panel ${activePanel === 'analytics' ? 'panel-open' : 'panel-closed'}`}>
        <div className="panel-header">
          <h3>Analytics</h3>
          <button className="panel-close-btn" onClick={() => setActivePanel(null)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="analytics-content">
          {/* Resumo geral */}
          <div className="analytics-summary">
            <div className="analytics-stat-card">
              <span className="material-symbols-outlined">local_fire_department</span>
              <div>
                <span className="analytics-stat-value">{streak}</span>
                <span className="analytics-stat-label">Sequência</span>
              </div>
            </div>
            <div className="analytics-stat-card">
              <span className="material-symbols-outlined">timer</span>
              <div>
                <span className="analytics-stat-value">{totalStats.totalSessions}</span>
                <span className="analytics-stat-label">Total Sessões</span>
              </div>
            </div>
            <div className="analytics-stat-card">
              <span className="material-symbols-outlined">schedule</span>
              <div>
                <span className="analytics-stat-value">{totalStats.totalHours}h</span>
                <span className="analytics-stat-label">Total Horas</span>
              </div>
            </div>
          </div>

          {/* Gráfico semanal */}
          <div className="analytics-chart-section">
            <span className="analytics-section-title">Últimos 7 dias</span>
            <div className="analytics-bar-chart">
              {weeklyStats.map((day, i) => (
                <div key={i} className="analytics-bar-col">
                  <div className="analytics-bar-wrapper">
                    <div
                      className="analytics-bar"
                      style={{ height: `${(day.sessions / maxWeekly) * 100}%` }}
                    />
                  </div>
                  <span className="analytics-bar-label">{day.label}</span>
                  <span className="analytics-bar-value">{day.sessions}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Histórico recente */}
          <div className="analytics-history-section">
            <span className="analytics-section-title">Sessões Recentes</span>
            <div className="analytics-history-list">
              {history.slice(-10).reverse().map((session, i) => (
                <div key={i} className="analytics-history-item">
                  <span className={`analytics-type-badge ${session.type}`}>
                    {session.type === 'focus' ? 'Foco' : 'Pausa'}
                  </span>
                  <span className="analytics-history-time">
                    {session.durationMinutes}min
                  </span>
                  <span className="analytics-history-date">
                    {new Date(session.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {history.length === 0 && (
                <p className="analytics-empty">Nenhuma sessão registrada ainda.</p>
              )}
            </div>
          </div>

          <button className="analytics-clear-btn" onClick={handleClearHistory}>
            <span className="material-symbols-outlined">delete_outline</span>
            Limpar Histórico
          </button>
        </div>
      </div>

      {/* ── Painel Config ── */}
      <div className={`floating-panel ${activePanel === 'config' ? 'panel-open' : 'panel-closed'}`}>
        <div className="panel-header">
          <h3>Configurações</h3>
          <button className="panel-close-btn" onClick={() => setActivePanel(null)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="config-content">
          <div className="config-group">
            <label className="config-label">Duração do Foco (minutos)</label>
            <div className="config-input-row">
              <input
                type="range" min="5" max="60" step="5"
                value={focusMin}
                onChange={e => setFocusMin(parseInt(e.target.value))}
                className="config-range"
                style={{
                  background: `linear-gradient(to right, #7ecfad ${((focusMin - 5) / 55) * 100}%, rgba(255,255,255,0.1) ${((focusMin - 5) / 55) * 100}%)`
                }}
              />
              <span className="config-value">{focusMin}min</span>
            </div>
          </div>

          <div className="config-group">
            <label className="config-label">Duração da Pausa (minutos)</label>
            <div className="config-input-row">
              <input
                type="range" min="1" max="15" step="1"
                value={breakMin}
                onChange={e => setBreakMin(parseInt(e.target.value))}
                className="config-range"
                style={{
                  background: `linear-gradient(to right, #7ecfad ${((breakMin - 1) / 14) * 100}%, rgba(255,255,255,0.1) ${((breakMin - 1) / 14) * 100}%)`
                }}
              />
              <span className="config-value">{breakMin}min</span>
            </div>
          </div>

          <div className="config-group">
            <label className="config-label">Meta Diária (pomodoros)</label>
            <div className="config-input-row">
              <input
                type="range" min="1" max="20" step="1"
                value={dailyGoal}
                onChange={e => setDailyGoal(parseInt(e.target.value))}
                className="config-range"
                style={{
                  background: `linear-gradient(to right, #7ecfad ${((dailyGoal - 1) / 19) * 100}%, rgba(255,255,255,0.1) ${((dailyGoal - 1) / 19) * 100}%)`
                }}
              />
              <span className="config-value">{dailyGoal}</span>
            </div>
          </div>

          <button className="config-save-btn" onClick={() => { handleSaveSettings(); setActivePanel(null); }}>
            <span className="material-symbols-outlined">check</span>
            Salvar Configurações
          </button>
        </div>
      </div>

      {/* ── Modal de conclusão ── */}
      <div className={`success-modal-backdrop ${showCongrats ? 'modal-open' : 'modal-closed'}`}>
        <div className="success-modal-card">
          <span className="material-symbols-outlined success-icon">verified</span>
          <h2>Foco Concluído!</h2>
          <p>Você completou mais um ciclo. Agora respira e descansa um pouco.</p>
          <div className="modal-actions">
            <button className="modal-btn main-action" onClick={handleTakeBreak}>
              Iniciar Pausa ({breakMin}m)
            </button>
            <button className="modal-btn secondary-action" onClick={handleKeepFocus}>
              Continuar Foco ({focusMin}m)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
