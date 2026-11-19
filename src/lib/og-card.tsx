import { ImageResponse } from 'next/og';

export const OG_SIZE = {
  width: 1200,
  height: 630,
};

export function createNetwatchOgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #090d16 0%, #0f172a 55%, #111a2e 100%)',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-140px',
            right: '-120px',
            width: '540px',
            height: '540px',
            borderRadius: '9999px',
            background: 'radial-gradient(circle, rgba(37,99,235,0.42) 0%, rgba(37,99,235,0) 70%)',
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '20px',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M8 6.5V17.5L17.5 12L8 6.5Z" fill="#ffffff" />
            </svg>
          </div>
          <div
            style={{
              fontSize: '42px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              display: 'flex',
            }}
          >
            <span style={{ color: '#ffffff' }}>Net</span>
            <span style={{ color: '#60a5fa' }}>watch</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '880px' }}>
          <div
            style={{
              fontSize: '64px',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              marginBottom: '20px',
              display: 'flex',
            }}
          >
            Elite Cinematic Streaming
          </div>
          <div
            style={{
              fontSize: '28px',
              lineHeight: 1.4,
              color: '#cbd5e1',
              display: 'flex',
            }}
          >
            Trending movies, episodic sagas, adaptive HLS playback, and live multi-language subtitles.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          {['Direct HLS', 'Multi-Language Subtitles', 'Movies & TV'].map((pill) => (
            <div
              key={pill}
              style={{
                padding: '10px 22px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                border: '1px solid rgba(96, 165, 250, 0.4)',
                color: '#bfdbfe',
                fontSize: '20px',
                fontWeight: 600,
                marginRight: '14px',
                display: 'flex',
              }}
            >
              {pill}
            </div>
          ))}
        </div>
      </div>
    ),
    OG_SIZE
  );
}

export function createNetwatchIconImage(size: number): ImageResponse {
  const radius = Math.round(size * 0.24);
  const svgSize = Math.round(size * 0.56);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2563eb',
          borderRadius: `${radius}px`,
        }}
      >
        <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none">
          <path d="M8 6.5V17.5L17.5 12L8 6.5Z" fill="#ffffff" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
