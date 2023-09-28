import * as faceapi from "@vladmandic/face-api/dist/face-api.esm.js";
import * as FaceSDK from "./ReactFaceRecognitionSDK";
import "./ReactFaceRecognition.css";
import { useEffect, useRef, forwardRef, useState } from "react";
import ndarray from "ndarray";

const modelPath = "/face_api_models";

const Component = () => {
  let videoRef = useRef();
  let videoCanvasRef = useRef();
  let canvasRef = useRef();

  const [init, setInit] = useState(false);
  const [cameraReady, setcameraReady] = useState(false);
  const [livenessSession, setLivenessSession] = useState(null);
  const [detectBbox, setDetectBbox] = useState(null);
  const [detectBox, setDetectBox] = useState(null);
  const [detectedFace, setDetectedFace] = useState(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    setInit(true);
  }, []);

  useEffect(() => {
    if (init) {
      FaceSDK.load_opencv().then(() => {
        loadSDKModels().then(() => setupCamera());
      });
    }
  }, [init]);

  useEffect(() => {
    let intervalId = null;

    if (cameraReady) {
      intervalId = setInterval(() => {
        renderVideoCanvas();
      }, 1000 / 60);

      detectFaces();
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [cameraReady]);

  const loadSDKModels = async () => {
    console.log("INIT SDK ");
    let liveSession = await FaceSDK.loadLivenessModel();
    setLivenessSession(liveSession);

    faceapi.tf.setBackend("webgl");
    faceapi.tf.ready();

    if (faceapi.tf?.env().flagRegistry.CANVAS2D_WILL_READ_FREQUENTLY)
      faceapi.tf.env().set("CANVAS2D_WILL_READ_FREQUENTLY", true);
    if (faceapi.tf?.env().flagRegistry.WEBGL_EXP_CONV)
      faceapi.tf.env().set("WEBGL_EXP_CONV", true);
    if (faceapi.tf?.env().flagRegistry.WEBGL_EXP_CONV)
      faceapi.tf.env().set("WEBGL_EXP_CONV", true);

    return Promise.all([
      console.log("Models loading"),
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
      faceapi.nets.ageGenderNet.loadFromUri(modelPath),

      faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
      faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
    ]);
  };

  const setupCamera = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return null;

    console.log("Setting up camera");
    // setup webcam. note that navigator.mediaDevices requires that page is accessed via https
    if (!navigator.mediaDevices) {
      console.log("Camera Error: access not supported");
      return null;
    }

    const constraints = {
      audio: false,
      video: { facingMode: "user", resizeMode: "crop-and-scale" },
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        let video = videoRef.current;
        if (stream) {
          video.srcObject = stream;
          let { width, height } = stream.getTracks()[0].getSettings();
          setWidth(width);
          setHeight(height);
        } else {
          console.log("Camera Error: stream empty");
          return null;
        }
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        if (settings.deviceId) delete settings.deviceId;
        if (settings.groupId) delete settings.groupId;
        if (settings.aspectRatio)
          settings.aspectRatio = Math.trunc(100 * settings.aspectRatio) / 100;
        console.log(`Camera active: ${track.label}`);
        console.log(`Camera settings: ${JSON.stringify(settings)}`);

        video.onloadeddata = async () => {
          video.play();
          // detectVideo(video, canvas);
          console.log("Camera Ready");
          setcameraReady(true);
        };
      })
      .catch((err) => {
        if (
          err.name === "PermissionDeniedError" ||
          err.name === "NotAllowedError"
        )
          console.log(
            `Camera Error: camera permission denied: ${err.message || err}`
          );
        if (err.name === "SourceUnavailableError")
          console.log(
            `Camera Error: camera not available: ${err.message || err}`
          );
      });
  };

  const renderVideoCanvas = () => {
    const canvasCtx = videoCanvasRef.current.getContext("2d", {
      willReadFrequently: true,
    });

    if (videoRef.current) {
      canvasCtx.drawImage(videoRef.current, 0, 0, width, height);
    }

    return canvasCtx;
  };

  const detectFaces = () => {
    let detectFaceAnimation = null;
    cancelAnimationFrame(detectFaceAnimation);

    const t0 = performance.now();
    faceapi
      .detectAllFaces(videoRef.current)
      // .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender()
      // .withFaceDescriptor()
      .withFaceDescriptors()

      .then(async (results) => {
        const fps = 1000 / (performance.now() - t0);
        const ctx = canvasRef.current.getContext("2d", {
          willReadFrequently: true,
        });
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (results.length > 0) {
          for (let index in results) {
            let result = results[index];
            let result_bbox = ndarray(new Float32Array(1 * 4), [1, 4]);

            let x1 = result.detection.box.x;
            let y1 = result.detection.box.y;
            let x2 = result.detection.box.right;
            let y2 = result.detection.box.bottom;

            result_bbox.set(index, 0, x1);
            result_bbox.set(index, 1, y1);
            result_bbox.set(index, 2, x2);
            result_bbox.set(index, 3, y2);
            setDetectBbox(result_bbox);
            setDetectBox(result.detection.box);
            setDetectedFace(result);
            drawFaces(ctx, result, fps, result_bbox);
          }
        } else {
          setDetectBbox(null);
          setDetectBox(null);
          setDetectedFace(null);
        }
        detectFaceAnimation = requestAnimationFrame(detectFaces);
      })
      .catch((err) => {
        cancelAnimationFrame(detectFaceAnimation);
        console.log(`Detect Error: ${err}`);
      });
  };

  const detectOneFace = () => {
    let detectFaceAnimation = null;
    cancelAnimationFrame(detectFaceAnimation);

    const t0 = performance.now();
    faceapi
      .detectAllFaces(videoRef.current)
      // .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender()
      // .withFaceDescriptor()
      .withFaceDescriptors()

      .then(async (results) => {
        const fps = 1000 / (performance.now() - t0);
        const ctx = canvasRef.current.getContext("2d", {
          willReadFrequently: true,
        });
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (result?.detection) {
          let result_bbox = ndarray(new Float32Array(1 * 4), [1, 4]);

          let x1 = result.detection.box.x;
          let y1 = result.detection.box.y;
          let x2 = result.detection.box.right;
          let y2 = result.detection.box.bottom;

          result_bbox.set(0, 0, x1);
          result_bbox.set(0, 1, y1);
          result_bbox.set(0, 2, x2);
          result_bbox.set(0, 3, y2);
          setDetectBbox(result_bbox);
          setDetectBox(result.detection.box);
          setDetectedFace(result);
          drawFace(ctx, result, fps, result_bbox);
        } else {
          setDetectBbox(null);
          setDetectBox(null);
          setDetectedFace(null);
        }
        detectFaceAnimation = requestAnimationFrame(detectFaces);
      })
      .catch((err) => {
        cancelAnimationFrame(detectFaceAnimation);
        console.log(`Detect Error: ${err}`);
      });
  };

  const drawLivenessLabel = (ctx, liveness, percent) => {
    ctx.font = 'small-caps 20px "Segoe UI"';
    ctx.fillStyle = liveness ? "green" : "red";
    ctx.beginPath();
    ctx.fillText(
      `LIVENESS: ${percent}% (${liveness ? "real" : "fake"})`,
      10,
      25
    );
  };

  const drawFaces = (ctx, person, fps, bbox) => {
    drawBoxs(ctx, person);
    drawLabels(ctx, person);
  };

  const drawFace = (ctx, person, fps, bbox) => {
    drawBox(ctx, person);

    FaceSDK.predictLiveness(livenessSession, "live-canvas", bbox).then(
      (liveResult) => {
        let face_count = liveResult.length;
        if (face_count) {
          const realFace = liveResult[0][4] < 0.6 ? false : true;

          drawLivenessLabel(ctx, realFace, parseInt(liveResult[0][4] * 100));
        } else {
          console.log("NO FACE", liveResult);
        }
      }
    );
    drawLabel(ctx, person);
  };

  const drawLabels = (ctx, person) => {
    ctx.font = 'small-caps 20px "Segoe UI"';
    ctx.fillStyle = "white";

    let breakLinePosition = 25;

    ctx.beginPath();
    // draw text labels
    const expression = Object.entries(person.expressions).sort(
      (a, b) => b[1] - a[1]
    );

    ctx.fillText(
      `GENDER: ${Math.round(100 * person.genderProbability)}% ${person.gender}`,
      person.detection.box.x,
      person.detection.box.y - 59
    );
    ctx.fillText(
      `expression: ${Math.round(100 * expression[0][1])}% ${expression[0][0]}`,
      person.detection.box.x,
      person.detection.box.y - 41
    );
    ctx.fillText(
      `age: ${Math.round(person.age)} years`,
      person.detection.box.x,
      person.detection.box.y - 23
    );
    ctx.fillText(
      `roll:${person.angle.roll}° pitch:${person.angle.pitch}° yaw:${person.angle.yaw}°`,
      person.detection.box.x,
      person.detection.box.y - 5
    );
  };

  const drawLabel = (ctx, person) => {
    ctx.font = 'small-caps 20px "Segoe UI"';
    ctx.fillStyle = "white";

    let breakLinePosition = 25;

    ctx.beginPath();
    // draw text labels
    const expression = Object.entries(person.expressions).sort(
      (a, b) => b[1] - a[1]
    );

    ctx.fillText(
      `GENDER: ${Math.round(100 * person.genderProbability)}% ${person.gender}`,
      10,
      (breakLinePosition += 25)
    );
    ctx.fillText(
      `expression: ${Math.round(100 * expression[0][1])}% ${expression[0][0]}`,
      10,
      (breakLinePosition += 25)
    );
    ctx.fillText(
      `age: ${Math.round(person.age)} years`,
      10,
      (breakLinePosition += 25)
    );
    ctx.fillText(
      `roll:${person.angle.roll}° pitch:${person.angle.pitch}° yaw:${person.angle.yaw}°`,
      10,
      (breakLinePosition += 25)
    );
  };

  const drawFps = (ctx, fps) => {
    ctx.font = 'small-caps 20px "Segoe UI"';
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.fillText(`FPS: ${fps}`, 10, 25);
  };

  const drawBox = (ctx, person) => {
    if (!ctx) return;
    // draw box around each face
    ctx.lineWidth = 6;
    ctx.strokeStyle = "blue";
    ctx.fillStyle = "blue";
    ctx.globalAlpha = 0.6;
    ctx.beginPath();

    // Sudut Kiri Bawah
    ctx.moveTo(
      person.detection.box.topLeft.x,
      person.detection.box.topLeft.y + person.detection.box.height - 50
    );
    ctx.lineTo(
      person.detection.box.bottomLeft.x,
      person.detection.box.bottomLeft.y
    );

    ctx.moveTo(
      person.detection.box.bottomRight.x - person.detection.box.width + 50,
      person.detection.box.bottomRight.y
    );
    ctx.lineTo(
      person.detection.box.bottomLeft.x,
      person.detection.box.bottomLeft.y
    );

    // Sudut Kiri Atas
    ctx.moveTo(
      person.detection.box.bottomLeft.x,
      person.detection.box.bottomLeft.y - person.detection.box.height + 50
    );
    ctx.lineTo(person.detection.box.topLeft.x, person.detection.box.topLeft.y);

    ctx.moveTo(
      person.detection.box.topRight.x - person.detection.box.width + 50,
      person.detection.box.topRight.y
    );
    ctx.lineTo(person.detection.box.topLeft.x, person.detection.box.topLeft.y);

    // Sudut Kanan Atas
    ctx.moveTo(
      person.detection.box.bottomRight.x,
      person.detection.box.bottomRight.y - person.detection.box.height + 50
    );
    ctx.lineTo(
      person.detection.box.topRight.x,
      person.detection.box.topRight.y
    );

    ctx.moveTo(
      person.detection.box.topLeft.x + person.detection.box.width - 50,
      person.detection.box.topLeft.y
    );
    ctx.lineTo(
      person.detection.box.topRight.x,
      person.detection.box.topRight.y
    );

    // Sudut Kanan Bawah
    ctx.moveTo(
      person.detection.box.topRight.x,
      person.detection.box.topRight.y + person.detection.box.height - 50
    );
    ctx.lineTo(
      person.detection.box.bottomRight.x,
      person.detection.box.bottomRight.y
    );

    ctx.moveTo(
      person.detection.box.bottomLeft.x + person.detection.box.width - 50,
      person.detection.box.bottomLeft.y
    );
    ctx.lineTo(
      person.detection.box.bottomRight.x,
      person.detection.box.bottomRight.y
    );

    // Draw the Path
    ctx.stroke();
  };

  const drawBoxs = (ctx, person) => {
    ctx.lineWidth = 3;
    ctx.strokeStyle = "blue";
    ctx.fillStyle = "blue";
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.rect(
      person.detection.box.x,
      person.detection.box.y,
      person.detection.box.width,
      person.detection.box.height
    );
    ctx.stroke();
  };

  const checkLiveness = async () => {
    if (detectBbox) {
      // const canvas = videoCanvasRef.current;
      // let ctx = canvas.getContext("2d");

      const liveResult = await FaceSDK.predictLiveness(
        livenessSession,
        "live-canvas",
        detectBbox
      );

      let face_count = liveResult.length;
      if (face_count) {
        const realFace = liveResult[0][4] < 0.6 ? false : true;
        let text = `${realFace ? "REAL" : "FAKE"} ${parseInt(
          liveResult[0][4] * 100
        )}%`;
        console.log(text);
      } else {
        console.log("NO FACE", liveResult);
      }
    } else {
      console.log("NO FACE DETECTION");
    }
  };

  return (
    <>
      <div>
        <div className="clippingMaskCircularPath">
          <video
            ref={videoRef}
            id="live-video"
            autoPlay
            playsInline
            muted
            style={{
              position: "absolute",
              top: "10px",
            }}
          />
          <canvas
            ref={videoCanvasRef}
            id="live-canvas"
            height={height}
            width={width}
            style={{
              display: "none",
            }}
          />

          <canvas
            ref={canvasRef}
            id="detection-canvas"
            height={height}
            width={width}
            style={{
              position: "absolute",
              top: "10px",
            }}
          />
        </div>
      </div>
      {/* <button onClick={checkLiveness}>Check Liveness</button> */}
    </>
  );
};

const FaceRecognition = forwardRef(Component);
export default FaceRecognition;
