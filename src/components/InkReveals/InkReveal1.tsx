import React, { useRef } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const InkMaterial = shaderMaterial(
  { uTime: 0, uResolution: new THREE.Vector2() },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    varying vec2 vUv;
    
    // Simplex 2D noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    float ridgedNoise(vec2 p) {
      float n = snoise(p);
      return 1.0 - abs(n);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i=0; i<4; i++) {
        v += a * ridgedNoise(p);
        p = p * 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      float t = uTime * 0.5;
      vec2 p = vUv;
      
      // Syringe Stem: Hard narrow line shooting from left to right
      float stem = 1.0 - smoothstep(0.005, 0.02, abs(p.y - 0.5 + snoise(p * 5.0 - t)*0.02));
      float stemCutoff = smoothstep(t * 1.5, t * 1.5 - 0.1, p.x); // advances rightwards
      stem *= stemCutoff;
      
      // Swirling expanding blob
      float blobX = smoothstep(0.0, 2.0, uTime) * 0.7; 
      vec2 blobCenter = vec2(blobX, 0.5);
      
      // Massive fractal curling simulating water viscosity
      vec2 warpObj = vec2(fbm(p * 3.0 + t*0.5), fbm(p * 3.0 - t*0.5 + 10.0));
      vec2 warpedP = p + (warpObj - 0.5) * (0.1 + uTime * 0.15); // Displaces expanding circle
      
      float d = length(warpedP - blobCenter);
      float radius = smoothstep(0.0, 4.0, uTime) * 1.8;
      
      // Outer soft blob + hard inner threshold
      float blob = 1.0 - smoothstep(radius - 0.4, radius, d);
      
      float inkIntensity = clamp(stem + blob, 0.0, 1.0);
      
      vec3 finalColor = mix(vec3(1.0), vec3(0.0), inkIntensity);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);
extend({ InkMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    inkMaterial: any;
  }
}

const InkScene = () => {
  const materialRef = useRef<any>(null);
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
      materialRef.current.uResolution.set(state.viewport.width, state.viewport.height);
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      {/* @ts-ignore */}
      <inkMaterial ref={materialRef} depthWrite={false} depthTest={false} transparent />
    </mesh>
  );
};

export default function InkReveal1() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}>
      <Canvas orthographic camera={{ position: [0, 0, 1], zoom: 1 }}>
        <InkScene />
      </Canvas>
    </div>
  );
}
