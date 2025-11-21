'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';

export type SceneConfig = {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  start: number;
  duration: number;
};

export type RenderStatus =
  | 'idle'
  | 'loading-assets'
  | 'rendering'
  | 'complete'
  | 'error';

type VideoCanvasProps = {
  scenes: SceneConfig[];
  duration: number;
  fps: number;
  resolution?: {
    width: number;
    height: number;
  };
  onStatusChange?: (status: RenderStatus) => void;
  onProgress?: (value: number) => void;
  onError?: (message: string) => void;
};

export type VideoCanvasHandle = {
  renderVideo: () => Promise<{ blob: Blob; mimeType: string }>;
  isMediaRecorderSupported: boolean;
};

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const DEFAULT_RESOLUTION = { width: 1280, height: 720 };

const MEDIA_RECORDER_SUPPORT = (() => {
  if (typeof window === 'undefined') return false;
  return typeof window.MediaRecorder !== 'undefined';
})();

function buildMimeType(): string {
  if (typeof window === 'undefined' || !('MediaRecorder' in window)) return 'video/webm';
  if (window.MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) return 'video/webm;codecs=vp9';
  if (window.MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) return 'video/webm;codecs=vp8';
  if (window.MediaRecorder.isTypeSupported('video/webm;codecs=h264')) return 'video/webm;codecs=h264';
  return 'video/webm';
}

export const VideoCanvas = forwardRef<VideoCanvasHandle, VideoCanvasProps>(
  (
    {
      scenes,
      duration,
      fps,
      resolution = DEFAULT_RESOLUTION,
      onStatusChange,
      onProgress,
      onError
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationRef = useRef<number>();
    const imageCacheRef = useRef<HTMLImageElement[] | null>(null);
    const startTimeRef = useRef<number>(0);
    const [canvasReady, setCanvasReady] = useState(false);

    const notifyStatus = useCallback(
      (status: RenderStatus) => {
        onStatusChange?.(status);
      },
      [onStatusChange]
    );

    const notifyProgress = useCallback(
      (value: number) => {
        onProgress?.(value);
      },
      [onProgress]
    );

    const cancelAnimation = useCallback(() => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    }, []);

    const drawFrame = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        images: HTMLImageElement[],
        elapsedMs: number,
        options: {
          onComplete: () => void;
        }
      ) => {
        const { width, height } = resolution;
        const totalDurationMs = duration * 1000;
        const progress = clamp(elapsedMs / totalDurationMs, 0, 1);
        notifyProgress(progress);

        if (elapsedMs >= totalDurationMs) {
          options.onComplete();
          return;
        }

        ctx.save();
        ctx.clearRect(0, 0, width, height);

        const elapsedSeconds = elapsedMs / 1000;
        let accumulated = 0;
        let sceneIndex = scenes.length - 1;

        for (let i = 0; i < scenes.length; i += 1) {
          const scene = scenes[i];
          const sceneStart = accumulated;
          const sceneEnd = accumulated + scene.duration;
          if (elapsedSeconds >= sceneStart && elapsedSeconds < sceneEnd) {
            sceneIndex = i;
            break;
          }
          accumulated += scene.duration;
        }

        const scene = scenes[sceneIndex];
        const image = images[sceneIndex];
        const sceneElapsed = elapsedSeconds - accumulated;
        const sceneProgress = clamp(sceneElapsed / scene.duration, 0, 1);
        const zoom = 1 + 0.06 * easeInOutCubic(sceneProgress);

        const baseScale = Math.max(width / image.width, height / image.height) * zoom;
        const drawWidth = image.width * baseScale;
        const drawHeight = image.height * baseScale;
        const drawX = width / 2 - drawWidth / 2;
        const drawY = height / 2 - drawHeight / 2;

        ctx.filter = 'brightness(1.05) saturate(1.15)';
        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        ctx.filter = 'none';

        const gradient = ctx.createLinearGradient(0, height * 0.45, 0, height);
        gradient.addColorStop(0, 'rgba(3, 7, 18, 0.05)');
        gradient.addColorStop(0.65, 'rgba(3, 7, 18, 0.65)');
        gradient.addColorStop(1, 'rgba(3, 7, 18, 0.92)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(60, 60, width - 120, height - 120);

        ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(60, 60, width - 120, height - 120);

        const fadeWindow = Math.min(0.75, scene.duration / 3);
        const fadeIn = clamp(sceneElapsed / fadeWindow, 0, 1);
        const fadeOut = clamp((scene.duration - sceneElapsed) / fadeWindow, 0, 1);
        const textOpacity = Math.min(fadeIn, fadeOut);

        ctx.fillStyle = `rgba(250, 204, 21, ${0.8 * textOpacity})`;
        ctx.font = '48px "Bebas Neue", "Inter", system-ui';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('Visit Dubai', 110, height - 220);

        ctx.fillStyle = `rgba(255, 255, 255, ${0.92 * textOpacity})`;
        ctx.font = '72px "Playfair Display", "Inter", serif';
        ctx.fillText(scene.title, 110, height - 150);

        ctx.fillStyle = `rgba(241, 245, 249, ${0.75 * textOpacity})`;
        ctx.font = '30px "Inter", sans-serif';
        wrapText(ctx, scene.subtitle, 110, height - 100, width - 220, 40);

        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.font = '22px "Inter", sans-serif';
        wrapText(ctx, scene.description, 110, height - 60, width - 220, 30);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(110, height - 28, width - 220, 8);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.8)';
        ctx.fillRect(110, height - 28, (width - 220) * progress, 8);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.font = '20px "Inter", sans-serif';
        ctx.fillText(`${Math.round(progress * 30)} sec`, width - 150, height - 34);

        ctx.restore();
      },
      [duration, notifyProgress, resolution, scenes]
    );

    const loadImages = useCallback(async () => {
      if (imageCacheRef.current) return imageCacheRef.current;

      notifyStatus('loading-assets');

      const loaders = scenes.map(
        (scene) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.decoding = 'async';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image ${scene.image}`));
            img.src = scene.image;
          })
      );

      const images = await Promise.all(loaders);
      imageCacheRef.current = images;
      return images;
    }, [notifyStatus, scenes]);

    const ensureCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { width, height } = resolution;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      setCanvasReady(true);
    }, [resolution]);

    useEffect(() => {
      if (typeof window === 'undefined') return;
      ensureCanvas();
      window.addEventListener('resize', ensureCanvas);
      return () => {
        window.removeEventListener('resize', ensureCanvas);
        cancelAnimation();
      };
    }, [ensureCanvas, cancelAnimation]);

    const startAnimation = useCallback(
      (context: CanvasRenderingContext2D, images: HTMLImageElement[], onComplete: () => void) => {
        cancelAnimation();
        startTimeRef.current = performance.now();
        notifyProgress(0);
        notifyStatus('rendering');

        const tick = () => {
          if (!canvasRef.current) return;
          const elapsedMs = performance.now() - startTimeRef.current;
          drawFrame(context, images, elapsedMs, {
            onComplete: () => {
              onComplete();
              cancelAnimation();
              notifyStatus('complete');
              notifyProgress(1);
            }
          });
          animationRef.current = requestAnimationFrame(tick);
        };

        animationRef.current = requestAnimationFrame(tick);
      },
      [cancelAnimation, drawFrame, notifyProgress, notifyStatus]
    );

    useImperativeHandle(
      ref,
      () => ({
        renderVideo: async () => {
          if (!canvasRef.current) throw new Error('Canvas is not ready yet.');
          if (!MEDIA_RECORDER_SUPPORT) throw new Error('MediaRecorder API is not supported in this browser.');

          try {
            const images = await loadImages();
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Unable to access canvas context.');

            const mimeType = buildMimeType();
            const stream = canvas.captureStream(fps);
            const mediaRecorder = new MediaRecorder(stream, {
              mimeType,
              videoBitsPerSecond: 5_000_000
            });
            const chunks: Blob[] = [];

            const resultPromise = new Promise<{ blob: Blob; mimeType: string }>((resolve, reject) => {
              mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                  chunks.push(event.data);
                }
              };

              mediaRecorder.onerror = (event) => {
                const recorderError = (event as { error?: DOMException }).error;
                cancelAnimation();
                stream.getTracks().forEach((track) => track.stop());
                notifyStatus('error');
                onError?.(recorderError?.message ?? 'Recording error encountered.');
                reject(recorderError ?? new Error('Recording failed.'));
              };

              mediaRecorder.onstop = () => {
                stream.getTracks().forEach((track) => track.stop());
                resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType });
              };
            });

            mediaRecorder.start();
            startAnimation(ctx, images, () => {
              if (mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
              }
            });

            return await resultPromise;
          } catch (error) {
            notifyStatus('error');
            const message =
              error instanceof Error ? error.message : 'Unknown error while rendering the video.';
            onError?.(message);
            throw error;
          }
        },
        isMediaRecorderSupported: MEDIA_RECORDER_SUPPORT
      }),
      [cancelAnimation, fps, loadImages, onError, notifyStatus, startAnimation]
    );

    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.45)',
          background:
            'radial-gradient(circle at top, rgba(14,165,233,0.12), transparent 55%), rgba(2,6,23,1)'
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
          aria-label="Dubai tourism cinematic canvas"
        />
        {!canvasReady && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(2, 6, 23, 0.85)',
              color: 'rgba(248, 250, 252, 0.85)',
              fontSize: '1.1rem'
            }}
          >
            Preparing canvas…
          </div>
        )}
      </div>
    );
  }
);

VideoCanvas.displayName = 'VideoCanvas';

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;

  for (let n = 0; n < words.length; n += 1) {
    const testLine = `${line}${words[n]} `;
    const metrics = context.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      context.fillText(line.trim(), x, lineY);
      line = `${words[n]} `;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line.trim(), x, lineY);
}
