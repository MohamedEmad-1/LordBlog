import React, { useRef } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const InkMaterial5 = shaderMaterial(
  { uTime: 0, uResolution: new THREE.Vector2() },
  `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
  `
    uniform float uTime; varying vec2 vUv;
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
      
      // Plume expansion relies on intricate noise layering
      vec2 warpObj = vec2(snoise(vUv*3.0 - time), snoise(vUv*3.0 + time)) * 0.3;
      float plumeFbm = fbm(vUv * 5.0 + warpObj);
      
      vec2 warp = vUv + warpObj * plumeFbm;
      vec2 injectPoint = vec2(0.0, 0.5);
      
      vec2 distVec = warp - injectPoint;
      distVec.y *= 1.8; // Elliptical initial plume
      
      float d = length(distVec);
      float radius = smoothstep(0.0, 6.0, uTime) * 1.8;
      
      // Feathered gradient
      float inkIntensity = 1.0 - smoothstep(radius - 0.25, radius + 0.15, d);
      
      vec3 finalColor = mix(vec3(1.0), vec3(0.04), inkIntensity);
      
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

const InkScene = () => {
  const materialRef = useRef<any>(null);
  useFrame((state) => { if (materialRef.current) materialRef.current.uTime = state.clock.elapsedTime; });
  return <mesh><planeGeometry args={[2, 2]} />{/* @ts-ignore */}<inkMaterial5 ref={materialRef} /></mesh>;
};

export default function InkReveal5() { return <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}><Canvas orthographic camera={{ position: [0, 0, 1], zoom: 1 }}><InkScene /></Canvas></div>; }