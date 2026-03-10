import React, { useEffect, useRef, useState } from 'react';
import { useThemeInkColors } from './themeInkColors';

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export default function InkReveal3() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const { startVec3, inkVec3, inkHex } = useThemeInkColors();

  // Hardcoded constants for optimal smoke reveal
  const SIM_RESOLUTION = 128;
  const DYE_RESOLUTION = 1024;
  const DENSITY_DISSIPATION = 0.0;
  const VELOCITY_DISSIPATION = 0.0;
  const PRESSURE = 0.2;
  const PRESSURE_ITERATIONS = 20;
  const CURL = 20.0; // High curl for smoke
  const SPLAT_RADIUS = 0.8;
  const SPLAT_FORCE = 6000;
  const SHADING = false;

  // Sequence timing controls (seconds). Edit these to tune reveal pacing.
  const WAIT_AFTER_LEFT = 0.5;
  const WAIT_AFTER_TOP_LEFT = 0.5;
  const SHARED_BURST_DURATION = 0.9;
  const SHARED_WOBBLE = 0.05;
  const SHARED_FORCE_X = 80.0;
  const SHARED_FORCE_Y = 25.0;

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
    if (isComplete) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let config = {
      SIM_RESOLUTION,
      DYE_RESOLUTION,
      DENSITY_DISSIPATION,
      VELOCITY_DISSIPATION,
      PRESSURE,
      PRESSURE_ITERATIONS,
      CURL,
      SPLAT_RADIUS,
      SPLAT_FORCE,
      SHADING
    };

    const { gl, ext } = getWebGLContext(canvas);
    if (!gl || !ext) return;

    if (!ext.supportLinearFiltering) {
      config.DYE_RESOLUTION = 256;
      config.SHADING = false;
    }

    function getWebGLContext(canvas: HTMLCanvasElement) {
      const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
      let gl = canvas.getContext('webgl2', params) as WebGL2RenderingContext | null;
      if (!gl) {
        gl = (canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params)) as WebGL2RenderingContext | null;
      }
      if (!gl) throw new Error('Unable to initialize WebGL.');

      const isWebGL2 = 'drawBuffers' in gl;
      let supportLinearFiltering = false;
      let halfFloat = null;

      if (isWebGL2) {
        (gl as WebGL2RenderingContext).getExtension('EXT_color_buffer_float');
        supportLinearFiltering = !!(gl as WebGL2RenderingContext).getExtension('OES_texture_float_linear');
      } else {
        halfFloat = gl.getExtension('OES_texture_half_float');
        supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear');
      }

      gl.clearColor(0, 0, 0, 0);

      const halfFloatTexType = isWebGL2 ? (gl as WebGL2RenderingContext).HALF_FLOAT : (halfFloat && (halfFloat as any).HALF_FLOAT_OES) || 0;
      let formatRGBA: any;
      let formatRG: any;
      let formatR: any;

      if (isWebGL2) {
        formatRGBA = getSupportedFormat(gl, (gl as WebGL2RenderingContext).RGBA16F, gl.RGBA, halfFloatTexType);
        formatRG = getSupportedFormat(gl, (gl as WebGL2RenderingContext).RG16F, (gl as WebGL2RenderingContext).RG, halfFloatTexType);
        formatR = getSupportedFormat(gl, (gl as WebGL2RenderingContext).R16F, (gl as WebGL2RenderingContext).RED, halfFloatTexType);
      } else {
        formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      }

      return {
        gl,
        ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering }
      };
    }

    function getSupportedFormat(gl: any, internalFormat: number, format: number, type: number): any {
      if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
        if ('drawBuffers' in gl) {
          const gl2 = gl as WebGL2RenderingContext;
          switch (internalFormat) {
            case gl2.R16F: return getSupportedFormat(gl2, gl2.RG16F, gl2.RG, type);
            case gl2.RG16F: return getSupportedFormat(gl2, gl2.RGBA16F, gl2.RGBA, type);
            default: return null;
          }
        }
        return null;
      }
      return { internalFormat, format };
    }

    function supportRenderTextureFormat(gl: any, internalFormat: number, format: number, type: number) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      return status === gl.FRAMEBUFFER_COMPLETE;
    }

    function compileShader(type: number, source: string, keywords: string[] | null = null): WebGLShader | null {
      let shaderSource = keywords ? keywords.map(k => `#define ${k}\n`).join('') + source : source;
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, shaderSource);
      gl!.compileShader(shader);
      return shader;
    }

    function createProgram(vertexShader: WebGLShader | null, fragmentShader: WebGLShader | null): WebGLProgram | null {
      const program = gl!.createProgram();
      if (!program) return null;
      gl!.attachShader(program, vertexShader!);
      gl!.attachShader(program, fragmentShader!);
      gl!.linkProgram(program);
      return program;
    }

    function getUniforms(program: WebGLProgram) {
      let uniforms: any = {};
      const uniformCount = gl!.getProgramParameter(program, gl!.ACTIVE_UNIFORMS);
      for (let i = 0; i < uniformCount; i++) {
        const uniformInfo = gl!.getActiveUniform(program, i);
        if (uniformInfo) uniforms[uniformInfo.name] = gl!.getUniformLocation(program, uniformInfo.name);
      }
      return uniforms;
    }

    class Program {
      program: WebGLProgram | null;
      uniforms: any;
      constructor(vertexShader: WebGLShader | null, fragmentShader: WebGLShader | null) {
        this.program = createProgram(vertexShader, fragmentShader);
        this.uniforms = this.program ? getUniforms(this.program) : {};
      }
      bind() { if (this.program) gl!.useProgram(this.program); }
    }

    class Material {
      vertexShader: WebGLShader | null;
      fragmentShaderSource: string;
      programs: any = {};
      activeProgram: WebGLProgram | null = null;
      uniforms: any = {};

      constructor(vertexShader: WebGLShader | null, fragmentShaderSource: string) {
        this.vertexShader = vertexShader;
        this.fragmentShaderSource = fragmentShaderSource;
      }

      setKeywords(keywords: string[]) {
        let hash = keywords.join('|');
        if (!this.programs[hash]) {
          const fs = compileShader(gl!.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
          this.programs[hash] = createProgram(this.vertexShader, fs);
        }
        this.activeProgram = this.programs[hash];
        if (this.activeProgram) this.uniforms = getUniforms(this.activeProgram);
      }

      bind() { if (this.activeProgram) gl!.useProgram(this.activeProgram); }
    }

    const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
      uniform vec2 texelSize;
      void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `);

    const copyShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv; uniform sampler2D uTexture;
      void main () { gl_FragColor = texture2D(uTexture, vUv); }
    `);

    const clearShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;
      void main () { gl_FragColor = value * texture2D(uTexture, vUv); }
    `);

    // MODIFIED FOR BLACK ON WHITE RENDERING
    const displayShaderSource = `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform vec3 uStartColor;
      uniform vec3 uInkColor;
      void main () {
          vec3 c = texture2D(uTexture, vUv).rgb;
          float density = max(c.r, max(c.g, c.b));

          vec3 finalColor = mix(uStartColor, uInkColor, clamp(density, 0.0, 1.0));
          gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const splatShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio;
      uniform vec3 color; uniform vec2 point; uniform float radius;
      void main () {
          vec2 p = vUv - point.xy; p.x *= aspectRatio;
          vec3 splat = exp(-dot(p, p) / radius) * color;
          vec3 base = texture2D(uTarget, vUv).xyz;
          gl_FragColor = vec4(base + splat, 1.0);
      }
    `);

    const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv; uniform sampler2D uVelocity; uniform sampler2D uSource;
      uniform vec2 texelSize; uniform vec2 dyeTexelSize; uniform float dt; uniform float dissipation;
      void main () {
          vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
          vec4 result = texture2D(uSource, coord);
          float decay = 1.0 + dissipation * dt;
          gl_FragColor = result / decay;
      }
    `);

    const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
          float L = texture2D(uVelocity, vL).x; float R = texture2D(uVelocity, vR).x;
          float T = texture2D(uVelocity, vT).y; float B = texture2D(uVelocity, vB).y;
          vec2 C = texture2D(uVelocity, vUv).xy;
          if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;
          if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
          gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
      }
    `);

    const curlShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
          float L = texture2D(uVelocity, vL).y; float R = texture2D(uVelocity, vR).y;
          float T = texture2D(uVelocity, vT).x; float B = texture2D(uVelocity, vB).x;
          gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
      }
    `);

    const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
      uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
      void main () {
          float L = texture2D(uCurl, vL).x; float R = texture2D(uCurl, vR).x;
          float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x;
          float C = texture2D(uCurl, vUv).x;
          vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
          force /= length(force) + 0.0001; force *= curl * C; force.y *= -1.0;
          vec2 velocity = texture2D(uVelocity, vUv).xy + force * dt;
          gl_FragColor = vec4(min(max(velocity, -1000.0), 1000.0), 0.0, 1.0);
      }
    `);

    const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
      uniform sampler2D uPressure; uniform sampler2D uDivergence;
      void main () {
          float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
          float divergence = texture2D(uDivergence, vUv).x;
          gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
      }
    `);

    const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
      uniform sampler2D uPressure; uniform sampler2D uVelocity;
      void main () {
          float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
          vec2 velocity = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `);

    const blit = (() => {
      const buffer = gl!.createBuffer()!;
      gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer);
      gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl!.STATIC_DRAW);
      const elemBuffer = gl!.createBuffer()!;
      gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, elemBuffer);
      gl!.bufferData(gl!.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl!.STATIC_DRAW);
      gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0);
      gl!.enableVertexAttribArray(0);
      return (target: any, doClear = false) => {
        if (!target) {
          gl!.viewport(0, 0, gl!.drawingBufferWidth, gl!.drawingBufferHeight);
          gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
        } else {
          gl!.viewport(0, 0, target.width, target.height);
          gl!.bindFramebuffer(gl!.FRAMEBUFFER, target.fbo);
        }
        if (doClear) {
          gl!.clearColor(0, 0, 0, 1);
          gl!.clear(gl!.COLOR_BUFFER_BIT);
        }
        gl!.drawElements(gl!.TRIANGLES, 6, gl!.UNSIGNED_SHORT, 0);
      };
    })();

    let dye: any, velocity: any, divergence: any, curlRes: any, pressureRes: any;
    const copyProgram = new Program(baseVertexShader, copyShader);
    const clearProgram = new Program(baseVertexShader, clearShader);
    const splatProgram = new Program(baseVertexShader, splatShader);
    const advectionProgram = new Program(baseVertexShader, advectionShader);
    const divergenceProgram = new Program(baseVertexShader, divergenceShader);
    const curlProgram = new Program(baseVertexShader, curlShader);
    const vorticityProgram = new Program(baseVertexShader, vorticityShader);
    const pressureProgram = new Program(baseVertexShader, pressureShader);
    const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
    const displayMaterial = new Material(baseVertexShader, displayShaderSource);
    displayMaterial.setKeywords([]);

    function createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
      gl!.activeTexture(gl!.TEXTURE0);
      const texture = gl!.createTexture()!;
      gl!.bindTexture(gl!.TEXTURE_2D, texture);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, param);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, param);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
      const fbo = gl!.createFramebuffer()!;
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
      gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, texture, 0);
      gl!.viewport(0, 0, w, h);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      return {
        texture, fbo, width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
        attach(id: number) {
          gl!.activeTexture(gl!.TEXTURE0 + id);
          gl!.bindTexture(gl!.TEXTURE_2D, texture);
          return id;
        }
      };
    }

    function createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
      let fbo1 = createFBO(w, h, internalFormat, format, type, param);
      let fbo2 = createFBO(w, h, internalFormat, format, type, param);
      return {
        width: w, height: h, texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY,
        read: fbo1, write: fbo2,
        swap() { let t = this.read; this.read = this.write; this.write = t; }
      };
    }

    function initFramebuffers() {
      const w = gl!.drawingBufferWidth, h = gl!.drawingBufferHeight;
      const t = ext.halfFloatTexType;
      const rgba = ext.formatRGBA, rg = ext.formatRG, r = ext.formatR;
      const filtering = ext.supportLinearFiltering ? gl!.LINEAR : gl!.NEAREST;
      gl!.disable(gl!.BLEND);

      dye = createDoubleFBO(w, h, rgba.internalFormat, rgba.format, t, filtering);
      velocity = createDoubleFBO(w, h, rg.internalFormat, rg.format, t, filtering);
      divergence = createFBO(w, h, r.internalFormat, r.format, t, gl!.NEAREST);
      curlRes = createFBO(w, h, r.internalFormat, r.format, t, gl!.NEAREST);
      pressureRes = createDoubleFBO(w, h, r.internalFormat, r.format, t, gl!.NEAREST);
    }

    initFramebuffers();

    let lastUpdateTime = Date.now();
    let startTime = Date.now();
    let animFrame: number;
    let lastCoverageCheckMs = 0;
    let coveragePasses = 0;
    const MIN_RUNTIME_BEFORE_SWITCH_SECONDS = 4.5;
    const COVERAGE_CHECK_EVERY_MS = 200;
    const REQUIRED_COVERAGE_PASSES = 4;
    const INK_RATIO_THRESHOLD = 0.992;
    const targetR = Math.round(inkVec3[0] * 255);
    const targetG = Math.round(inkVec3[1] * 255);
    const targetB = Math.round(inkVec3[2] * 255);
    const CHANNEL_TOLERANCE = 14;

    const LEFT_INJECT_AT = 0.0;
    const TOP_LEFT_INJECT_AT = LEFT_INJECT_AT + SHARED_BURST_DURATION + WAIT_AFTER_LEFT;
    const BOTTOM_LEFT_INJECT_AT = TOP_LEFT_INJECT_AT + SHARED_BURST_DURATION + WAIT_AFTER_TOP_LEFT;

    const probeCanvas = document.createElement('canvas');
    probeCanvas.width = 64;
    probeCanvas.height = 36;
    const probeCtx = probeCanvas.getContext('2d', { willReadFrequently: true });

    function isFrameFullyBlackEnough() {
      if (!probeCtx || !canvasRef.current) return false;

      probeCtx.drawImage(canvasRef.current, 0, 0, probeCanvas.width, probeCanvas.height);
      const pixels = probeCtx.getImageData(0, 0, probeCanvas.width, probeCanvas.height).data;
      let inkPixels = 0;
      const pixelCount = probeCanvas.width * probeCanvas.height;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        if (
          Math.abs(r - targetR) <= CHANNEL_TOLERANCE &&
          Math.abs(g - targetG) <= CHANNEL_TOLERANCE &&
          Math.abs(b - targetB) <= CHANNEL_TOLERANCE
        ) {
          inkPixels++;
        }
      }

      return inkPixels / pixelCount >= INK_RATIO_THRESHOLD;
    }

    function emitBurst(
      elapsed: number,
      startAt: number,
      duration: number,
      x: number,
      y: number,
      dx: number,
      dy: number,
      wobble: number
    ) {
      if (elapsed < startAt || elapsed > startAt + duration) return;

      const t = (elapsed - startAt) / duration;
      const envelope = Math.pow(Math.sin(Math.PI * t), 1.15);
      const jitter = Math.sin((elapsed - startAt) * 18.0) * wobble;
      const forceScale = 0.45 + 0.55 * envelope;

      // Two close splats per frame create a denser fluid plume like the old behavior.
      splat(x, y + jitter, dx * forceScale, dy * forceScale, { r: 1, g: 1, b: 1 });
      splat(x, y - jitter * 0.5, dx * forceScale * 0.8, dy * forceScale * 0.8, { r: 1, g: 1, b: 1 });
    }

    function injectSequence(elapsed: number) {
      if (isMobilePortrait) {
        // Mobile portrait: all three bursts start from top and push down.
        emitBurst(elapsed, LEFT_INJECT_AT, SHARED_BURST_DURATION, 0.2, 0.94, SHARED_FORCE_Y, -SHARED_FORCE_X, SHARED_WOBBLE);
        emitBurst(elapsed, TOP_LEFT_INJECT_AT, SHARED_BURST_DURATION, 0.5, 0.94, 0.0, -SHARED_FORCE_X, SHARED_WOBBLE);
        emitBurst(elapsed, BOTTOM_LEFT_INJECT_AT, SHARED_BURST_DURATION, 0.8, 0.94, -SHARED_FORCE_Y, -SHARED_FORCE_X, SHARED_WOBBLE);
        return;
      }

      // 1) Left syringe-like burst.
      emitBurst(elapsed, LEFT_INJECT_AT, SHARED_BURST_DURATION, 0.05, 0.5, SHARED_FORCE_X, 0.0, SHARED_WOBBLE);

      // 2) Top-left inward/downward burst.
      emitBurst(elapsed, TOP_LEFT_INJECT_AT, SHARED_BURST_DURATION, 0.08, 0.12, SHARED_FORCE_X, SHARED_FORCE_Y, SHARED_WOBBLE);

      // 3) Bottom-left inward/upward burst.
      emitBurst(elapsed, BOTTOM_LEFT_INJECT_AT, SHARED_BURST_DURATION, 0.08, 0.88, SHARED_FORCE_X, -SHARED_FORCE_Y, SHARED_WOBBLE);
    }

    function updateFrame() {
      const now = Date.now();
      let dt = Math.min((now - lastUpdateTime) / 1000, 0.016666);
      lastUpdateTime = now;

      const elapsed = (now - startTime) / 1000;
      injectSequence(elapsed);

      step(dt);
      render(null);

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

      animFrame = requestAnimationFrame(updateFrame);
    }

    function step(dt: number) {
      gl!.disable(gl!.BLEND);

      // Curl
      curlProgram.bind();
      gl!.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl!.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
      blit(curlRes);

      // Vorticity
      vorticityProgram.bind();
      gl!.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl!.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
      gl!.uniform1i(vorticityProgram.uniforms.uCurl, curlRes.attach(1));
      gl!.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
      gl!.uniform1f(vorticityProgram.uniforms.dt, dt);
      blit(velocity.write); velocity.swap();

      // Divergence
      divergenceProgram.bind();
      gl!.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl!.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
      blit(divergence);

      // Clear Pressure
      clearProgram.bind();
      gl!.uniform1i(clearProgram.uniforms.uTexture, pressureRes.read.attach(0));
      gl!.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
      blit(pressureRes.write); pressureRes.swap();

      // Pressure iteration
      pressureProgram.bind();
      gl!.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl!.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl!.uniform1i(pressureProgram.uniforms.uPressure, pressureRes.read.attach(1));
        blit(pressureRes.write); pressureRes.swap();
      }

      // Gradient Subtract
      gradienSubtractProgram.bind();
      gl!.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl!.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressureRes.read.attach(0));
      gl!.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
      blit(velocity.write); velocity.swap();

      // Advection
      advectionProgram.bind();
      gl!.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      const velId = velocity.read.attach(0);
      gl!.uniform1i(advectionProgram.uniforms.uVelocity, velId);
      gl!.uniform1i(advectionProgram.uniforms.uSource, velId);
      gl!.uniform1f(advectionProgram.uniforms.dt, dt);
      gl!.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
      blit(velocity.write); velocity.swap();

      gl!.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
      gl!.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
      gl!.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
      blit(dye.write); dye.swap();
    }

    function render(target: any) {
      gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
      gl!.enable(gl!.BLEND);
      displayMaterial.bind();
      gl!.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
      gl!.uniform3f(displayMaterial.uniforms.uStartColor, startVec3[0], startVec3[1], startVec3[2]);
      gl!.uniform3f(displayMaterial.uniforms.uInkColor, inkVec3[0], inkVec3[1], inkVec3[2]);
      blit(target, false);
    }

    function splat(x: number, y: number, dx: number, dy: number, color: ColorRGB) {
      if (!canvas) return;
      splatProgram.bind();
      gl!.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
      gl!.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
      gl!.uniform2f(splatProgram.uniforms.point, x, y);
      gl!.uniform3f(splatProgram.uniforms.color, dx, dy, 0);
      gl!.uniform1f(splatProgram.uniforms.radius, (config.SPLAT_RADIUS / 100) * (canvas.width / canvas.height));
      blit(velocity.write); velocity.swap();

      gl!.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
      gl!.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
      blit(dye.write); dye.swap();
    }

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initFramebuffers(); // Re-init
    };
    window.addEventListener('resize', onResize);
    onResize();

    // Start rendering only after first resize/init so the first injection is not wiped.
    updateFrame();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', onResize);
    };
  }, [isComplete, inkVec3, startVec3, isMobilePortrait]);

  if (isComplete) {
    return <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: inkHex }} />;
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', zIndex: -1, pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}></canvas>
    </div>
  );
}