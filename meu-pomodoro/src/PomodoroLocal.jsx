import React, { useState, useEffect, useRef } from 'react';
import './Pomodoro.css';

// ─── Dados dos temas ───────────────────────────────────────
const themeDetails = {
  forest: {
    name: 'Floresta Fria',
    desc: 'Pássaros, folhas e vento suave.',
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUeIY6Z7SVGmHYVLSXmw5-Oz2tn0x83HdsGcMVklJgDi94JAbPHUeWgiwvn1heTcGvlxHofakXmPrYNaLoHVy-R0YcPAWVBziUnnF1Xc_8zT3rGrrMqlwxl-gUI0S4gyBM9XGZ-fyzI0I-hZaTOcKSkYp_BAAoP_QF1r4cBeC7nDghbsVkLikcHEPji_nzepdSFdZQfgJ2hkiLHIudjV9ybVQd2Oq6cq6eW3oUkizg1c6sQdc3pJ7GaHPhAX-CF8z2lx9yoHkqPw',
    icon: 'forest',
    sound: '/audio/floresta.wav',
  },
  campfire: {
    name: 'Fogueira',
    desc: 'Floresta e fogueira crepitando.',
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBkAnHlTCUo6d1u0G0iNr2wfnyQ4U8WSRO2uXRYmzJOkWCofj-BArDC9HDP4gjoWRG-d_XiMFmZ_zqchTMzbC78lORMZFxxDwqV_kN_gRehAO0KRTFy19PNSgRyN9nqj3nIl3c_EUpLL6R1yvQasLVJEbjYWhAeB71XGHzI_ZnklQXQg_bkq18JdzyMWqVPM6HJY85WKnrM7vDFi2QKPTrjEokLTEG0hGGSU2wFat7B9QfLFWnx4R6HbBLK1Z0_8zYnaPeFoLC52Q',
    icon: 'local_fire_department',
    sound: '/audio/floresta.wav',
  },
  snow: {
    name: 'Nevada',
    desc: 'Frio e ruído branco calmante.',
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDa0ydBNyCjIAcjCfQ3eyJrrLwLNC0_QGurqaXrkonRVlJ04vXsAS_NrtkldiIHfEbeRbxXcwZiT3SK8N0cvTaVRthiymWwpX1Je30C3XQVKPGfrZ-OhFKOzF_erAXxJKmQB6YANUiC4Ng2josN6AkUQ7i1Qcbc9vzrTS92gssg0OrHGNPTqkvSEoZL5L86cKDzS_GZHXBu2POCSaIXhIXo86-rJWglCJ9BDeYTEZlHanF8Z-D-m4NfnUZCavoOosbp5JuS1LKG2Q',
    icon: 'ac_unit',
    sound: '/audio/chuva.wav',
  },
};

const FOCUS_TIME = 25 * 60;  // 1500 segundos
const BREAK_TIME = 5 * 60;   // 300 segundos
const DAILY_GOAL = 8;

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

function calcStats(history) {
  const today = history.filter(s => s.dateString === getTodayStr());
  const focusSessions = today.filter(s => s.type === 'focus');
  return {
    completedToday: focusSessions.length,
    minutesToday: focusSessions.reduce((acc, s) => acc + s.durationMinutes, 0),
  };
}

// ─── Componente principal ──────────────────────────────────
export default function PomodoroLocal() {
  // Timer
  const [timeLeft, setTimeLeft]   = useState(FOCUS_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [timerType, setTimerType] = useState('focus'); // 'focus' | 'break'

  // Visual
  const [theme, setTheme]           = useState('forest');
  const [activePanel, setActivePanel] = useState(null); // 'theme' | null

  // Áudio
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume]   = useState(0.5);
  const audioRef = useRef(null);

  // Modal
  const [showCongrats, setShowCongrats] = useState(false);

  // Stats (vem do localStorage)
  const [stats, setStats] = useState({ completedToday: 0, minutesToday: 0 });

  // ── Carrega stats do localStorage ao iniciar ──
  useEffect(() => {
    const history = loadHistory();
    setStats(calcStats(history));
  }, []);

  // ── Motor do timer ──
  useEffect(() => {
    let interval = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      // Timer zerou
      setIsRunning(false);
      setShowCongrats(true);
      handleSessionComplete();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // ── Áudio ──
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }

    const soundFile = themeDetails[theme].sound;
    const currentPath = audioRef.current.src
      ? new URL(audioRef.current.src).pathname
      : '';

    if (currentPath !== soundFile) {
      audioRef.current.src = soundFile;
      audioRef.current.load();
    }

    if (!isMuted) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }

    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, [theme, isMuted]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // ── Ações ──────────────────────────────────────────────
  function handlePlayPause() {
    const next = !isRunning;
    setIsRunning(next);
    // Liga o som automaticamente ao iniciar
    if (next && isMuted) setIsMuted(false);
  }

  function handleReset() {
    setIsRunning(false);
    setTimeLeft(timerType === 'focus' ? FOCUS_TIME : BREAK_TIME);
  }

  function handleTypeChange(type) {
    setIsRunning(false);
    setTimerType(type);
    setTimeLeft(type === 'focus' ? FOCUS_TIME : BREAK_TIME);
  }

  function handleSessionComplete() {
    const duration = timerType === 'focus' ? 25 : 5;
    const session = {
      type: timerType,
      durationMinutes: duration,
      timestamp: Date.now(),
      dateString: getTodayStr(),
    };

    const history = loadHistory();
    history.push(session);
    saveHistory(history);
    setStats(calcStats(history));
  }

  function handleTakeBreak() {
    setShowCongrats(false);
    handleTypeChange('break');
  }

  function handleKeepFocus() {
    setShowCongrats(false);
    handleTypeChange('focus');
  }

  // ── Valores derivados ──────────────────────────────────
  const currentCycle = stats.completedToday + 1;
  const goalPct      = Math.min((stats.completedToday / DAILY_GOAL) * 100, 100);
  const horasFoco    = Math.floor(stats.minutesToday / 60);
  const minFoco      = stats.minutesToday % 60;

  // ── Render ─────────────────────────────────────────────
  return (
    <div className={`pomodoro-layout theme-${theme} ${isRunning ? 'focus-active' : ''}`}>

      {/* Fundo com crossfade entre temas */}
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

          <button className="nav-item">
            <span className="material-symbols-outlined">bar_chart</span>
            <span className="nav-label">Analytics</span>
          </button>

          <button className="nav-item">
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
        {/* Tabs Foco / Pausa */}
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

        {/* Dígitos do timer */}
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

        {/* Botões de controle */}
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

        {/* Stats */}
        <div className="stats-block">
          <div className="stats-block-label">
            <span>Hoje</span>
          </div>
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

        {/* Ciclo + Meta */}
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

        {/* Sons */}
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

        {/* Volume */}
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
              onClick={() => setTheme(key)}
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

      {/* ── Modal de conclusão ── */}
      <div className={`success-modal-backdrop ${showCongrats ? 'modal-open' : 'modal-closed'}`}>
        <div className="success-modal-card">
          <span className="material-symbols-outlined success-icon">verified</span>
          <h2>Foco Concluído!</h2>
          <p>Você completou mais um ciclo. Agora respira e descansa um pouco.</p>
          <div className="modal-actions">
            <button className="modal-btn main-action" onClick={handleTakeBreak}>
              Iniciar Pausa (5m)
            </button>
            <button className="modal-btn secondary-action" onClick={handleKeepFocus}>
              Continuar Foco (25m)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
