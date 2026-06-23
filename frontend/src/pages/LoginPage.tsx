import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

// Inject Google Fonts once
let fontsInjected = false;
function ensureFonts() {
  if (fontsInjected || typeof document === 'undefined') return;
  fontsInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
}

// Curl-noise flow angle
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

export default function LoginPage() {
  const navigate  = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [clock,    setClock]    = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheenRef  = useRef<HTMLSpanElement>(null);
  const mouseRef  = useRef({ tx: 0, ty: 0, cx: 0, cy: 0 });

  useEffect(() => {
    ensureFonts();

    const pad = (n: number) => String(n).padStart(2, '0');
    const tick = () => {
      const d = new Date();
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
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

    const COUNT = 1600;
    const embers: Ember[] = [];
    for (let i = 0; i < COUNT; i++) {
      const e: Ember = { x: 0, y: 0, spd: 0, size: 0, r: 0, g: 0, b: 0 };
      seedEmber(e, window.innerWidth, window.innerHeight, true);
      embers.push(e);
    }

    const onMove = (ev: MouseEvent) => {
      mouseRef.current.tx = (ev.clientX / window.innerWidth  - 0.5) * 24;
      mouseRef.current.ty = (ev.clientY / window.innerHeight - 0.5) * 16;
    };
    window.addEventListener('mousemove', onMove);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.016;

      const m = mouseRef.current;
      m.cx += (m.tx - m.cx) * 0.04;
      m.cy += (m.ty - m.cy) * 0.04;

      const W = window.innerWidth;
      const H = window.innerHeight;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2 + m.cx, H / 2 + m.cy);

      for (const e of embers) {
        const a = flowAngle(e.x * 0.003, e.y * 0.003, t);
        e.x += Math.cos(a) * e.spd;
        e.y += Math.sin(a) * e.spd - e.spd * 0.28;

        if (e.y < -H * 0.62 || e.x < -W * 1.3 || e.x > W * 1.3) {
          seedEmber(e, W, H, false);
        }

        ctx.globalAlpha = 0.72;
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
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  function triggerSheen() {
    const el = sheenRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform  = 'translateX(-140%)';
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = 'transform .9s ease';
        el.style.transform  = 'translateX(140%)';
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    triggerSheen();
    setLoading(true);
    try {
      const { token } = await api.login(username, password);
      localStorage.setItem('jh_token', token);
      navigate('/');
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%',
    height: 50,
    padding: '0 16px',
    borderRadius: 11,
    background: 'rgba(255,235,210,.04)',
    border: '1px solid rgba(240,200,160,.13)',
    color: '#f4ece0',
    fontSize: 15,
    fontFamily: "'Space Grotesk', -apple-system, sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color .18s, box-shadow .18s, background .18s',
  };

  function onFocus(ev: React.FocusEvent<HTMLInputElement>) {
    ev.currentTarget.style.borderColor = 'rgba(239,123,62,.85)';
    ev.currentTarget.style.boxShadow   = '0 0 0 4px rgba(239,123,62,.15), 0 0 22px -4px rgba(239,123,62,.45)';
    ev.currentTarget.style.background  = 'rgba(239,123,62,.07)';
  }
  function onBlur(ev: React.FocusEvent<HTMLInputElement>) {
    ev.currentTarget.style.borderColor = 'rgba(240,200,160,.13)';
    ev.currentTarget.style.boxShadow   = 'none';
    ev.currentTarget.style.background  = 'rgba(255,235,210,.04)';
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(135% 120% at 50% 38%, #241a11 0%, #160f0a 48%, #0d0a07 100%)',
      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
    }}>
      {/* Ember particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, display: 'block', zIndex: 0 }} />

      {/* Radial vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(70% 60% at 50% 50%, transparent 35%, rgba(10,7,4,.65) 100%)',
      }} />

      {/* HUD — top-left */}
      <div style={{
        position: 'absolute', top: 26, left: 32, zIndex: 2,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11, letterSpacing: '0.2em', color: '#7a6a55',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          display: 'inline-block', width: 7, height: 7, borderRadius: 2,
          background: '#ef7b3e', boxShadow: '0 0 10px #ef7b3e',
          animation: 'jh-dot-pulse 2.4s ease-in-out infinite',
        }} />
        JOB&nbsp;HUNTER&nbsp;/&nbsp;SIGN&nbsp;IN
      </div>

      {/* HUD — bottom-right clock */}
      {clock && (
        <div style={{
          position: 'absolute', bottom: 26, right: 32, zIndex: 2,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, letterSpacing: '0.18em', color: '#57493a',
        }}>
          {clock}&nbsp;LOCAL
        </div>
      )}

      {/* Centered card */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}>
        <div style={{
          width: 420, maxWidth: '100%',
          padding: '44px 40px 30px',
          borderRadius: 20,
          background: 'linear-gradient(180deg, rgba(40,31,22,.76), rgba(22,16,11,.82))',
          border: '1px solid rgba(240,180,120,.12)',
          boxShadow: '0 44px 96px -34px rgba(0,0,0,.88), inset 0 1px 0 rgba(255,225,190,.07)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          position: 'relative', overflow: 'hidden',
          animation: 'jh-rise .9s cubic-bezier(.2,.8,.2,1) both',
        }}>
          {/* Top shimmer line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(245,175,115,.55), transparent)',
          }} />

          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <div style={{
              width: 74, height: 74, borderRadius: 19,
              background: 'linear-gradient(148deg, #e9712f, #c8481f)',
              boxShadow: '0 14px 36px -10px rgba(210,80,30,.72), inset 0 1px 0 rgba(255,220,185,.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', flexShrink: 0,
            }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 19, border: '1px solid rgba(255,215,175,.22)' }} />
              {/* Outer ring */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                border: '2.5px solid rgba(255,245,235,.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Middle ring */}
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: '2px solid rgba(255,245,235,.55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {/* Core dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#fff5ec', boxShadow: '0 0 12px #ffd9b0',
                    animation: 'jh-corepulse 2.6s ease-in-out infinite',
                  }} />
                </div>
              </div>
            </div>

            <h1 style={{
              margin: '20px 0 0', fontSize: 27, fontWeight: 700,
              letterSpacing: '-0.025em', color: '#f6ede1', lineHeight: 1.1,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              Job&nbsp;Hunter
            </h1>

            {/* Ink underline SVG */}
            <svg width="124" height="10" viewBox="0 0 124 10" style={{ overflow: 'visible', margin: '4px 0 8px' }}>
              <path
                d="M2 5.5 C 24 2.5, 50 8, 72 4.5 S 112 2.5, 122 5.5"
                fill="none" stroke="#ef7b3e" strokeWidth="2.3" strokeLinecap="round"
                strokeDasharray="185" strokeDashoffset="185"
                style={{ animation: 'jh-draw 1.1s .55s cubic-bezier(.6,0,.3,1) forwards' }}
              />
            </svg>

            <p style={{ margin: 0, fontSize: 13.5, color: '#9c8c77', letterSpacing: '0.01em' }}>
              Personal job tracking dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(220,55,35,.09)', border: '1px solid rgba(220,55,35,.22)',
                color: '#f4a090', fontSize: 12.5,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em',
              }}>
                ⚠&nbsp;&nbsp;{error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.22em', color: '#8c7c66', fontWeight: 500 }}>
                USERNAME
              </span>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                autoComplete="username" placeholder="your handle" required
                style={inputBase} onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.22em', color: '#8c7c66', fontWeight: 500 }}>
                PASSWORD
              </span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password" placeholder="••••••••••" required
                  style={{ ...inputBase, paddingRight: 58 }} onFocus={onFocus} onBlur={onBlur}
                />
                <button
                  type="button" onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 8, width: 42, height: 34,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', borderRadius: 7, cursor: 'pointer',
                    background: 'transparent', color: '#a3927b',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.06em', fontWeight: 500,
                  }}
                >
                  {showPw ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                marginTop: 8, height: 54, border: 'none', borderRadius: 13,
                cursor: loading ? 'default' : 'pointer',
                position: 'relative', overflow: 'hidden',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 15.5, fontWeight: 600, letterSpacing: '0.015em', color: '#fff6ee',
                background: 'linear-gradient(100deg, #e2613a, #f0a14e)',
                boxShadow: '0 16px 36px -12px rgba(226,97,58,.68), inset 0 1px 0 rgba(255,228,200,.38)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                opacity: loading ? 0.85 : 1,
                transition: 'opacity .2s, transform .15s, box-shadow .2s',
              }}
              onMouseEnter={ev => {
                if (!loading) {
                  ev.currentTarget.style.transform = 'translateY(-1px)';
                  ev.currentTarget.style.boxShadow = '0 20px 42px -12px rgba(226,97,58,.82), inset 0 1px 0 rgba(255,228,200,.38)';
                }
              }}
              onMouseLeave={ev => {
                ev.currentTarget.style.transform = '';
                ev.currentTarget.style.boxShadow = '0 16px 36px -12px rgba(226,97,58,.68), inset 0 1px 0 rgba(255,228,200,.38)';
              }}
            >
              {/* Sheen sweep */}
              <span ref={sheenRef} style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(90deg, transparent, rgba(255,248,238,.32), transparent)',
                transform: 'translateX(-140%)',
              }} />
              {loading ? (
                <>
                  <span style={{
                    width: 17, height: 17, borderRadius: '50%',
                    border: '2px solid rgba(255,246,238,.35)', borderTopColor: '#fff6ee',
                    animation: 'jh-spin .7s linear infinite',
                    display: 'inline-block', flexShrink: 0,
                  }} />
                  <span>Tracking down…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <span style={{ fontSize: 18, lineHeight: 0, marginTop: 1 }}>→</span>
                </>
              )}
            </button>
          </form>

          <div style={{
            marginTop: 24, textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5, letterSpacing: '0.16em', color: '#5a4d3c',
          }}>
            JOB&nbsp;HUNTER&nbsp;v3.0&nbsp;·&nbsp;PERSONAL&nbsp;USE&nbsp;ONLY
          </div>
        </div>
      </div>

      <style>{`
        @keyframes jh-rise {
          from { opacity: 0; transform: translateY(28px) scale(.982); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes jh-draw { to { stroke-dashoffset: 0; } }
        @keyframes jh-spin  { to { transform: rotate(360deg); } }
        @keyframes jh-corepulse {
          0%, 100% { opacity: .55; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.18); }
        }
        @keyframes jh-dot-pulse {
          0%, 100% { opacity: .5; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
