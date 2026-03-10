import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeInkColors } from './themeInkColors';

const InkMaterial5 = shaderMaterial(
  { uTime: 0, uResolution: new THREE.Vector2(), uStartColor: new THREE.Color(1, 1, 1), uInkColor: new THREE.Color(0, 0, 0), uMobilePortrait: 0 },
  `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
  `
    uniform float uTime;
    uniform vec3 uStartColor;
    uniform vec3 uInkColor;
    uniform float uMobilePortrait;
    varying vec2 vUv;
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865, 0.366025403, -0.577350269, 0.024390243);
      vec2 i  = floor(v + dot(v, C.yy) ); vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
      m *= 1.792842914 - 0.8537347209 * ( a0*a0 + h*h );
      vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }
    float ridgedNoise(vec2 p) { float n=snoise(p); return 1.0 - abs(n); }
    float fbm(vec2 p) { float v=0.0, a=0.5; for(int i=0;i<4;i++){v+=a*ridgedNoise(p); p*=2.0; a*=0.5;} return v; }
    void main() {
      // Very slow time flow
      float time = uTime * 0.1;
      vec2 p = vUv;
      if (uMobilePortrait > 0.5) {
        // Rotate and flip so portrait screens inject from top -> down.
        p = vec2(1.0 - vUv.y, vUv.x);
      }
      
      // Plume expansion relies on intricate noise layering
      vec2 warpObj = vec2(snoise(p*3.0 - time), snoise(p*3.0 + time)) * 0.3;
      float plumeFbm = fbm(p * 5.0 + warpObj);
      
      vec2 warp = p + warpObj * plumeFbm;
      vec2 injectPoint = vec2(0.0, 0.5);
      
      vec2 distVec = warp - injectPoint;
      distVec.y *= 1.8; // Elliptical initial plume
      
      float d = length(distVec);
      float radius = smoothstep(0.0, 6.0, uTime) * 1.8;
      
      // Feathered gradient
      float inkIntensity = 1.0 - smoothstep(radius - 0.25, radius + 0.15, d);
      
      vec3 finalColor = mix(uStartColor, uInkColor, inkIntensity);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);
extend({ InkMaterial5 });

declare module '@react-three/fiber' {
  interface ThreeElements {
    inkMaterial5: any;
  }
}

const InkScene = ({ startVec3, inkVec3, isMobilePortrait }: { startVec3: [number, number, number]; inkVec3: [number, number, number]; isMobilePortrait: boolean }) => {
  const materialRef = useRef<any>(null);
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
      materialRef.current.uStartColor.set(startVec3[0], startVec3[1], startVec3[2]);
      materialRef.current.uInkColor.set(inkVec3[0], inkVec3[1], inkVec3[2]);
      materialRef.current.uMobilePortrait = isMobilePortrait ? 1 : 0;
    }
  });
  return <mesh><planeGeometry args={[2, 2]} />{/* @ts-ignore */}<inkMaterial5 ref={materialRef} /></mesh>;
};

export default function InkReveal5() {
  const { startVec3, inkVec3, inkHex } = useThemeInkColors();
  const [isComplete, setIsComplete] = useState(false);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);

  useEffect(() => {
    const updateOrientation = () => {
      setIsMobilePortrait(window.innerHeight > window.innerWidth);
    };
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  useEffect(() => {
    if (!canvasEl || isComplete) return;

    const MIN_RUNTIME_BEFORE_SWITCH_SECONDS = 4.5;
    const COVERAGE_CHECK_EVERY_MS = 200;
    const REQUIRED_COVERAGE_PASSES = 4;
    const INK_RATIO_THRESHOLD = 0.992;

    let startMs = 0;
    const probeCanvas = document.createElement('canvas');
    probeCanvas.width = 64;
    probeCanvas.height = 36;
    const probeCtx = probeCanvas.getContext('2d', { willReadFrequently: true });

    let lastCoverageCheckMs = 0;
    let coveragePasses = 0;
    let raf = 0;

    const targetR = Math.round(inkVec3[0] * 255);
    const targetG = Math.round(inkVec3[1] * 255);
    const targetB = Math.round(inkVec3[2] * 255);
    const CHANNEL_TOLERANCE = 14;

    const isFrameFullyBlackEnough = () => {
      if (!probeCtx) return false;
      if (canvasEl.width < 4 || canvasEl.height < 4) return false;
      probeCtx.drawImage(canvasEl, 0, 0, probeCanvas.width, probeCanvas.height);
      const pixels = probeCtx.getImageData(0, 0, probeCanvas.width, probeCanvas.height).data;
      const pixelCount = probeCanvas.width * probeCanvas.height;
      let inkPixels = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        if (
          Math.abs(pixels[i] - targetR) <= CHANNEL_TOLERANCE &&
          Math.abs(pixels[i + 1] - targetG) <= CHANNEL_TOLERANCE &&
          Math.abs(pixels[i + 2] - targetB) <= CHANNEL_TOLERANCE
        ) {
          inkPixels++;
        }
      }

      return inkPixels / pixelCount >= INK_RATIO_THRESHOLD;
    };

    const tick = () => {
      const now = performance.now();
      if (startMs === 0) {
        if (canvasEl.width < 4 || canvasEl.height < 4) {
          raf = requestAnimationFrame(tick);
          return;
        }
        startMs = now;
      }
      const elapsed = (now - startMs) / 1000;

      if (elapsed >= MIN_RUNTIME_BEFORE_SWITCH_SECONDS && now - lastCoverageCheckMs >= COVERAGE_CHECK_EVERY_MS) {
        lastCoverageCheckMs = now;
        if (isFrameFullyBlackEnough()) {
          coveragePasses++;
          if (coveragePasses >= REQUIRED_COVERAGE_PASSES) {
            setIsComplete(true);
            return;
          }
        } else {
          coveragePasses = 0;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [canvasEl, isComplete, inkVec3]);

  if (isComplete) {
    return <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: inkHex }} />;
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', zIndex: -1 }}>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1], zoom: 1 }}
        onCreated={(state) => setCanvasEl(state.gl.domElement)}
      >
        <InkScene startVec3={startVec3} inkVec3={inkVec3} isMobilePortrait={isMobilePortrait} />
      </Canvas>
    </div>
  );
}