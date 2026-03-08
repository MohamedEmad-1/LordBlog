// Similar to 1, but with thicker gold threads and slower ink flow
import React, { useRef } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const InkMaterial2 = shaderMaterial(
  { uTime: 0, uResolution: new THREE.Vector2() },
  `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
  `
    uniform float uTime;
    varying vec2 vUv;
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865, 0.366025403, -0.577350269, 0.024390243);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
      m *= 1.792842914 - 0.8537347209 * ( a0*a0 + h*h );
      vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }
    float ridgedNoise(vec2 p) { return 1.0 - abs(snoise(p)); }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i=0; i<3; i++) { v += a * ridgedNoise(p); p = p * 2.5; a *= 0.5; }
      return v;
    }
    void main() {
      float t = uTime * 0.4;
      vec2 p = vUv;
      
      // Swirling circular droplets effect (Vortex field)
      float angle = snoise(p * 2.0 + t) * 3.1415 * 2.0;
      vec2 vortex = vec2(cos(angle), sin(angle)) * min(uTime*0.15, 0.5);
      vec2 wp = p + vortex;

      vec2 center = vec2(0.0, 0.5);
      float radius = smoothstep(0.0, 4.0, uTime) * 2.2;
      
      // Fast horizontal jet that widely expans
      vec2 distVec = wp - center;
      distVec.y *= mix(8.0, 1.0, clamp(uTime*0.4, 0.0, 1.0)); // Starts extremely thin horizontally
      
      float d = length(distVec);
      
      // Cellular rippling on edges creating distinct trailing circles
      float ripple = fbm(wp * 10.0 - t*2.0) * 0.15;
      float inkIntensity = 1.0 - smoothstep(radius - 0.2 + ripple, radius + 0.1, d);
      
      vec3 finalColor = mix(vec3(1.0), vec3(0.01), inkIntensity);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);
extend({ InkMaterial2 });

declare module '@react-three/fiber' {
  interface ThreeElements {
    inkMaterial2: any;
  }
}

const InkScene = () => {
  const materialRef = useRef<any>(null);
  useFrame((state) => {
    if (materialRef.current) materialRef.current.uTime = state.clock.elapsedTime;
  });
  return <mesh><planeGeometry args={[2, 2]} />{/* @ts-ignore */}<inkMaterial2 ref={materialRef} /></mesh>;
};

export default function InkReveal2() { return <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}><Canvas orthographic camera={{ position: [0, 0, 1], zoom: 1 }}><InkScene /></Canvas></div>; }
