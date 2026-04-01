import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { LogOut, Camera, Upload, AlertCircle, User, Video, Loader2 } from 'lucide-react';
import * as faceapi from 'face-api.js';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectionResults, setDetectionResults] = useState<string | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);

  // Load face detection models
  useEffect(() => {
    loadModels();
    return () => {
      stopWebcam();
    };
  }, []);

  const loadModels = async () => {
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      
      setModelsLoaded(true);
      console.log('Face detection models loaded successfully');
    } catch (err) {
      console.error('Error loading models:', err);
      setError('Failed to load face detection models');
    }
  };

  const startWebcam = async () => {
    try {
      setError(null);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available. Please ensure you are using a secure connection (HTTPS) on a supported browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setWebcamActive(true);
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError('Could not access webcam. Please grant camera permissions.');
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setWebcamActive(false);
    setIsDetecting(false);
  };

  const detectFacesWebcam = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    setIsDetecting(true);
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Wait for video to be ready
    if (video.readyState !== 4) {
      setTimeout(detectFacesWebcam, 100);
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Start continuous detection
    detectionIntervalRef.current = window.setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      // Clear canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Draw detections
      if (detections.length > 0) {
        const resizedDetections = faceapi.resizeResults(detections, {
          width: video.videoWidth,
          height: video.videoHeight
        });

        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        // Update results
        const results = detections.map((det, idx) => {
          const expression = Object.entries(det.expressions).reduce((a, b) => 
            a[1] > b[1] ? a : b
          );
          return `Face ${idx + 1}: ${(det.detection.score * 100).toFixed(1)}% confidence, Expression: ${expression[0]} (${(expression[1] * 100).toFixed(1)}%)`;
        }).join('\n');
        
        setDetectionResults(`Detected ${detections.length} face(s)\n${results}`);
      } else {
        setDetectionResults('No faces detected');
      }
    }, 100);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDetecting(true);
    setError(null);
    setDetectionResults(null);

    try {
      const img = imagePreviewRef.current;
      if (!img) return;

      img.src = URL.createObjectURL(file);
      
      img.onload = async () => {
        const detections = await faceapi
          .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        // Create canvas for drawing
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (detections.length > 0) {
          const resizedDetections = faceapi.resizeResults(detections, {
            width: img.width,
            height: img.height
          });

          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

          const results = detections.map((det, idx) => {
            const expression = Object.entries(det.expressions).reduce((a, b) => 
              a[1] > b[1] ? a : b
            );
            return `Face ${idx + 1}: ${(det.detection.score * 100).toFixed(1)}% confidence, Expression: ${expression[0]} (${(expression[1] * 100).toFixed(1)}%)`;
          }).join('\n');
          
          setDetectionResults(`Detected ${detections.length} face(s)\n${results}`);
        } else {
          setDetectionResults('No faces detected in the image');
        }

        setIsDetecting(false);
      };
    } catch (err) {
      console.error('Error processing image:', err);
      setError('Failed to process image');
      setIsDetecting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Camera className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Face Detection Dashboard</h1>
                <p className="text-sm text-gray-600">Powered by AI</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.user_metadata?.name || user?.email}
                </span>
              </div>
              <Button onClick={handleSignOut} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!modelsLoaded && (
          <Alert className="mb-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Loading face detection models...</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="webcam" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="webcam">
              <Video className="w-4 h-4 mr-2" />
              Webcam
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </TabsTrigger>
          </TabsList>

          {/* Webcam Detection */}
          <TabsContent value="webcam">
            <Card>
              <CardHeader>
                <CardTitle>Webcam Face Detection</CardTitle>
                <CardDescription>
                  Real-time face detection using your webcam
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  {!webcamActive ? (
                    <Button onClick={startWebcam} disabled={!modelsLoaded}>
                      <Camera className="w-4 h-4 mr-2" />
                      Start Webcam
                    </Button>
                  ) : (
                    <>
                      <Button onClick={detectFacesWebcam} disabled={isDetecting}>
                        {isDetecting ? 'Detecting...' : 'Start Detection'}
                      </Button>
                      <Button onClick={stopWebcam} variant="destructive">
                        Stop Webcam
                      </Button>
                    </>
                  )}
                </div>

                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-auto"
                    style={{ display: webcamActive ? 'block' : 'none' }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  />
                  {!webcamActive && (
                    <div className="flex items-center justify-center h-[480px] text-gray-400">
                      <div className="text-center">
                        <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Webcam not started</p>
                      </div>
                    </div>
                  )}
                </div>

                {detectionResults && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">Detection Results:</h4>
                    <pre className="text-sm text-green-800 whitespace-pre-wrap">
                      {detectionResults}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Image Upload Detection */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Image Face Detection</CardTitle>
                <CardDescription>
                  Upload an image to detect faces
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={!modelsLoaded || isDetecting}
                    className="hidden"
                  />
                  <Button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={!modelsLoaded || isDetecting}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isDetecting ? 'Processing...' : 'Choose Image'}
                  </Button>
                </div>

                <div className="relative bg-gray-100 rounded-lg overflow-hidden min-h-[400px] flex items-center justify-center">
                  <img
                    ref={imagePreviewRef}
                    alt="Upload preview"
                    className="max-w-full h-auto"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                  />
                </div>

                {detectionResults && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">Detection Results:</h4>
                    <pre className="text-sm text-green-800 whitespace-pre-wrap">
                      {detectionResults}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ Real-time face detection with bounding boxes</li>
              <li>✅ Facial landmarks identification</li>
              <li>✅ Expression recognition (happy, sad, angry, etc.)</li>
              <li>✅ Confidence score for each detection</li>
              <li>✅ Support for both webcam and image upload</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}