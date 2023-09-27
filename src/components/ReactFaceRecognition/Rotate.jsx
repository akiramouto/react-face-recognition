/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as FaceSDK from "./ReactFaceRecognitionSDK";
import "./ReactFaceRecognition.css";

const ReactFaceRecognition = ({ width, height, onLoad, fps = 60 }) => {
  let videoRef = useRef();
  let canvasRef = useRef();

  // const { loaded, cv } = useOpenCv();
  const [webcamReady, setWebcamReady] = useState(false);
  const [result, setResult] = useState({
    status: {
      opencv: false,
      detect: false,
      landmark: false,
      liveness: false,
      pose: false,
    },
    sessions: {
      detect: null,
      landmark: null,
      liveness: null,
      pose: null,
    },
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
    if (onLoad) {
      onLoad(result);
    }

    let intervalId = setInterval(() => {
      if (
        result.status.opencv &&
        result.status.detect &&
        result.status.landmark &&
        result.status.liveness
      ) {
        detectFace();
      }
    }, 1000 / fps);

    return () => {
      clearInterval(intervalId);
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
      })
      .catch((err) => {
        console.error("error:", err);
      });
  };

  const loadSDKModels = async () => {
    let detectSession = await FaceSDK.loadDetectionModel();
    let landmarkSession = await FaceSDK.loadLandmarkModel();
    let liveSession = await FaceSDK.loadLivenessModel();
    let poseSession = await FaceSDK.loadPoseModel();

    setResult((state) => {
      return {
        ...state,
        sessions: {
          ...state.sessions,
          detect: detectSession,
          landmark: landmarkSession,
          liveness: liveSession,
          pose: poseSession,
        },
        status: {
          ...state.status,
          detect: true,
          landmark: true,
          liveness: true,
          pose: true,
        },
      };
    });
  };

  const detectFace = async () => {
    const canvasCtx = canvasRef.current.getContext("2d", {
      willReadFrequently: true,
    });

    let scaleH = -1,
      scaleV = 1,
      posX = width * -1,
      posY = 0;

    canvasCtx.drawImage(videoRef.current, posX, posY, width, height);
    canvasCtx.scale(scaleH, scaleV); // Set scale to flip the image

    const detectionResult = await FaceSDK.detectFace(
      result.sessions.detect,
      "live-canvas"
    );
    let bbox = detectionResult.bbox;

    if (detectionResult) {
      // const poseResult = await FaceSDK.predictPose(
      //   result.sessions.pose,
      //   "live-canvas",
      //   detectionResult.bbox
      // );

      // let face_count_pose = poseResult.length;
      // for (let i = 0; i < face_count_pose; i++) {
      //   let x1 = parseInt(poseResult[i][0]),
      //     y1 = parseInt(poseResult[i][1]),
      //     x2 = parseInt(poseResult[i][2]),
      //     y2 = parseInt(poseResult[i][3]),
      //     width = Math.abs(x2 - x1),
      //     height = Math.abs(y2 - y1);

      //   canvasCtx.strokeStyle = "red";
      //   canvasCtx.fillStyle = "blue";
      //   canvasCtx.strokeRect(x1, y1, width, height);
      //   canvasCtx.font = "10px Verdana";
      //   canvasCtx.fillText(
      //     "Yaw: " +
      //       poseResult[i][4] +
      //       " Pitch: " +
      //       poseResult[i][5] +
      //       " Roll: " +
      //       poseResult[i][6],
      //     x1,
      //     y1 - 10
      //   );
      //   canvasCtx.stroke();
      // }

      FaceSDK.predictLiveness(
        result.sessions.liveness,
        "live-canvas",
        bbox
      ).then((liveResult) => {
        canvasCtx.beginPath();

        let face_count = liveResult.length;

        for (let i = 0; i < face_count; i++) {
          let x1 = parseInt(liveResult[i][0]),
            y1 = parseInt(liveResult[i][1]),
            x2 = parseInt(liveResult[i][2]),
            y2 = parseInt(liveResult[i][3]),
            realFace = liveResult[i][4] < 0.3 ? false : true,
            width = Math.abs(x2 - x1),
            height = Math.abs(y2 - y1);

          let text = realFace ? "REAL" : "FAKE";
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
  };

  return (
    <>
      <div
        className="clippingMaskCircularPath"
        style={{
          height,
          width,
        }}
      >
        <img
          src="https://www.faceplugin.com/assets/Exclude-video-clip.b4773df0.svg"
          height={height}
          width={width}
        />
        <svg
          viewBox="0 0 200 200"
          height={height}
          width={width}
          style={{
            position: "absolute",
            paddingTop: "10px",
            paddingNottom: "10px",
          }}
        >
          <g>
            <circle
              cx="100"
              cy="100"
              r="90"
              stroke="lightgrey"
              strokeWidth="20"
              fill="none"
              strokeDasharray="4.71238898038469,4.71238898038469"
            ></circle>
            <path
              d="M190 100 A90 90 0 0 1 190 100"
              fill="none"
              stroke="#008744"
              strokeWidth="20"
              strokeDasharray="4.71238898038469,4.71238898038469"
            ></path>
          </g>
          <text
            fill="currentColor"
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
          ></text>
        </svg>
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

ReactFaceRecognition.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  onLoad: PropTypes.func,
  fps: PropTypes.number,
};

export default ReactFaceRecognition;
