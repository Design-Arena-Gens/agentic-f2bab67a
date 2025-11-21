'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { VideoCanvas, type RenderStatus, type SceneConfig, type VideoCanvasHandle } from './VideoCanvas';

const VIDEO_DURATION_SECONDS = 30;
const FPS = 30;

const SCENES: SceneConfig[] = [
  {
    title: 'Sunrise at Burj Khalifa',
    subtitle: 'Witness the city ignite in gold from the tallest tower on Earth.',
    description: 'Capture breathtaking vistas as dawn paints the Dubai skyline in amber hues.',
    image: '/assets/burj-khalifa.jpg',
    start: 0,
    duration: 6
  },
  {
    title: 'Arabian Desert Dunes',
    subtitle: 'Ride the winds across endless dunes bathed in desert light.',
    description: 'Feel the adrenaline of a desert safari, camel treks, and sandboarding adventures.',
    image: '/assets/desert-safari.jpg',
    start: 6,
    duration: 6
  },
  {
    title: 'Dubai Creek Heritage',
    subtitle: 'Sail past souks and wind towers where tradition meets modern flair.',
    description: 'Glide along the creek on an abra as spices and perfumes fill the evening air.',
    image: '/assets/dubai-creek.jpg',
    start: 12,
    duration: 6
  },
  {
    title: 'Iconic Palm Jumeirah',
    subtitle: 'Discover man-made marvels framed by turquoise Arabian Gulf waters.',
    description: 'Luxury resorts, skydiving thrills, and oceanside dining define the Palm experience.',
    image: '/assets/palm-jumeirah.jpg',
    start: 18,
    duration: 6
  },
  {
    title: 'Dubai Marina Nights',
    subtitle: 'Immerse yourself in neon reflections and waterfront glamour.',
    description: 'Indulge in rooftop lounges, yacht cruises, and Michelin-star cuisine after dark.',
    image: '/assets/dubai-marina.jpg',
    start: 24,
    duration: 6
  }
];

const statusCopy: Record<RenderStatus, string> = {
  idle: 'Ready to render a fresh cinematic cut.',
  'loading-assets': 'Curating Dubai highlights…',
  rendering: 'Composing the 30-second journey…',
  complete: 'Video rendered successfully. Preview or download below.',
  error: 'Something went wrong while rendering.'
};

const mediaRecorderSupported = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';

export default function VideoStudio() {
  const canvasRef = useRef<VideoCanvasHandle>(null);
  const [status, setStatus] = useState<RenderStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('video/webm');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const timelineMarkers = useMemo(
    () =>
      SCENES.map((scene) => ({
        ...scene,
        end: scene.start + scene.duration
      })),
    []
  );

  const handleRender = async () => {
    if (!canvasRef.current) return;
    setError(null);
    setDownloadUrl(null);
    try {
      const { blob, mimeType: producedMime } = await canvasRef.current.renderVideo();
      const blobUrl = URL.createObjectURL(blob);
      setMimeType(producedMime);
      setDownloadUrl(blobUrl);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to render the video.';
      setError(message);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1100,
        margin: '0 auto',
        padding: '3.5rem 3rem 4rem',
        background: 'var(--card)',
        borderRadius: '32px',
        border: '1px solid var(--border)',
        boxShadow: '0 30px 80px rgba(8, 11, 22, 0.55)',
        backdropFilter: 'blur(18px)'
      }}
    >
      <header style={{ marginBottom: '2.75rem', textAlign: 'center' }}>
        <p
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            borderRadius: '999px',
            background: 'rgba(56, 189, 248, 0.15)',
            fontSize: '0.85rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(186, 230, 253, 0.85)'
          }}
        >
          30-Second Dubai Tourism Featurette
        </p>
        <h1
          style={{
            marginTop: '1.5rem',
            fontSize: '3.3rem',
            letterSpacing: '-0.03em',
            marginBottom: '1rem'
          }}
        >
          Craft Your Cinematic Dubai Journey
        </h1>
        <p
          style={{
            maxWidth: 720,
            margin: '0 auto',
            fontSize: '1.1rem',
            color: 'rgba(226, 232, 240, 0.75)'
          }}
        >
          Render a polished 30-second tourism reel showcasing the emirate&apos;s icons—from sunrise views
          atop Burj Khalifa to neon-soaked nights at Dubai Marina—all generated in-browser.
        </p>
      </header>

      <VideoCanvas
        ref={canvasRef}
        scenes={SCENES}
        duration={VIDEO_DURATION_SECONDS}
        fps={FPS}
        onStatusChange={setStatus}
        onProgress={setProgress}
        onError={setError}
      />

      <section
        style={{
          marginTop: '2.5rem',
          display: 'grid',
          gap: '1.75rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center'
            }}
          >
            <button
              type="button"
              onClick={handleRender}
              disabled={status === 'rendering' || status === 'loading-assets' || !mediaRecorderSupported}
              style={{
                background: 'linear-gradient(135deg, rgba(14,165,233,0.9), rgba(99,102,241,0.9))',
                color: 'white',
                padding: '0.95rem 1.8rem',
                fontSize: '1rem',
                letterSpacing: '0.04em',
                fontWeight: 600,
                border: 'none',
                borderRadius: '999px',
                cursor: mediaRecorderSupported ? 'pointer' : 'not-allowed',
                opacity: status === 'rendering' || status === 'loading-assets' ? 0.65 : 1,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: '0 18px 35px rgba(14, 165, 233, 0.35)'
              }}
            >
              {status === 'rendering' || status === 'loading-assets' ? 'Rendering…' : 'Render 30s Video'}
            </button>
            <p style={{ color: 'rgba(226, 232, 240, 0.7)', fontSize: '0.95rem' }}>{statusCopy[status]}</p>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '10px',
              borderRadius: '999px',
              background: 'rgba(15, 23, 42, 0.65)',
              overflow: 'hidden',
              border: '1px solid rgba(148, 163, 184, 0.25)'
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${Math.round(progress * 100)}%`,
                background: 'linear-gradient(90deg, rgba(250, 204, 21, 0.95), rgba(190, 242, 100, 0.7))',
                transition: 'width 120ms ease-out'
              }}
            />
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(248, 113, 113, 0.25)',
                padding: '0.85rem 1.1rem',
                borderRadius: '16px',
                color: 'rgba(254, 202, 202, 0.9)' 
              }}
            >
              {error}
            </div>
          )}

          {!mediaRecorderSupported && (
            <div
              style={{
                background: 'rgba(248, 250, 252, 0.08)',
                border: '1px dashed rgba(148, 163, 184, 0.35)',
                padding: '0.85rem 1.1rem',
                borderRadius: '16px',
                color: 'rgba(226, 232, 240, 0.85)'
              }}
            >
              Your browser does not support the MediaRecorder API required for in-browser video rendering.
              Try using the latest version of Chrome or Edge on desktop.
            </div>
          )}
        </div>

        {downloadUrl && (
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              background: 'rgba(15, 23, 42, 0.55)',
              borderRadius: '20px',
              padding: '1.4rem 1.6rem',
              border: '1px solid rgba(125, 211, 252, 0.25)'
            }}
          >
            <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 0.85)' }}>
              Preview your freshly rendered clip below. Right-click to save or use the download button for a
              {mimeType.includes('mp4') ? 'n MP4' : ' WebM'} export.
            </p>
            <video
              controls
              controlsList="nodownload"
              style={{
                width: '100%',
                borderRadius: '16px',
                border: '1px solid rgba(148, 163, 184, 0.35)',
                background: 'black'
              }}
            >
              <source src={downloadUrl} type={mimeType} />
              Your browser does not support the video tag.
            </video>
            <div>
              <a
                href={downloadUrl}
                download="dubai-tourism-featurette.webm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(22, 163, 74, 0.15)',
                  color: 'rgba(187, 247, 208, 0.9)',
                  padding: '0.75rem 1.4rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  fontWeight: 600
                }}
              >
                Download Video
              </a>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gap: '0.9rem',
            background: 'rgba(15, 23, 42, 0.45)',
            borderRadius: '20px',
            padding: '1.6rem 1.5rem',
            border: '1px solid rgba(148, 163, 184, 0.25)'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'rgba(244, 244, 245, 0.85)', letterSpacing: '0.05em' }}>
            Scene Timeline
          </h2>
          <div
            style={{
              display: 'grid',
              gap: '1rem'
            }}
          >
            {timelineMarkers.map((scene) => (
              <div
                key={scene.title}
                style={{
                  display: 'grid',
                  gap: '0.35rem',
                  background: 'rgba(30, 41, 59, 0.4)',
                  borderRadius: '16px',
                  padding: '1rem 1.2rem',
                  border: '1px solid rgba(59, 130, 246, 0.15)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{scene.title}</p>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(148, 163, 184, 0.75)' }}>
                    {scene.start.toString().padStart(2, '0')}s – {scene.end.toString().padStart(2, '0')}s
                  </span>
                </div>
                <p style={{ margin: 0, color: 'rgba(203, 213, 225, 0.72)', fontSize: '0.95rem' }}>{scene.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
