import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import BlurText from '../components/BlurText';

const FlowriumMetallicTitle = dynamic(
  () => import('../components/FlowriumMetallicTitle'),
  { ssr: false }
);

const HERO_REVEAL_MS = 4000;

/** 스크롤 멈춘 뒤 이 비율(0~1) 지점으로 스냅 (두 번 “탁탁”: 히어로 → 2페이지 → 카드) */
const SNAP_SCROLL_RATIOS = [0, 0.21, 0.9];

function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/* Figma 797:735 Bloom detail */
const BLOOM_DETAIL_HERO =
  'https://www.figma.com/api/mcp/asset/300ad33e-1582-45dc-b188-8140cad530bf';
const BLOOM_DETAIL_BACK =
  'https://www.figma.com/api/mcp/asset/697f8320-93fc-4b9e-9c65-7fde7c2807cb';
// Bloom 상세(모달) 카드 이미지는 제거(글래스 카드만)

const BLOOM_TRANSITION_MS = 2280;

const LETTER_TITLE_PROPS = {
  scale: 2.4,
  patternSharpness: 0.97,
  noiseScale: 0.45,
  speed: 0.22,
  liquid: 0.88,
  mouseAnimation: true,
  brightness: 1.95,
  contrast: 0.68,
  refraction: 0.006,
  blur: 0.028,
  chromaticSpread: 0.06,
  fresnel: 0.32,
  angle: 0,
  waveAmplitude: 0.88,
  distortion: 0.78,
  contour: 0.32,
  lightColor: '#ffffff',
  darkColor: '#0f0806',
  tintColor: '#8b6914',
};

export default function Home() {
  const router = useRouter();
  const scrollSpacerRef = useRef(null);
  const bgVideosRef = useRef([]);
  const scrollVideoStateRef = useRef({
    blurOp: 1,
    nextOp: 0,
    moveOp: 0,
    cardsOp: 0,
  });
  const bloomNavBusyRef = useRef(false);
  const [showIntroLoader, setShowIntroLoader] = useState(true);
  const [loaderCycle] = useState(0);
  const [bloomTransitionOn, setBloomTransitionOn] = useState(false);
  const [bloomDetailOpen, setBloomDetailOpen] = useState(false);

  const goToPaleBreath = () => {
    if (bloomNavBusyRef.current) return;
    bloomNavBusyRef.current = true;
    setBloomDetailOpen(false);
    Promise.resolve(router.push('/pale-breath')).finally(() => {
      window.setTimeout(() => {
        bloomNavBusyRef.current = false;
      }, 450);
    });
  };

  useEffect(() => {
    const minLoaderMs = HERO_REVEAL_MS;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    const hideTimer = window.setTimeout(() => {
      setShowIntroLoader(false);
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    }, minLoaderMs);
    return () => {
      window.clearTimeout(hideTimer);
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  useEffect(() => {
    if (!bloomDetailOpen) return undefined;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('flowrium-bloom-detail');
    const onKey = (e) => {
      if (e.key === 'Escape') setBloomDetailOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.classList.remove('flowrium-bloom-detail');
      window.removeEventListener('keydown', onKey);
    };
  }, [bloomDetailOpen]);

  useEffect(() => {
    if (!bloomTransitionOn) return undefined;
    document.documentElement.classList.add('flowrium-bloom-transition');
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setBloomTransitionOn(false);
      setBloomDetailOpen(true);
      bloomNavBusyRef.current = false;
      document.documentElement.classList.remove('flowrium-bloom-transition');
      return undefined;
    }
    const t = window.setTimeout(() => {
      setBloomTransitionOn(false);
      setBloomDetailOpen(true);
      bloomNavBusyRef.current = false;
    }, BLOOM_TRANSITION_MS);
    return () => {
      window.clearTimeout(t);
      document.documentElement.classList.remove('flowrium-bloom-transition');
    };
  }, [bloomTransitionOn]);

  const openBloomDetailFromCard = () => {
    if (bloomNavBusyRef.current || bloomDetailOpen || bloomTransitionOn) return;
    bloomNavBusyRef.current = true;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setBloomDetailOpen(true);
      bloomNavBusyRef.current = false;
      return;
    }
    setBloomTransitionOn(true);
  };

  const closeBloomDetail = () => {
    setBloomDetailOpen(false);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('flowrium-home');

    let revealTimer;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const setSpacerHeight = () => {
      const el = scrollSpacerRef.current;
      if (!el) return;
      // 스크롤 감도를 둔감하게(휠 한 번에 p가 너무 빨리 변하지 않게)
      const h = Math.max(window.innerHeight * 4.6, 2800);
      el.style.height = `${h}px`;
    };

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;

    const applyLensVars = () => {
      root.style.setProperty('--spot-fast-x', `${targetX}px`);
      root.style.setProperty('--spot-fast-y', `${targetY}px`);
    };

    const applyVideoPlaybackPolicy = () => {
      const { blurOp, nextOp, moveOp } = scrollVideoStateRef.current;
      if (typeof document !== 'undefined' && document.hidden) return;

      const vBlur = bgVideosRef.current[0];
      const vMain = bgVideosRef.current[1];
      const vMove = bgVideosRef.current[2];
      const vPlanet = bgVideosRef.current[3];

      /* 임계값을 올려 동시 디코딩 구간을 줄임(크로스페이드 중에만 잠깐 2~3개) */
      const CUT = 0.14;
      const needBlur = blurOp > CUT;
      const needMain = 1 - nextOp > CUT;
      const planetWeight = nextOp * (1 - moveOp);
      const needPlanet = planetWeight > CUT;
      const moveWeight = nextOp * moveOp;
      const needMove = moveWeight > CUT;

      const safePlay = (el) => {
        if (!el) return;
        const pr = el.play();
        if (pr && typeof pr.catch === 'function') pr.catch(() => {});
      };
      const safePause = (el) => {
        if (el && !el.paused) el.pause();
      };

      if (needBlur) safePlay(vBlur);
      else safePause(vBlur);
      if (needMain) safePlay(vMain);
      else safePause(vMain);
      if (needPlanet) safePlay(vPlanet);
      else safePause(vPlanet);
      if (needMove) safePlay(vMove);
      else safePause(vMove);
    };

    const ensureVideoPlayback = () => {
      applyVideoPlaybackPolicy();
    };

    let lastPlaybackHint = 0;
    const onPointerMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      applyLensVars();
      const now = performance.now();
      if (now - lastPlaybackHint > 400) {
        lastPlaybackHint = now;
        ensureVideoPlayback();
      }
    };

    const onVisibilityPlayback = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        bgVideosRef.current.forEach((v) => {
          if (v && !v.paused) v.pause();
        });
      } else {
        applyVideoPlaybackPolicy();
      }
    };

    applyLensVars();
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    setSpacerHeight();

    let scrollRaf = 0;
    const syncScroll = () => {
      scrollRaf = 0;
      if (!root.classList.contains('hero-revealed')) {
        root.classList.remove(
          'flowrium-scroll-end',
          'flowrium-glass-cursor',
          'flowrium-second-atmosphere',
          'flowrium-third-atmosphere',
          'flowrium-bg-no-lens',
          'flowrium-cards-state-2'
        );
        root.style.setProperty('--flowrium-second-op', '0');
        root.style.setProperty('--flowrium-move-op', '0');
        root.style.setProperty('--flowrium-cards-op', '0');
        root.style.setProperty('--flowrium-third-lift', '0px');
        root.style.setProperty('--flowrium-wordmark-shift-y', '0px');
        root.style.setProperty('--flowrium-wordmark-white', '0');
        root.style.setProperty('--flowrium-bg-reveal', '1');
        return;
      }

      const y = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      let p = clamp01(y / maxScroll);
      /* p를 0/1로 두지 않음 — OS의 '움직임 줄이기'에서도 스크롤 구간(영상→카드)이 통째로 건너뛰지 않게 */

      const blurPhase = 0.72;
      const blurT = smoothstep(0, blurPhase, p);
      const blurOp = 1 - blurT;
      const glassOp = 1 - blurT * 0.98;

      // 첫 페이지(히어로)에서는 글래스 커서 금지 → 2페이지(스냅 0.21)부터만 적용
      root.classList.toggle('flowrium-glass-cursor', p >= 0.21);

      /* 구간을 스냅 비율과 맞춤:
         0~0.21(히어로→플래닛), 0.21~0.4(타이포 상단 이동), 0.4~0.58(move), 0.76~0.9(cards) */
      const nextOp = smoothstep(0.04, 0.21, p);
      const moveOp = smoothstep(0.4, 0.58, p);
      const cardsOp = smoothstep(0.76, 0.9, p);

      /* 첫 스크롤에서 2페이지(두 번째 오버레이)로 자연스럽게 전환되도록 */
      const secondSceneOp = smoothstep(0.06, 0.21, p);

      const vh = window.innerHeight;

      /* 1) 첫 스크롤: 메인 타이포는 아래로 내려가지 않고 서서히 축소 → 2페이지 상태로 연속 전환 */
      const firstScrollT = smoothstep(0.0, 0.21, p);
      const wordmarkScale = 1 - 0.22 * firstScrollT;

      /* 2) 다음 스크롤: 타이포가 사라지지 않고 화면 상단으로 이동(도달 후 유지) */
      const topMoveT = smoothstep(0.21, 0.4, p);
      const desiredTop = Math.max(48, vh * 0.09);
      const wordmarkEl = document.querySelector('.second-scene-wordmark');
      const wmH = wordmarkEl ? wordmarkEl.getBoundingClientRect().height : Math.min(140, vh * 0.2);
      const liftMax = Math.max(0, vh * 0.5 - wmH * 0.5 - desiredTop);
      const thirdLift = liftMax * topMoveT;

      const wordmarkWhite = smoothstep(0.07, 0.34, p);
      /* 화이트 전환 중엔 배경을 살짝 누르고, 화이트가 거의 끝나면 다시 올려 “나타나는” 느낌 */
      const bgReveal = reduceMotion
        ? 1
        : 1 -
          0.72 *
            smoothstep(0.08, 0.44, wordmarkWhite) *
            (1 - smoothstep(0.5, 0.92, wordmarkWhite));

      root.style.setProperty('--flowrium-bg-reveal', String(bgReveal));
      root.style.setProperty('--flowrium-wordmark-shift-y', `0px`);
      root.style.setProperty('--flowrium-wordmark-scale', String(wordmarkScale));
      root.style.setProperty('--flowrium-wordmark-white', String(wordmarkWhite));

      root.style.setProperty('--flowrium-blur-op', String(blurOp));
      root.style.setProperty('--flowrium-glass-op', String(glassOp));
      root.style.setProperty('--flowrium-next-op', String(nextOp));
      root.style.setProperty('--flowrium-second-op', String(secondSceneOp));
      root.style.setProperty('--flowrium-move-op', String(moveOp));
      root.style.setProperty('--flowrium-cards-op', String(cardsOp));

      root.style.setProperty('--flowrium-third-lift', `${thirdLift}px`);

      scrollVideoStateRef.current = { blurOp, nextOp, moveOp, cardsOp };

      root.classList.toggle('flowrium-second-atmosphere', nextOp >= 0.22);
      root.classList.toggle(
        'flowrium-third-atmosphere',
        moveOp >= 0.08 || cardsOp >= 0.08
      );
      /* 플래닛 구간~: 렌즈(원형 마스크) 제거 — 배경 영상이 화면 전체에 보이게 */
      root.classList.toggle('flowrium-bg-no-lens', nextOp >= 0.34);
      /* 글래스 카드 구간: 상단 FLOWRIUM + 하단 카드 행(State 2 배치) */
      root.classList.toggle('flowrium-cards-state-2', cardsOp >= 0.18);

      applyVideoPlaybackPolicy();

      const lensEnd = 0.985;
      const lensGone = p >= lensEnd - 0.02;
      root.classList.toggle('flowrium-scroll-end', lensGone);

      root.style.setProperty('--title-stack-lift', '0px');
      root.style.setProperty('--flowrium-scroll-cue-op', String(1 - smoothstep(0, 0.12, p)));
    };

    let snapDebounce = 0;
    let snapLockUntil = 0;
    let lastScrollY = 0;
    let lastScrollDir = 1; // 1: down, -1: up
    let snapIndex = 0;
    let wheelGestureActive = false;
    let wheelGestureSnapUsed = false;
    let wheelGestureTimer = 0;
    let snappingToY = null;

    const getSnapTargets = () => {
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const targets = SNAP_SCROLL_RATIOS.map((r) =>
        Math.round(clamp01(r) * maxScroll)
      ).sort((a, b) => a - b);
      return { maxScroll, targets };
    };

    const syncSnapIndexFromY = (y, targets) => {
      let nearestIdx = 0;
      let best = Math.abs(y - targets[0]);
      for (let i = 1; i < targets.length; i += 1) {
        const d = Math.abs(y - targets[i]);
        if (d < best) {
          best = d;
          nearestIdx = i;
        }
      }
      return { nearestIdx, best };
    };

    const snapByStep = (step) => {
      if (!root.classList.contains('hero-revealed')) return;
      if (document.documentElement.classList.contains('flowrium-bloom-detail')) return;
      if (performance.now() < snapLockUntil) return;
      if (wheelGestureActive && wheelGestureSnapUsed) return;

      const { maxScroll, targets } = getSnapTargets();
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const { nearestIdx, best } = syncSnapIndexFromY(y, targets);
      const epsilon = Math.max(14, maxScroll * 0.014);
      if (best < epsilon) snapIndex = nearestIdx;

      const destIdx = Math.max(0, Math.min(targets.length - 1, snapIndex + step));
      const dest = targets[destIdx];
      snapIndex = destIdx;

      const reduceSnap =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      snapLockUntil = performance.now() + (reduceSnap ? 160 : 980);
      snappingToY = dest;
      if (wheelGestureActive) wheelGestureSnapUsed = true;
      window.scrollTo({
        top: dest,
        behavior: reduceSnap ? 'auto' : 'smooth',
      });
    };

    const snapToNearestSection = () => {
      if (typeof window === 'undefined') return;
      if (!root.classList.contains('hero-revealed')) return;
      if (document.documentElement.classList.contains('flowrium-bloom-detail')) return;
      if (performance.now() < snapLockUntil) return;
      // 한 번의 휠/트랙패드 제스처에서 스냅은 1회만(중간 화면이 자꾸 패스되는 문제 방지)
      if (wheelGestureActive && wheelGestureSnapUsed) return;

      const { maxScroll, targets } = getSnapTargets();
      const y = window.scrollY || document.documentElement.scrollTop || 0;

      // 이미 타깃 근처면 현재 인덱스 갱신만(추가 스냅 금지)
      const { nearestIdx, best } = syncSnapIndexFromY(y, targets);
      const epsilon = Math.max(14, maxScroll * 0.014);
      if (best < epsilon) {
        snapIndex = nearestIdx;
        return;
      }

      // 강한 스냅: 현재 y가 어디까지 갔든, "한 번 스크롤에 한 단계"만 이동 (3페이지 모두 확인 가능)
      const step = lastScrollDir >= 0 ? 1 : -1;
      snapByStep(step);
      return;

      const reduceSnap =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // smooth 스크롤 중 연속 스냅 방지(조금 더 강하게 락)
      snapLockUntil = performance.now() + (reduceSnap ? 120 : 900);
      snappingToY = dest;
      if (wheelGestureActive) wheelGestureSnapUsed = true;
      window.scrollTo({
        top: dest,
        behavior: reduceSnap ? 'auto' : 'smooth',
      });
    };

    const scheduleScrollSnap = () => {
      window.clearTimeout(snapDebounce);
      snapDebounce = window.setTimeout(snapToNearestSection, 85);
    };

    const onScroll = () => {
      if (!scrollRaf) scrollRaf = window.requestAnimationFrame(syncScroll);
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const dy = y - lastScrollY;
      if (Math.abs(dy) > 2) lastScrollDir = dy > 0 ? 1 : -1;
      lastScrollY = y;

      // 프로그램 스냅 도중엔 추가 스냅 예약을 약화(제스처 2중 스냅 방지)
      if (snappingToY !== null) {
        const maxScroll = Math.max(
          1,
          document.documentElement.scrollHeight - window.innerHeight
        );
        const epsilon = Math.max(14, maxScroll * 0.014);
        if (Math.abs(y - snappingToY) <= epsilon) snappingToY = null;
      }

      // wheel 제스처는 onWheel에서 "한 번에 한 단계"로 처리
      if (!wheelGestureActive) scheduleScrollSnap();
    };

    const onScrollEndSnap = () => {
      window.clearTimeout(snapDebounce);
      snapDebounce = 0;
      snapToNearestSection();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scrollend', onScrollEndSnap, { passive: true });

    const onWheel = (e) => {
      if (!root.classList.contains('hero-revealed')) return;
      if (document.documentElement.classList.contains('flowrium-bloom-detail')) return;
      if (Math.abs(e.deltaY) < 1) return;
      // 휠 입력은 "한 번에 한 화면" 스냅으로 직접 처리(무겁게)
      e.preventDefault();
      wheelGestureActive = true;
      window.clearTimeout(wheelGestureTimer);
      wheelGestureTimer = window.setTimeout(() => {
        wheelGestureActive = false;
        wheelGestureSnapUsed = false;
      }, 220);
      const step = e.deltaY > 0 ? 1 : -1;
      lastScrollDir = step;
      snapByStep(step);
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      setSpacerHeight();
      syncScroll();
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibilityPlayback);
    window.addEventListener('focus', ensureVideoPlayback);

    window.requestAnimationFrame(() => {
      setSpacerHeight();
      syncScroll();
      ensureVideoPlayback();
    });

    revealTimer = window.setTimeout(() => {
      root.classList.add('hero-revealed');
      window.requestAnimationFrame(syncScroll);
    }, HERO_REVEAL_MS);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(snapDebounce);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', onScrollEndSnap);
      window.removeEventListener('wheel', onWheel);
      window.clearTimeout(wheelGestureTimer);
      document.removeEventListener('visibilitychange', onVisibilityPlayback);
      window.removeEventListener('focus', ensureVideoPlayback);
      if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
      root.classList.remove(
        'flowrium-home',
        'hero-revealed',
        'flowrium-glass-cursor',
        'flowrium-scroll-end',
        'flowrium-second-atmosphere',
        'flowrium-third-atmosphere',
        'flowrium-bg-no-lens',
        'flowrium-cards-state-2'
      );
      root.style.removeProperty('--flowrium-blur-op');
      root.style.removeProperty('--flowrium-glass-op');
      root.style.removeProperty('--flowrium-next-op');
      root.style.removeProperty('--flowrium-second-op');
      root.style.removeProperty('--flowrium-move-op');
      root.style.removeProperty('--flowrium-cards-op');
      root.style.removeProperty('--flowrium-third-lift');
      root.style.removeProperty('--title-stack-lift');
      root.style.removeProperty('--flowrium-wordmark-shift-y');
      root.style.removeProperty('--flowrium-wordmark-white');
      root.style.removeProperty('--flowrium-bg-reveal');
      root.style.removeProperty('--flowrium-scroll-cue-op');
    };
  }, []);

  return (
    <>
      <Head>
        <title>Flowrium</title>
        <meta name="description" content="Next.js + WebGL canvas" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preload" href="/main vid.mp4" as="video" type="video/mp4" />
        <link rel="preload" href="/move.mp4" as="video" type="video/mp4" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bagel+Fat+One&display=block"
          rel="stylesheet"
        />
      </Head>
      <main className="page">
        {showIntroLoader ? (
          <div className="intro-loader" aria-live="polite">
            <BlurText
              key={`loader-blur-${loaderCycle}`}
              text="FLOWRIUM"
              delay={200}
              animateBy="words"
              direction="top"
              onAnimationComplete={() => {}}
              className="intro-loader-text font-bagel"
            />
            <p className="intro-loader-sub">find your planet</p>
          </div>
        ) : null}
        <div className="bg-flower" aria-hidden>
          <div className="bg-flower-clip">
            <video
              className="bg-flower-video bg-flower-video-blur"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-hidden
              ref={(el) => {
                bgVideosRef.current[0] = el;
              }}
            >
              <source src="/main vid.mp4" type="video/mp4" />
            </video>
            {/* 배경(블러 구역)에만 글라스 느낌 — 커서 선명 원 안은 마스크로 완전 제외 */}
            <div className="bg-glass-field bg-glass-outer-masked" aria-hidden />
            <video
              className="bg-flower-video bg-flower-video-sharp bg-flower-video-sharp-main"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-hidden
              ref={(el) => {
                bgVideosRef.current[1] = el;
              }}
            >
              <source src="/main vid.mp4" type="video/mp4" />
            </video>
            <div
              className="bg-flower-video bg-flower-video-sharp bg-flower-video-sharp-next bg-flower-planet-plate"
              aria-hidden
            >
              <video
                className="bg-flower-planet-video"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                disablePictureInPicture
                disableRemotePlayback
                aria-hidden
                ref={(el) => {
                  bgVideosRef.current[3] = el;
                }}
              >
                <source src="/turn%20plenet.mp4" type="video/mp4" />
              </video>
            </div>
            <video
              className="bg-flower-video bg-flower-video-sharp bg-flower-video-sharp-third"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              disablePictureInPicture
              aria-hidden
              ref={(el) => {
                bgVideosRef.current[2] = el;
              }}
            >
              <source src="/move.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="bg-dither bg-dither-masked bg-dither-viewport" aria-hidden />
          <div className="bg-halftone-coarse bg-dither-masked bg-dither-viewport" aria-hidden />
        </div>
        <div className="title-overlay" style={{ opacity: 'calc(1 - var(--flowrium-second-op, 0))' }}>
          <div className="title-dither bg-dither-masked title-dither-viewport" aria-hidden />
          <div className="title-halftone-coarse bg-dither-masked title-dither-viewport" aria-hidden />
          <div className="title-overlay-inner">
            <p className="hero-intro-title font-bagel" aria-hidden>
              FLOWRIUM
            </p>
            <div className="metallic-title-inner title-scatter-wrap">
              <div className="flowrium-wordmark">
                <div className="metallic-layer flowrium-wordmark-canvas flowrium-wordmark-metallic">
                  <FlowriumMetallicTitle text="FLOWRIUM" seed={42} {...LETTER_TITLE_PROPS} />
                </div>
                <p className="flowrium-wordmark-solid font-bagel" aria-hidden>
                  FLOWRIUM
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="second-scene-overlay" aria-hidden>
          <p className="second-scene-wordmark font-bagel">FLOWRIUM</p>
          <div className="second-scene-stack">
            <span className="second-scene-dot" aria-hidden />
            <p className="second-scene-label">find your planet</p>
            <span className="second-scene-dot" aria-hidden />
            <p className="second-scene-label second-scene-label-muted">sent from nature</p>
            <span className="second-scene-dot" aria-hidden />
          </div>
        </div>
        <div className="third-scene-overlay" aria-hidden>
          <div className="third-scene-veil" />
          <div className="third-scene-inner">
            <div className="third-scene-cards">
              <article
                className="third-scene-card third-scene-card--bloom"
                role="button"
                tabIndex={0}
                onClick={openBloomDetailFromCard}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openBloomDetailFromCard();
                  }
                }}
              >
                <div className="bloom-detail-card-glass" aria-hidden />
                <span className="third-scene-card-title">BLOOM</span>
                <span className="third-scene-card-title third-scene-card-title-br">BLOOM</span>
                <img
                  src="https://www.figma.com/api/mcp/asset/b9251bb6-dc72-4def-a240-7f16c2d544b5"
                  alt=""
                  className="bloom-detail-card-img third-scene-bloom-card-img"
                  draggable={false}
                  decoding="async"
                />
                <div className="third-scene-card-copy">
                  <p className="third-scene-card-head">Air / Diffusion</p>
                  <p className="third-scene-card-body">air, breath, soft presence</p>
                </div>
              </article>
              <article className="third-scene-card">
                <div className="bloom-detail-card-glass" aria-hidden />
                <span className="third-scene-card-title">PRISM</span>
                <span className="third-scene-card-title third-scene-card-title-br">PRISM</span>
                <img
                  src="https://www.figma.com/api/mcp/asset/fdb7a66c-6a44-48c0-b4b6-575065e3b19d"
                  alt=""
                  className="bloom-detail-card-img third-scene-bloom-card-img"
                  draggable={false}
                  decoding="async"
                />
                <div className="third-scene-card-copy">
                  <p className="third-scene-card-head">Light / Structure</p>
                  <p className="third-scene-card-body">light, reflection, transparency</p>
                </div>
              </article>
              <article className="third-scene-card">
                <div className="bloom-detail-card-glass" aria-hidden />
                <span className="third-scene-card-title">CORE</span>
                <span className="third-scene-card-title third-scene-card-title-br">CORE</span>
                <img
                  src="https://www.figma.com/api/mcp/asset/8761e7bb-ff04-48b5-a65d-56d898fb4c00"
                  alt=""
                  className="bloom-detail-card-img third-scene-bloom-card-img"
                  draggable={false}
                  decoding="async"
                />
                <div className="third-scene-card-copy">
                  <p className="third-scene-card-head">Density / Foundation</p>
                  <p className="third-scene-card-body">density, ground, depth</p>
                </div>
              </article>
            </div>
          </div>
        </div>
        {bloomDetailOpen ? (
          <div
            className="bloom-detail-root"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bloom-detail-title"
          >
            <div className="bloom-detail-bg" aria-hidden>
              <video
                className="bloom-detail-hero-video"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                disablePictureInPicture
                aria-hidden
              >
                <source src="/bloom.mp4" type="video/mp4" />
              </video>
            </div>
            <button
              type="button"
              className="bloom-detail-back"
              onClick={closeBloomDetail}
              aria-label="뒤로"
            >
              <span aria-hidden>{'<'}</span>
            </button>
            <h1 id="bloom-detail-title" className="bloom-detail-title font-bagel">
              Bloom
            </h1>
            <div className="bloom-detail-cards">
              <button
                type="button"
                className="bloom-detail-card bloom-detail-card-link"
                onClick={goToPaleBreath}
                aria-label="PALE BREATH 페이지로 이동"
              >
                <div className="bloom-detail-card-glass" aria-hidden />
                <p className="bloom-detail-card-label">
                  PALE
                  <br />
                  BREATH
                </p>
                <p className="bloom-detail-card-desc">
                  가장 옅은 순간,
                  <br />
                  존재보다 먼저 스며든다
                </p>
              </button>
              <article className="bloom-detail-card">
                <div className="bloom-detail-card-glass" aria-hidden />
                <p className="bloom-detail-card-label">
                  SOFT
                  <br />
                  HAZE
                </p>
                <p className="bloom-detail-card-desc">
                  부드럽게 번지며,
                  <br />
                  경계를 흐린다
                </p>
              </article>
              <article className="bloom-detail-card">
                <div className="bloom-detail-card-glass" aria-hidden />
                <p className="bloom-detail-card-label">
                  FADE
                  <br />
                  LIGHT
                </p>
                <p className="bloom-detail-card-desc">
                  남아 있는 기척 위로,
                  <br />
                  조용히 사라진다
                </p>
              </article>
            </div>
          </div>
        ) : null}
        {bloomTransitionOn ? (
          <div className="bloom-glass-transition" aria-hidden>
            <video
              className="bloom-glass-transition-bg"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-hidden
            >
              <source src="/bloom.mp4" type="video/mp4" />
            </video>
            <div className="bloom-glass-transition-card" />
            <div className="bloom-glass-transition-card" />
            <div className="bloom-glass-transition-card" />
          </div>
        ) : null}
        <div ref={scrollSpacerRef} className="page-scroll-spacer" aria-hidden />
        <div className="scroll-cue" aria-hidden>
          <span className="scroll-cue-label">SCROLL</span>
          <span className="scroll-cue-wheel" />
        </div>
      </main>
      <style jsx>{`
        .page {
          position: relative;
          margin: 0;
          min-height: 100vh;
          min-height: 100dvh;
          background: #f4f4f2;
        }
        .page-scroll-spacer {
          width: 100%;
          min-height: 220vh;
          pointer-events: none;
        }
        .intro-loader {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #000;
          pointer-events: auto;
          animation: introLoaderFade ${HERO_REVEAL_MS}ms ease forwards;
        }
        .intro-loader-text {
          margin: 0;
          color: #fff;
          font-size: clamp(2.2rem, 8vw, 6rem);
          letter-spacing: 0.04em;
          text-align: center;
          filter: blur(0);
        }
        .intro-loader-sub {
          margin: 0.65rem 0 0;
          color: rgba(255, 255, 255, 0.92);
          font-size: clamp(0.9rem, 2.2vw, 1.15rem);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          opacity: 0;
          animation: introLoaderSub ${HERO_REVEAL_MS}ms ease forwards;
        }
        @keyframes introLoaderFade {
          0% {
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          78% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes introLoaderSub {
          0%,
          18% {
            opacity: 0;
            transform: translateY(10px);
            filter: blur(6px);
          }
          34% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
          78% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-6px);
            filter: blur(3px);
          }
        }
        .scroll-cue {
          position: fixed;
          left: 50%;
          bottom: clamp(16px, 3.5vh, 36px);
          transform: translateX(-50%);
          z-index: 7;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          pointer-events: none;
          opacity: var(--flowrium-scroll-cue-op, 1);
          transition: opacity 0.25s ease-out;
        }
        .scroll-cue-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2em;
          color: rgba(255, 255, 255, 0.95);
          text-shadow:
            0 0 8px rgba(255, 255, 255, 0.35),
            0 1px 6px rgba(0, 0, 0, 0.28);
        }
        .scroll-cue-wheel {
          width: 20px;
          height: 34px;
          border: 1.35px solid rgba(255, 255, 255, 0.88);
          border-radius: 12px;
          position: relative;
          box-shadow:
            0 0 10px rgba(255, 255, 255, 0.28),
            inset 0 0 8px rgba(255, 255, 255, 0.12);
        }
        .scroll-cue-wheel::after {
          content: '';
          position: absolute;
          top: 6px;
          left: 50%;
          width: 3.5px;
          height: 8px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.45);
          transform: translateX(-50%);
          animation: cueWheel 1.25s ease-in-out infinite;
        }
        @keyframes cueWheel {
          0% {
            opacity: 0;
            transform: translate(-50%, 0);
          }
          30% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, 11px);
          }
        }
      `}</style>
    </>
  );
}
