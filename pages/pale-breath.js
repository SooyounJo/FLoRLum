import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/pale-breath.module.css';

const FIGMA_BG_IMAGE =
  'https://www.figma.com/api/mcp/asset/039807be-c6fd-4d03-a20b-09da603eaca4';

export default function PaleBreathPage() {
  const router = useRouter();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('flowrium-bg-no-lens');
    return () => {
      root.classList.remove('flowrium-bg-no-lens');
    };
  }, []);

  return (
    <>
      <Head>
        <title>PALE BREATH · Flowrium</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bagel+Fat+One&display=block"
          rel="stylesheet"
        />
      </Head>
      <main className={styles.root}>
        <div className={styles.bg} aria-hidden>
          <img
            src={FIGMA_BG_IMAGE}
            alt=""
            className={styles.bgImg}
            draggable={false}
            decoding="async"
          />
        </div>

        <button
          type="button"
          className={styles.back}
          onClick={() => router.back()}
          aria-label="뒤로"
        >
          <span aria-hidden className={styles.backGlyph}>
            {'<'}
          </span>
        </button>

        <h1 className={styles.title}>PALE BREATH</h1>

        <section className={styles.leftCard} aria-label="노트 요약">
          <div className={styles.glass} aria-hidden />
          <div className={styles.leftCardText}>
            <p className={styles.leftCardLine}>
              <strong>First</strong> &nbsp;Almost imperceptible air
            </p>
            <p className={styles.leftCardLine}>
              <strong>Middle</strong> &nbsp;Soft spreading presence
            </p>
            <p className={styles.leftCardLine}>
              <strong>Last</strong> &nbsp;Faint lingering trace
            </p>
          </div>
          <div className={styles.meter} aria-hidden>
            <span className={styles.meterA} />
            <span className={styles.meterB} />
            <span className={styles.meterC} />
          </div>
        </section>

        <section className={styles.conceptCard} aria-label="컨셉">
          <div className={styles.glass} aria-hidden />
          <p className={styles.cardHeading}>Concept</p>
          <p className={styles.cardBody}>
            형태가 닿기 전,
            <br />
            먼저 스며드는 숨
          </p>
        </section>

        <section className={styles.keywordsCard} aria-label="키워드">
          <div className={styles.glass} aria-hidden />
          <p className={styles.cardHeading}>Keywords</p>
          <p className={styles.cardBody}>Air · Diffusion · Presence</p>
        </section>

        <section className={styles.notesPill} aria-label="향 노트">
          <div className={styles.glass} aria-hidden />
          <p className={styles.notesText}>White tea · green stem · fresh aldehydes</p>
        </section>
      </main>
    </>
  );
}

