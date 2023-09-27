import { useRef, useState } from "react";
import {
  FaceRecognition,
  RealTimeLivenessDetection,
} from "./components/ReactFaceRecognition";
import { useEffect } from "react";

function App() {
  const RealTimeLivenessDetectionRef = useRef();
  const [faceCaptured, setFaceCaptured] = useState(null);

  useEffect(() => {
    console.log(faceCaptured, "faceCaptured");
  }, [faceCaptured]);

  const captureImage = async () => {
    const captured = await RealTimeLivenessDetectionRef.current.captureImage();
    setFaceCaptured(captured);
  };
  return (
    <>
      <FaceRecognition
        ref={RealTimeLivenessDetectionRef}
        height={480}
        width={640}
      />
    </>
  );
}

export default App;
