import {
  useRef,
  useEffect,
  useMemo,
  useLayoutEffect,
  Suspense,
  useState,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AsciiEffect } from "three-stdlib";
import { MeshStandardMaterial, DoubleSide } from "three";
import useWindowDimensions from "./useWindowDimensions";

function Model({ url }) {
  const { width } = useWindowDimensions();
  const { scene } = useGLTF(url);
  const ref = useRef();

  const customMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "black",
        metalness: 0.5,
        roughness: 0.3,
        side: DoubleSide,
      }),
    []
  );

  const isMobile = width < 700;
  const scale = isMobile ? [1.4, 1.4, 1.4] : [2, 2, 2];
  const rotation = isMobile ? [0, 0, Math.PI / 2] : [0, 0, 0];

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = customMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene, customMaterial]);

  return (
    <primitive ref={ref} object={scene} scale={scale} rotation={rotation} />
  );
}

function useGlobalMousePosition() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return mousePos;
}
function useDeviceOrientation() {
  const [orientation, setOrientation] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0,
  });

  useEffect(() => {
    const handleOrientation = (event) => {
      setOrientation({
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
      });
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () =>
      window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  return orientation;
}

function CameraController() {
  const { camera } = useThree();
  const { gamma, beta } = useDeviceOrientation();
  const mouse = useGlobalMousePosition();
  const isMobile =
    typeof window !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);

  useFrame(() => {
    if (isMobile) {
      camera.position.x += (gamma / 45 - camera.position.x) * 0.05;
      camera.position.y += (-beta / 45 - camera.position.y) * 0.05;
    } else {
      camera.position.x += (mouse.x * 2 - camera.position.x) * 0.05;
      camera.position.y += (mouse.y * 2 - camera.position.y) * 0.05;
    }
    camera.lookAt(0, 0, 0);
  });

  return null;
}
function AsciiRenderer({
  renderIndex = 1,
  characters = " .:-+*=%@#",
  bgColor = "black",
  fgColor = "white",
  invert = false,
  color = false,
  resolution = 0.175,
}) {
  // Reactive state
  const { size, gl, scene, camera } = useThree();

  // Create effect
  const effect = useMemo(() => {
    const effect = new AsciiEffect(gl, characters, {
      invert,
      color,
      resolution,
    });
    effect.domElement.style.position = "absolute";
    effect.domElement.style.top = "0px";
    effect.domElement.style.left = "0px";
    effect.domElement.style.pointerEvents = "none";
    return effect;
  }, [characters, invert, color, resolution, gl]);

  // Styling
  useLayoutEffect(() => {
    effect.domElement.style.color = fgColor;
    effect.domElement.style.backgroundColor = bgColor;
  }, [fgColor, bgColor, effect.domElement.style]);

  // Append on mount, remove on unmount
  useEffect(() => {
    gl.domElement.style.opacity = "0";
    gl.domElement.parentNode.appendChild(effect.domElement);
    return () => {
      gl.domElement.style.opacity = "1";
      gl.domElement.parentNode.removeChild(effect.domElement);
    };
  }, [effect, gl.domElement.parentNode, gl.domElement.style]);

  // Set size
  useEffect(() => {
    effect.setSize(size.width, size.height);
  }, [effect, size]);

  // Take over render-loop (that is what the index is for)
  useFrame((state) => {
    effect.render(scene, camera);
  }, renderIndex);

  // This component returns nothing, it is a purely logical
  return null;
}
export default function AsciiScene({ modelUrl }) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      <Canvas camera={{ position: [0, 0, 5] }}>
        <Suspense fallback={null}>
          <color attach="background" args={["grey"]} />
          <spotLight
            position={[10, 10, 10]}
            angle={0.45}
            penumbra={1}
            intensity={1}
          />
          <pointLight position={[-10, -10, -10]} />
          <ambientLight intensity={0.4} />
          <Model url={modelUrl} />
        </Suspense>
        <CameraController />
        <AsciiRenderer fgColor="white" bgColor="lightgrey" />
      </Canvas>
    </div>
  );
}
