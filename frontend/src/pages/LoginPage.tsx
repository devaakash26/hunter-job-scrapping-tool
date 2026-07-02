import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, token } from '../lib/api';
import { ROUTES } from '../lib/constants';

let fontsInjected = false;
function ensureFonts() {
  if (fontsInjected || typeof document === 'undefined') return;
  fontsInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
}

// ── Ember particle field (kept from v3, dimmed to sit behind the terminal) ──

function flowAngle(x: number, y: number, t: number): number {
  return (
    Math.sin(x * 0.004 + t * 0.22) +
    Math.cos(y * 0.004 - t * 0.18) +
    Math.sin(x * 0.002 - y * 0.003 + t * 0.12)
  ) * 1.3;
}

interface Ember {
  x: number; y: number;
  spd: number; size: number;
  r: number; g: number; b: number;
}

const COLOR_RAMP: [number, number, number][] = [
  [200, 56, 26],
  [226, 97, 58],
  [243, 141, 62],
  [250, 183, 90],
];

function seedEmber(e: Ember, W: number, H: number, randY = false) {
  e.x = (Math.random() - 0.5) * W * 2.4;
  e.y = randY
    ? (Math.random() * 2 - 0.5) * H
    : H * 0.6 + Math.random() * H * 0.6;
  e.spd = 0.25 + Math.random() * 0.75;
  const c = COLOR_RAMP[(Math.random() * COLOR_RAMP.length) | 0];
  const j = 0.3 + Math.random() * 0.65;
  e.r = c[0] * j; e.g = c[1] * j; e.b = c[2] * j;
  e.size = 0.7 + Math.random() * 1.8;
}

// ── Live scraper feed — real sources and shapes from the actual pipeline ──

interface FeedLine {
  ts: string;
  src: string;
  msg: string;
  ok?: boolean;
}

const FEED: [string, string, boolean?][] = [
  ['boot', 'job-hunter pipeline · 38 sources armed'],
  ['linkedin', 'guest api · page 1-5 · 50 found'],
  ['greenhouse', 'okta +15 · purestorage +15 · glance +7'],
  ['workday', 'adobe +14 · nvidia +11 · mastercard +20'],
  ['lever', 'dream11 +6 · hevodata +15 · zeta +2'],
  ['ashby', 'notion +3 · openai +6 · elevenlabs +7'],
  ['smartrec', 'freshworks +15 · servicenow +6'],
  ['mynexthire', 'coindcx · 8 screened'],
  ['queue', 'linkedin throttled 1req/3s · 0 bans', true],
  ['filter', '0-2 yrs · ≥10 LPA · india/remote'],
  ['dedup', 'checked against db · fresh only'],
  ['slack', 'alerts delivered', true],
];

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [capsOn,   setCapsOn]   = useState(false);
  const [shake,    setShake]    = useState(0);
  const [feed,     setFeed]     = useState<FeedLine[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const feedIdx   = useRef(0);

  useEffect(() => { ensureFonts(); }, []);

  // Terminal feed: lines arrive one by one, then keep cycling like a live tail.
  useEffect(() => {
    const push = () => {
      const [src, msg, ok] = FEED[feedIdx.current % FEED.length];
      feedIdx.current += 1;
      setFeed(prev => [...prev, { ts: nowStamp(), src, msg, ok }].slice(-9));
    };
    push();
    const id = setInterval(push, 1400);
    return () => clearInterval(id);
  }, []);

  // Ember canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    let t = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 700;
    const embers: Ember[] = [];
    for (let i = 0; i < COUNT; i++) {
      const e: Ember = { x: 0, y: 0, spd: 0, size: 0, r: 0, g: 0, b: 0 };
      seedEmber(e, window.innerWidth, window.innerHeight, true);
      embers.push(e);
    }

    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.016;
      const W = window.innerWidth;
      const H = window.innerHeight;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2);

      for (const e of embers) {
        const a = flowAngle(e.x * 0.003, e.y * 0.003, t);
        e.x += Math.cos(a) * e.spd;
        e.y += Math.sin(a) * e.spd - e.spd * 0.28;
        if (e.y < -H * 0.62 || e.x < -W * 1.3 || e.x > W * 1.3) {
          seedEmber(e, W, H, false);
        }
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${e.r | 0},${e.g | 0},${e.b | 0})`;
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  function onPwKey(ev: React.KeyboardEvent<HTMLInputElement>) {
    setCapsOn(ev.getModifierState('CapsLock'));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const { token: jwt } = await api.login(username, password);
      token.set(jwt);
      navigate(ROUTES.DASHBOARD);
    } catch {
      setError('ACCESS DENIED — bad credentials');
      setShake(s => s + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="jl-root">
      <canvas ref={canvasRef} className="jl-embers" />
      <div className="jl-grid" />

      {/* ── Left: wordmark + live scraper feed ── */}
      <div className="jl-left">
        <div className="jl-hud">
          <span className="jl-led" />
          SCRAPER&nbsp;GRID&nbsp;·&nbsp;ONLINE
        </div>

        <div className="jl-wordmark">
          <span className="jl-word-solid">JOB</span>
          <span className="jl-word-ghost">HUNTER</span>
          <p className="jl-tagline">
            38 sources · 5 ATS platforms · filtered for 0-2&nbsp;yrs, ₹10L+, India&nbsp;/&nbsp;remote.
            <br />Runs itself twice a day so you don't have to.
          </p>
        </div>

        <div className="jl-term">
          <div className="jl-term-head">
            <span className="jl-term-dot" style={{ background: '#e2613a' }} />
            <span className="jl-term-dot" style={{ background: '#f0a14e' }} />
            <span className="jl-term-dot" style={{ background: '#3a3128' }} />
            <span className="jl-term-title">pipeline · live tail</span>
          </div>
          <div className="jl-term-body">
            {feed.map((l, i) => (
              <div key={`${l.ts}-${i}`} className="jl-line">
                <span className="jl-line-ts">{l.ts}</span>
                <span className={`jl-line-src ${l.ok ? 'ok' : ''}`}>{l.src.padEnd(10, ' ')}</span>
                <span className="jl-line-msg">{l.msg}</span>
              </div>
            ))}
            <div className="jl-line">
              <span className="jl-cursor" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: sign-in ── */}
      <div className="jl-right">
        <form className="jl-form" onSubmit={handleSubmit} key={shake} style={shake ? { animation: 'jl-shake .4s' } : undefined}>
          <div className="jl-form-eyebrow">RESTRICTED&nbsp;CONSOLE</div>
          <h1 className="jl-form-title">Welcome back.</h1>
          <p className="jl-form-sub">Sign in to reach the job board.</p>

          {error && <div className="jl-error">▸ {error}</div>}

          <label className="jl-field">
            <span className="jl-field-label">USERNAME</span>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              autoComplete="username" spellCheck={false} required autoFocus
            />
          </label>

          <label className="jl-field">
            <span className="jl-field-label">
              PASSWORD
              {capsOn && <em className="jl-caps">CAPS LOCK ON</em>}
            </span>
            <div className="jl-pw-wrap">
              <input
                type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={onPwKey} onKeyUp={onPwKey}
                autoComplete="current-password" required
              />
              <button type="button" className="jl-pw-toggle" onClick={() => setShowPw(v => !v)}>
                {showPw ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </label>

          <button type="submit" className="jl-submit" disabled={loading}>
            {loading ? (
              <><span className="jl-spin" />AUTHENTICATING…</>
            ) : (
              <>ENTER CONSOLE<span className="jl-submit-arrow">→</span></>
            )}
          </button>

          <div className="jl-hint">press <kbd>↵</kbd> to sign in</div>
          <div className="jl-meta">JOB HUNTER v4 · SINGLE-SEAT · BUILT FOR ONE</div>
        </form>
      </div>

      <style>{`
        .jl-root {
          position: fixed; inset: 0; display: flex; overflow: hidden;
          background: radial-gradient(120% 130% at 18% 30%, #1d150e 0%, #120d08 52%, #0b0806 100%);
          font-family: 'Space Grotesk', -apple-system, sans-serif;
          color: #f4ece0;
        }
        .jl-embers { position: absolute; inset: 0; z-index: 0; }
        .jl-grid {
          position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: .5;
          background:
            repeating-linear-gradient(0deg,  rgba(240,200,160,.028) 0 1px, transparent 1px 44px),
            repeating-linear-gradient(90deg, rgba(240,200,160,.028) 0 1px, transparent 1px 44px);
          mask-image: radial-gradient(80% 80% at 35% 45%, #000 30%, transparent 100%);
          -webkit-mask-image: radial-gradient(80% 80% at 35% 45%, #000 30%, transparent 100%);
        }

        /* ── left panel ── */
        .jl-left {
          position: relative; z-index: 2; flex: 1.25; min-width: 0;
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 34px 48px 38px;
        }
        .jl-hud {
          display: flex; align-items: center; gap: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; letter-spacing: .22em; color: #7a6a55;
        }
        .jl-led {
          width: 7px; height: 7px; border-radius: 2px; background: #ef7b3e;
          box-shadow: 0 0 10px #ef7b3e; animation: jl-pulse 2.4s ease-in-out infinite;
        }
        .jl-wordmark { margin: 22px 0; }
        .jl-word-solid, .jl-word-ghost {
          display: block; font-weight: 700; line-height: .92;
          font-size: clamp(56px, 9vw, 118px); letter-spacing: -0.04em;
        }
        .jl-word-solid { color: #f6ede1; }
        .jl-word-ghost {
          color: transparent;
          -webkit-text-stroke: 1.5px rgba(239,123,62,.75);
          text-shadow: 0 0 44px rgba(226,97,58,.25);
        }
        .jl-tagline {
          margin: 22px 0 0; max-width: 460px;
          font-size: 14px; line-height: 1.65; color: #9c8c77;
        }

        .jl-term {
          width: min(560px, 100%);
          border: 1px solid rgba(240,180,120,.14);
          border-radius: 12px; overflow: hidden;
          background: rgba(14,10,7,.72);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 30px 70px -30px rgba(0,0,0,.8);
        }
        .jl-term-head {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 14px; border-bottom: 1px solid rgba(240,180,120,.1);
          background: rgba(30,22,15,.55);
        }
        .jl-term-dot { width: 9px; height: 9px; border-radius: 50%; }
        .jl-term-title {
          margin-left: 10px; font-family: 'JetBrains Mono', monospace;
          font-size: 10px; letter-spacing: .18em; color: #6d5d49;
        }
        .jl-term-body { padding: 13px 16px 15px; min-height: 208px; }
        .jl-line {
          display: flex; gap: 12px; align-items: baseline;
          font-family: 'JetBrains Mono', monospace; font-size: 11.5px;
          line-height: 1.9; white-space: nowrap; overflow: hidden;
          animation: jl-linein .3s ease both;
        }
        .jl-line-ts  { color: #57493a; flex-shrink: 0; }
        .jl-line-src { color: #ef7b3e; font-weight: 700; flex-shrink: 0; white-space: pre; }
        .jl-line-src.ok { color: #7fc47f; }
        .jl-line-msg { color: #b3a28b; text-overflow: ellipsis; overflow: hidden; }
        .jl-cursor {
          display: inline-block; width: 8px; height: 15px; margin-top: 3px;
          background: #ef7b3e; animation: jl-blink 1s steps(1) infinite;
        }

        /* ── right panel ── */
        .jl-right {
          position: relative; z-index: 2; flex: 1; max-width: 520px; min-width: 400px;
          display: flex; align-items: center; justify-content: center;
          border-left: 1px solid rgba(240,180,120,.12);
          background: linear-gradient(180deg, rgba(24,18,12,.88), rgba(14,10,7,.94));
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          padding: 40px 52px;
        }
        .jl-form { width: 100%; max-width: 340px; }
        .jl-form-eyebrow {
          font-family: 'JetBrains Mono', monospace; font-size: 10px;
          letter-spacing: .3em; color: #ef7b3e; margin-bottom: 14px;
        }
        .jl-form-title {
          margin: 0; font-size: 34px; font-weight: 700;
          letter-spacing: -0.03em; color: #f6ede1;
        }
        .jl-form-sub { margin: 8px 0 30px; font-size: 13.5px; color: #8c7c66; }

        .jl-error {
          font-family: 'JetBrains Mono', monospace; font-size: 11.5px;
          letter-spacing: .05em; color: #f4a090;
          border-left: 2px solid #dc3723; padding: 8px 12px; margin-bottom: 20px;
          background: rgba(220,55,35,.07);
        }

        .jl-field { display: block; margin-bottom: 24px; }
        .jl-field-label {
          display: flex; justify-content: space-between; align-items: baseline;
          font-family: 'JetBrains Mono', monospace; font-size: 10px;
          letter-spacing: .24em; color: #8c7c66; margin-bottom: 4px;
        }
        .jl-caps {
          font-style: normal; color: #f0a14e; letter-spacing: .12em;
          animation: jl-pulse 1.2s ease-in-out infinite;
        }
        .jl-field input {
          width: 100%; height: 44px; padding: 0 2px;
          background: transparent; border: none; outline: none;
          border-bottom: 1.5px solid rgba(240,200,160,.18);
          color: #f4ece0; font-size: 16px; font-family: 'Space Grotesk', sans-serif;
          border-radius: 0; transition: border-color .2s;
          caret-color: #ef7b3e;
        }
        .jl-field input:focus { border-bottom-color: #ef7b3e; }
        .jl-field input:-webkit-autofill {
          -webkit-text-fill-color: #f4ece0;
          -webkit-box-shadow: 0 0 0 1000px #16100b inset;
          transition: background-color 9999s;
        }
        .jl-pw-wrap { position: relative; }
        .jl-pw-toggle {
          position: absolute; right: 0; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 6px 2px;
          font-family: 'JetBrains Mono', monospace; font-size: 10px;
          letter-spacing: .1em; color: #a3927b;
        }
        .jl-pw-toggle:hover { color: #ef7b3e; }

        .jl-submit {
          width: 100%; height: 52px; margin-top: 10px;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          border: none; border-radius: 10px; cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12.5px; font-weight: 700; letter-spacing: .18em; color: #fff6ee;
          background: linear-gradient(100deg, #e2613a, #f0a14e);
          box-shadow: 0 16px 36px -12px rgba(226,97,58,.6);
          transition: transform .15s, box-shadow .2s, opacity .2s;
        }
        .jl-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 20px 44px -12px rgba(226,97,58,.8);
        }
        .jl-submit:disabled { opacity: .8; cursor: default; }
        .jl-submit-arrow { transition: transform .18s; font-size: 15px; }
        .jl-submit:hover .jl-submit-arrow { transform: translateX(4px); }
        .jl-spin {
          width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
          border: 2px solid rgba(255,246,238,.35); border-top-color: #fff6ee;
          animation: jl-spinner .7s linear infinite;
        }

        .jl-hint {
          margin-top: 18px; text-align: center;
          font-size: 11.5px; color: #6d5d49;
        }
        .jl-hint kbd {
          font-family: 'JetBrains Mono', monospace; font-size: 10px;
          border: 1px solid rgba(240,200,160,.22); border-bottom-width: 2px;
          border-radius: 4px; padding: 1px 6px; margin: 0 2px; color: #a3927b;
        }
        .jl-meta {
          margin-top: 34px; text-align: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px; letter-spacing: .18em; color: #4d4234;
        }

        @keyframes jl-pulse   { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
        @keyframes jl-blink   { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
        @keyframes jl-spinner { to { transform: rotate(360deg); } }
        @keyframes jl-linein  { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
        @keyframes jl-shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(3px); }
          30%, 70% { transform: translateX(-5px); }
          40%, 60% { transform: translateX(5px); }
          50%      { transform: translateX(-3px); }
        }

        @media (max-width: 920px) {
          .jl-root { flex-direction: column; overflow-y: auto; }
          .jl-left { flex: none; padding: 26px 24px 8px; }
          .jl-wordmark { margin: 16px 0; }
          .jl-word-solid, .jl-word-ghost { font-size: clamp(44px, 13vw, 72px); }
          .jl-tagline { font-size: 13px; }
          .jl-term { display: none; }
          .jl-right {
            flex: none; max-width: none; min-width: 0; width: 100%;
            border-left: none; border-top: 1px solid rgba(240,180,120,.12);
            padding: 34px 24px 44px;
          }
        }
      `}</style>
    </div>
  );
}
