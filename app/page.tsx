import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const VideoStudio = dynamic(() => import('../components/VideoStudio'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        maxWidth: 1100,
        margin: '0 auto',
        padding: '4rem 2rem',
        background: 'var(--card)',
        borderRadius: '32px',
        border: '1px solid var(--border)',
        boxShadow: '0 30px 80px rgba(15, 23, 42, 0.35)'
      }}
    >
      <p style={{ fontSize: '1.25rem', opacity: 0.75 }}>Loading Dubai video studio…</p>
    </div>
  )
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VideoStudio />
    </Suspense>
  );
}
