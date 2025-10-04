import React, { useState } from 'react';

interface AdVideo {
  ad_archive_id: string;
  snapshot?: {
    videos?: Array<{
      video_hd_url?: string;
      video_sd_url?: string;
      video_preview_image_url?: string;
    }>;
    page_name?: string;
  };
  start_date_formatted?: string;
}


const CompetitorContentPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [videos, setVideos] = useState<AdVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'facebook' | 'tiktok'>('facebook');
  
  const [url, setUrl] = useState('');

  
  const handleFetch = async () => {
    setLoading(true);
    setProgress(0);
    setStatusMessage('Starting scraping...');
    setError(null);
    setVideos([]);
    try {
      
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!scrapeRes.ok) {
        const err = await scrapeRes.json();
        throw new Error(err.error || 'Помилка запуску скрапінгу');
      }
      // Poll public/ads-results.json until videos appear or timeout
      const maxAttempts = 30; // ~60s
      let attempt = 0;
      let found = false;
      while (attempt < maxAttempts) {
        attempt++;
        setProgress(Math.round((attempt / maxAttempts) * 90));
        setStatusMessage(`Waiting for results... (attempt ${attempt}/${maxAttempts})`);
        try {
          const res2 = await fetch('/ads-results.json?_=' + Date.now());
          if (res2.ok) {
            const data: AdVideo[] = await res2.json();
            const withVideos = data.filter(
              (ad) => ad.snapshot && ad.snapshot.videos && ad.snapshot.videos.length > 0
            );
            if (withVideos.length > 0) {
              setVideos(withVideos);
              found = true;
              setProgress(100);
              setStatusMessage('Results ready');
              break;
            }
          }
        } catch (e) {
          // ignore transient errors while polling
        }
        await new Promise(res => setTimeout(res, 2000));
      }
      if (!found) {
        throw new Error('Не вдалося отримати результати вчасно');
      }
    } catch (e: any) {
      setError(e.message || 'Сталася помилка');
    } finally {
      setLoading(false);
      setStatusMessage('');
      setProgress(0);
    }
  };

  return (
    <>
      <style>{`
        html, body, #root {
          height: 100vh !important;
          width: 100vw !important;
          margin: 0;
          padding: 0;
          overflow: hidden !important;
          background: #7d97c6 !important;
        }
        .competitor-main {
          width: 100vw;
          height: 100vh;
          background: linear-gradient(120deg, #7d97c6 60%, #a1b8e6 100%);
          display: flex;
          align-items: stretch;
          overflow: hidden;
        }
        .competitor-left {
          width: 40vw;
          min-width: 320px;
          background: #fff;
          border-top-right-radius: 32px;
          border-bottom-right-radius: 32px;
          padding: 40px 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          height: 100vh;
          overflow: auto;
          align-items: center;
        }
        .competitor-btn {
          transition: background 0.2s, color 0.2s, box-shadow 0.2s;
        }
        .competitor-btn:hover:not(:disabled) {
          background: #ffa600;
          color: #fff;
          box-shadow: 0 2px 8px #ffb80044;
        }
        .competitor-platform-btn {
          transition: background 0.2s, color 0.2s;
        }
        .competitor-platform-btn:hover {
          background: #e0e7ef;
        }
        .competitor-results {
          width: 60vw;
          min-width: 0;
          padding: 40px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: transparent;
          height: 100vh;
          overflow: hidden;
          justify-content: center;
        }
        .competitor-card {
          width: 320px;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 4px 24px #0002;
          padding: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          margin-bottom: 24px;
          transition: transform 0.18s, box-shadow 0.18s;
        }
        .competitor-card:hover {
          transform: translateY(-4px) scale(1.03);
          box-shadow: 0 8px 32px #0003;
        }
        @media (max-width: 900px) {
          .competitor-main {
            flex-direction: column;
          }
          .competitor-left, .competitor-results {
            width: 100vw;
            border-radius: 0 !important;
            height: auto;
            min-width: 0;
          }
          .competitor-results {
            padding: 24px 0;
          }
        }
      `}</style>
      <div className="competitor-main">
        <div className="competitor-left">
        <h2 style={{ fontWeight: 600, fontSize: 22, marginBottom: 32 }}>Analyse your competitives</h2>
        <div style={{ width: 320, display: 'flex', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => setPlatform('tiktok')}
            className="competitor-platform-btn"
            style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: platform === 'tiktok' ? '#4b9cff' : '#f2f2f2', color: platform === 'tiktok' ? '#fff' : '#333', fontWeight: 600, fontSize: 16 }}
          >
            TikTok
          </button>
          <button
            onClick={() => setPlatform('facebook')}
            className="competitor-platform-btn"
            style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: platform === 'facebook' ? '#4b9cff' : '#f2f2f2', color: platform === 'facebook' ? '#fff' : '#333', fontWeight: 600, fontSize: 16 }}
          >
            Facebook
          </button>
        </div>
        <input
          type="text"
          placeholder="Введіть посилання на рекламу або пошук"
          value={url}
          onChange={e => setUrl(e.target.value)}
          style={{ width: 320, padding: 12, borderRadius: 8, border: '1px solid #ccc', marginBottom: 32, fontSize: 16, background: '#f8f8f8', color: '#333' }}
        />
        <button
          onClick={handleFetch}
          className="competitor-btn"
          style={{ width: 320, padding: 16, borderRadius: 8, background: '#ffb800', color: '#222', fontWeight: 700, fontSize: 18, border: 'none', cursor: 'pointer', marginTop: 12 }}
          disabled={loading || !url}
        >
          generate similar content
        </button>
      </div>
  <div className="competitor-results">
        <h2 style={{ color: '#fff', fontWeight: 600, fontSize: 24, marginBottom: 32 }}>Results</h2>
        {loading && (
          <div style={{ margin: '24px 0', width: 320 }}>
            <div style={{ width: '100%', height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#4b9cff', transition: 'width 300ms' }} />
            </div>
            <style>{`@keyframes progress { 0%{width:0;} 100%{width:100%;} }`}</style>
            <div style={{ marginTop: 8, color: '#fff' }}>{statusMessage || 'Завантаження...'}</div>
          </div>
        )}
        {error && <div style={{ color: 'red', margin: '16px 0' }}>{error}</div>}
        <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center', alignItems: 'flex-start', minHeight: 400 }}>
          {videos.map((ad) => {
            const video = ad.snapshot?.videos?.[0];
            const videoUrl = video?.video_hd_url || video?.video_sd_url;
            return (
              <div key={ad.ad_archive_id} className="competitor-card">
                <video
                  src={videoUrl}
                  poster={video?.video_preview_image_url}
                  controls
                  style={{ width: '100%', height: 'auto', maxHeight: 480, background: '#000', display: 'block' }}
                />
                <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{ad.snapshot?.page_name || 'Без назви'}</div>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
                    {ad.start_date_formatted ? `Started running on: ${ad.start_date_formatted}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {!loading && videos.length === 0 && !error && (
          <div style={{ marginTop: 32, color: '#fff', fontSize: 18 }}>Немає відео для відображення</div>
        )}
      </div>
      </div>
    </>
  );
};

export default CompetitorContentPage;