import { GoogleGenAI, PersonGeneration } from '@google/genai';


interface VideoGenerationConfig {
  prompt: string;
  imageBase64: string;
  mimeType: string;
  aspectRatio: '16:9' | '9:16';
  durationSeconds: number;
  includeAudio?: boolean;
  audioDescription?: string;
}

interface VideoGenerationProgress {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
}

const createFallbackVideo = async (aspectRatio: '16:9' | '9:16', durationSeconds: number): Promise<string> => {
  
  const canvas = document.createElement('canvas');
  const width = aspectRatio === '16:9' ? 640 : 360;
  const height = aspectRatio === '16:9' ? 360 : 640;
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#ff9500');
  gradient.addColorStop(1, '#ff5e3a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Montserrat';
  ctx.textAlign = 'center';
  ctx.fillText('Sample Video', width / 2, height / 2 - 20);
  ctx.font = '18px Montserrat';
  ctx.fillText('Video generation failed', width / 2, height / 2 + 20);
  ctx.fillText(`Aspect ratio: ${aspectRatio}`, width / 2, height / 2 + 50);
  
  
  
  const video = document.createElement('video');
  video.width = width;
  video.height = height;
  video.autoplay = false;
  video.controls = true;
  video.loop = true;
  video.muted = true;
  
  const stream = canvas.captureStream(30); 
  const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  
  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };
  
  return new Promise<string>((resolve) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      resolve(url);
    };
    
    mediaRecorder.start();
    
    setTimeout(() => {
      mediaRecorder.stop();
    }, Math.min(durationSeconds, 3) * 1000); 
  });
};

export const generateVideoFromImage = async (
  config: VideoGenerationConfig,
  onProgress: (progress: VideoGenerationProgress) => void
): Promise<string | null> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  console.log('Environment variables available:', Object.keys(import.meta.env));
  console.log('Using GEMINI API key present:', !!apiKey);

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY (VITE_GEMINI_API_KEY) is not set. For dev: add VITE_GEMINI_API_KEY to .env.local and restart the dev server. Do not expose secrets in client-side code for production — use a server-side endpoint instead.');
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  try {
    onProgress({
      status: 'pending',
      progress: 0,
      message: 'Starting video generation...'
    });

    let finalPrompt = config.prompt;
    if (config.includeAudio && config.audioDescription) {
      finalPrompt = `${finalPrompt} ${config.audioDescription}`;
    } else if (config.includeAudio) {
      finalPrompt = `${finalPrompt} Include appropriate background sounds and ambient noise that match the scene.`;
    }

    console.log('Sending request to Gemini API with prompt:', finalPrompt);
    console.log('Using aspect ratio:', config.aspectRatio);
    console.log('Using duration:', config.durationSeconds);
    console.log('Including audio:', config.includeAudio || false);

    let operation = await ai.models.generateVideos({
      model: 'veo-3.0-generate-001',
      prompt: finalPrompt,
      image: {
        imageBytes: config.imageBase64,
        mimeType: config.mimeType,
      },
      config: {
        numberOfVideos: 1,
        aspectRatio: config.aspectRatio,
        durationSeconds: config.durationSeconds,
        personGeneration: PersonGeneration.ALLOW_ADULT,
        
      },
    });

    console.log('Initial operation response:', operation);

    let attempts = 0;
    const maxAttempts = 30; 
    
    while (!operation.done && attempts < maxAttempts) {
      attempts++;
      const progressPercent = Math.min(90, attempts * 3); 
      
      onProgress({
        status: 'processing',
        progress: progressPercent,
        message: `Processing video${config.includeAudio ? ' with audio' : ''} (attempt ${attempts})...`
      });
      
      await new Promise((resolve) => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
      console.log(`Operation status (attempt ${attempts}):`, operation.done ? 'Complete' : 'In progress');
    }

    if (!operation.done) {
      throw new Error('Video generation timed out');
    }

    onProgress({
      status: 'completed',
      progress: 95,
      message: 'Video generated, downloading...'
    });

    const videos = operation.response?.generatedVideos;
    if (!videos || videos.length === 0) {
      console.warn('No videos were generated by the API, creating fallback video');
      
      onProgress({
        status: 'completed',
        progress: 95,
        message: 'Creating fallback video...'
      });
      
      const fallbackUrl = await createFallbackVideo(config.aspectRatio, config.durationSeconds);
      
      onProgress({
        status: 'completed',
        progress: 100,
        message: 'Using fallback video (API generation failed)'
      });
      
      return fallbackUrl;
    }

    const uri = videos[0]?.video?.uri;
    if (!uri) {
      throw new Error('Video URI is missing');
    }

    console.log('Video URI obtained, preparing to download');

    const downloadUrl = uri.includes('?')
      ? `${uri}&key=${apiKey}`
      : `${uri}?key=${apiKey}`;

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }

    onProgress({
      status: 'completed',
      progress: 100,
      message: `Video${config.includeAudio ? ' with audio' : ''} ready!`
    });

    const blob = await response.blob();
    console.log('Video downloaded successfully, size:', blob.size);
    
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Video generation error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    onProgress({
      status: 'error',
      progress: 0,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    });
    
    try {
      console.log('Creating fallback video due to error');
      return await createFallbackVideo(config.aspectRatio, config.durationSeconds);
    } catch (fallbackError) {
      console.error('Failed to create fallback video:', fallbackError);
      return null;
    }
  }
};

export const dataURLtoFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
};

export const getImageMimeType = (fileName: string): string => {
  const extension = fileName.toLowerCase().split('.').pop();
  switch (extension) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
};
