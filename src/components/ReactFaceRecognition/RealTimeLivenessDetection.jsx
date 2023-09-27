import {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import * as FaceSDK from "./ReactFaceRecognitionSDK";
import "./ReactFaceRecognition.css";

const Component = ({ width, height, fps = 60 }, ref) => {
  let videoRef = useRef();
  let canvasRef = useRef();

  // const { loaded, cv } = useOpenCv();
  const [imageCapture, setImageCapture] = useState(null);
  const [webcamReady, setWebcamReady] = useState(false);
  const [result, setResult] = useState({
    status: {
      opencv: false,
      detect: false,
      landmark: false,
      liveness: false,
    },
    sessions: {
      detect: null,
      landmark: null,
      liveness: null,
    },
    faceFeature: null,
    detectdFace: null,
  });

  useEffect(() => {
    startWebcam();
  }, []);

  useEffect(() => {
    if (webcamReady) {
      FaceSDK.load_opencv().then(() => {
        setResult((state) => {
          return {
            ...state,
            status: {
              ...state.status,
              opencv: true,
            },
          };
        });
        loadSDKModels();
      });
    }
  }, [webcamReady]);

  useEffect(() => {
    let intervalId = null;

    if (
      result.status.opencv &&
      result.status.detect &&
      result.status.landmark &&
      result.status.liveness
    ) {
      intervalId = setInterval(() => {
        detectFace();
      }, 1000 / fps);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [result]);

  useEffect(() => {}, [webcamReady]);

  const startWebcam = () => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: width } })
      .then((stream) => {
        let video = videoRef.current;
        video.srcObject = stream;
        video.play();
        setWebcamReady(true);
        setImageCapture(stream.getVideoTracks()[0]);
      })
      .catch((err) => {
        console.error("error:", err);
      });
  };

  const loadSDKModels = async () => {
    let detectSession = await FaceSDK.loadDetectionModel();
    let landmarkSession = await FaceSDK.loadLandmarkModel();
    let liveSession = await FaceSDK.loadLivenessModel();
    let featureSession = await FaceSDK.loadFeatureModel();

    setResult((state) => {
      return {
        ...state,
        sessions: {
          ...state.sessions,
          detect: detectSession,
          landmark: landmarkSession,
          liveness: liveSession,
          feature: featureSession,
        },
        status: {
          ...state.status,
          detect: true,
          landmark: true,
          liveness: true,
          feature: true,
        },
      };
    });
  };

  const detectFace = async () => {
    const canvasCtx = canvasRef.current.getContext("2d", {
      willReadFrequently: true,
    });

    let posX = 0,
      posY = 0;

    if (videoRef.current) {
      canvasCtx.drawImage(videoRef.current, posX, posY, width, height);
      // canvasCtx.scale(scaleH, scaleV); // Set scale to flip the image

      const detectionResult = await FaceSDK.detectFace(
        result.sessions.detect,
        "live-canvas"
      );

      if (detectionResult) {
        console.log(detectionResult.bbox, "detectionResult.bbox");
        canvasCtx.beginPath();
        FaceSDK.predictLiveness(
          result.sessions.liveness,
          "live-canvas",
          detectionResult.bbox
        ).then((liveResult) => {
          //Draw box
          let face_count = liveResult.length;

          for (let i = 0; i < face_count; i++) {
            console.log(liveResult[i][4], "score");
            let x1 = parseInt(liveResult[i][0]),
              y1 = parseInt(liveResult[i][1]),
              x2 = parseInt(liveResult[i][2]),
              y2 = parseInt(liveResult[i][3]),
              realFace = liveResult[i][4] < 0.6 ? false : true,
              width = Math.abs(x2 - x1),
              height = Math.abs(y2 - y1);

            let text = `${realFace ? "REAL" : "FAKE"} ${parseInt(
              liveResult[i][4] * 100
            )}%`;

            if (realFace) {
              setResult((state) => {
                return {
                  ...state,
                  detectdFace: detectionResult,
                };
              });
            }
            canvasCtx.strokeStyle = realFace ? "green" : "red";
            canvasCtx.fillStyle = realFace ? "green" : "red";
            canvasCtx.lineWidth = "3";
            canvasCtx.strokeRect(x1, y1, width, height);
            canvasCtx.font = "30px Verdana";
            canvasCtx.fillText(text, x1, y1 - 10);
            canvasCtx.stroke();
          }
        });
      }
    }
  };

  const captureImage = async () => {
    console.log("takeScreenshot");
    const img = new ImageCapture(imageCapture);
    const blob = await img.takePhoto();

    const points = await FaceSDK.predictLandmark(
      result.sessions.landmark,
      "live-canvas",
      result.detectdFace.bbox
    );
    const faceFeature = await FaceSDK.extractFeature(
      result.sessions.feature,
      "live-canvas",
      points
    );

    return {
      blobUrl: window.URL.createObjectURL(blob),
      faceFeature: faceFeature,
    };
  };

  useImperativeHandle(
    ref,
    () => {
      return {
        captureImage() {
          return captureImage();
        },
      };
    },
    [imageCapture, result]
  );

  return (
    <>
      <div
        className="clippingMaskCircularPath"
        style={{
          height,
          width,
        }}
      >
        <video
          ref={videoRef}
          id="live-video"
          autoPlay
          playsInline
          muted
          hidden
        />
        <canvas
          ref={canvasRef}
          id="live-canvas"
          height={height}
          width={width}
        />
      </div>
    </>
  );
};

const RealTimeLivenessDetection = forwardRef(Component);
export default RealTimeLivenessDetection;
