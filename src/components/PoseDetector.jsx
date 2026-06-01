import { useEffect, useRef, useState } from 'react';
// MediaPipe is loaded via CDN script tag in index.html — accessed inside useEffect

const PoseDetector = ({ onPoseResults, facingMode = 'user' }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onPoseResultsRef = useRef(onPoseResults);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Opening camera...');
  const [error, setError] = useState(null);

  useEffect(() => {
    onPoseResultsRef.current = onPoseResults;
  }, [onPoseResults]);

  function drawSkeleton(results, POSE_CONNECTIONS) {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;
    const ctx = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (!results.poseLandmarks) return;

    POSE_CONNECTIONS.forEach(([start, end]) => {
      const s = results.poseLandmarks[start];
      const e = results.poseLandmarks[end];
      if (s.visibility > 0.5 && e.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(s.x * canvas.width, s.y * canvas.height);
        ctx.lineTo(e.x * canvas.width, e.y * canvas.height);
        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    results.poseLandmarks.forEach((lm) => {
      if (lm.visibility > 0.5) {
        ctx.beginPath();
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#AAFF00';
        ctx.fill();
      }
    });
  }

  useEffect(() => {
    let animationFrameId;
    let currentStream;
    let stopped = false;
    let isSendingFrame = false;
    let lastPoseSend = 0;
    let modelStarted = false;
    let loadingTimer;

    // Defer reading window.Pose until inside useEffect (after CDN script has run)
    const Pose = window.Pose;
    const POSE_CONNECTIONS = window.POSE_CONNECTIONS;

    if (!Pose) {
      setTimeout(() => {
        setError('MediaPipe failed to load. Check your internet connection and refresh.');
        setIsLoading(false);
      }, 0);
      return;
    }

    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    pose.onResults((results) => {
      modelStarted = true;
      setIsLoading(false);
      drawSkeleton(results, POSE_CONNECTIONS);
      if (onPoseResultsRef.current) onPoseResultsRef.current(results);
    });

    function drawCameraPreview() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);
    }

    const startCamera = async () => {
      try {
        setLoadingMessage('Requesting camera permission...');
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
          setLoadingMessage('Starting live preview...');
          await videoRef.current.play();
          drawCameraPreview();
          setLoadingMessage('Starting pose tracking...');

          loadingTimer = setTimeout(() => {
            if (!stopped && !modelStarted) {
              setIsLoading(false);
            }
          }, 6000);

          const processFrame = () => {
            if (stopped) return;
            drawCameraPreview();
            const now = performance.now();
            if (
              videoRef.current &&
              videoRef.current.readyState >= 2 &&
              !isSendingFrame &&
              now - lastPoseSend > 80
            ) {
              isSendingFrame = true;
              lastPoseSend = now;
              pose.send({ image: videoRef.current })
                .catch((err) => {
                  console.warn('Pose frame skipped', err);
                  if (!modelStarted) {
                    setLoadingMessage('Still starting pose tracking...');
                  }
                })
                .finally(() => {
                  isSendingFrame = false;
                });
            }
            animationFrameId = requestAnimationFrame(processFrame);
          };
          processFrame();
        }
      } catch (err) {
        setError('Camera could not start. Allow camera permission, close other camera apps, then try again.');
        setIsLoading(false);
        console.error('Camera access denied or unavailable', err);
      }
    };

    startCamera();

    return () => {
      stopped = true;
      if (loadingTimer) clearTimeout(loadingTimer);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (currentStream) currentStream.getTracks().forEach(track => track.stop());
      pose.close();
    };
  }, [facingMode]);

  if (error) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center text-red-400 text-sm p-4 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="w-full rounded-lg" />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 rounded-lg flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-xs tracking-widest uppercase">{loadingMessage}</p>
        </div>
      )}
    </div>
  );
};

export default PoseDetector;
