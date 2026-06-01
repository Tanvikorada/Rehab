import { useEffect, useRef, useState } from 'react';
// MediaPipe is loaded via CDN script tag in index.html — accessed inside useEffect

const PoseDetector = ({ onPoseResults, facingMode = 'user' }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onPoseResultsRef = useRef(onPoseResults);
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(false);
      drawSkeleton(results, POSE_CONNECTIONS);
      if (onPoseResultsRef.current) onPoseResultsRef.current(results);
    });

    const startCamera = async () => {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
          videoRef.current.play();

          const processFrame = async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              await pose.send({ image: videoRef.current });
            }
            animationFrameId = requestAnimationFrame(processFrame);
          };
          processFrame();
        }
      } catch (err) {
        setError('Camera access denied. Please allow camera permissions and refresh.');
        setIsLoading(false);
        console.error('Camera access denied or unavailable', err);
      }
    };

    startCamera();

    return () => {
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
          <p className="text-gray-400 text-xs tracking-widest uppercase">Loading AI Model...</p>
        </div>
      )}
    </div>
  );
};

export default PoseDetector;
