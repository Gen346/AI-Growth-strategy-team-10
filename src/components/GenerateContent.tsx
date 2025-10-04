import React, { useState, useRef, useCallback } from 'react';
import { generateVideoFromImage} from '../services/videoGenerationService';
import './GenerateContent.css';

const GenerateContent: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [duration, setDuration] = useState<number>(8);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (uploadAreaRef.current) {
      uploadAreaRef.current.classList.add('active');
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (uploadAreaRef.current) {
      uploadAreaRef.current.classList.remove('active');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (uploadAreaRef.current) {
      uploadAreaRef.current.classList.remove('active');
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const newImages: string[] = [];
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newImages.push(e.target.result as string);
            setSelectedImages(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleGenerateVideo = async () => {
    if (selectedImageIndex === -1) {
      setError('Please select an image first');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setProgress(0);
    setStatusMessage('Starting video generation...');
    setVideoUrl(null);

    try {
      const selectedImage = selectedImages[selectedImageIndex];
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(',')[0].split(':')[1].split(';')[0];

      console.log('Starting video generation with prompt:', prompt);
      console.log('Using image with mime type:', mimeType);

      const result = await generateVideoFromImage(
        {
          prompt,
          imageBase64: base64Data,
          mimeType,
          aspectRatio,
          durationSeconds: duration
        },
        (progressData) => {
          setProgress(progressData.progress);
          setStatusMessage(progressData.message);
          
          
          if (progressData.message.includes('fallback') || progressData.message.includes('failed')) {
            setError('Video generation failed. Using fallback video instead.');
          }
        }
      );

      if (result) {
        console.log('Video URL obtained:', result);
        setVideoUrl(result);
      } else {
        console.error('Failed to generate video: result is null');
        setError('Failed to generate or create fallback video');
      }
    } catch (err) {
      console.error('Video generation error:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    
    
    if (videoUrl.startsWith('blob:')) {
      
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `generated-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      
      fetch(videoUrl)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `sample-video-${Date.now()}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch(error => {
          console.error('Error downloading video:', error);
          setError('Failed to download video');
        });
    }
  };

  const handlePolicyCheck = () => {
    
    console.log('Policy compliance check');
  };

  return (
    <div className="generate-content-container">
      <div className="left-panel">
        <input
          type="text"
          className="prompt-input"
          placeholder="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        
        <div
          ref={uploadAreaRef}
          className="upload-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-text">upload you images</div>
          <input
            ref={fileInputRef}
            type="file"
            className="upload-input"
            accept="image/*"
            multiple
            onChange={handleFileChange}
          />
        </div>
        
        {selectedImages.length > 0 && (
          <div className="thumbnail-container">
            {selectedImages.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Thumbnail ${index}`}
                className={`thumbnail ${selectedImageIndex === index ? 'selected' : ''}`}
                onClick={() => handleImageClick(index)}
              />
            ))}
          </div>
        )}
        
        <div className="aspect-ratio-container">
          <button
            className={`aspect-ratio-button ${aspectRatio === '9:16' ? 'selected' : ''}`}
            onClick={() => setAspectRatio('9:16')}
          >
            9:16
          </button>
          <button
            className={`aspect-ratio-button ${aspectRatio === '16:9' ? 'selected' : ''}`}
            onClick={() => setAspectRatio('16:9')}
          >
            16:9
          </button>
        </div>
        
        <div className="duration-container">
          <button
            className={`duration-button ${duration === 3 ? 'selected' : ''}`}
            onClick={() => setDuration(3)}
          >
            3 sec
          </button>
          <button
            className={`duration-button ${duration === 6 ? 'selected' : ''}`}
            onClick={() => setDuration(6)}
          >
            6 sec
          </button>
          <button
            className={`duration-button ${duration === 8 ? 'selected' : ''}`}
            onClick={() => setDuration(8)}
          >
            8 sec
          </button>
        </div>
        
        <button
          className="generate-button"
          onClick={handleGenerateVideo}
          disabled={isGenerating}
        >
          generate
        </button>
        
        <button
          className="policy-check-button"
          onClick={handlePolicyCheck}
          disabled={isGenerating}
        >
          policy compliance check
        </button>
        
        {error && <div className="error-message">{error}</div>}
      </div>
      
      <div className="right-panel">
        <div className="panel-title">Generate content content</div>
        
        <div className="video-container">
          {videoUrl ? (
            <video
              className="video-player"
              src={videoUrl}
              controls
              autoPlay
              loop
            />
          ) : (
            <div className="video-placeholder">generated video</div>
          )}
          
          {isGenerating && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div>{statusMessage}</div>
            </div>
          )}
        </div>
        
        <button
          className="download-button"
          onClick={handleDownload}
          disabled={!videoUrl || isGenerating}
        >
          download
        </button>
      </div>
    </div>
  );
};

export default GenerateContent;
