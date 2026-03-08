import React, { useEffect, useRef } from 'react';

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

interface Pointer {
  id: number;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  moved: boolean;
  color: ColorRGB;
}

function pointerPrototype(): Pointer {
  return {
    id: -1,
    texcoordX: 0,
    texcoordY: 0,
    prevTexcoordX: 0,
    prevTexcoordY: 0,
    deltaX: 0,
    deltaY: 0,
    down: false,
    moved: false,
    color: { r: 1, g: 1, b: 1 } // Forced white dye internally
  };
}

export default function InkReveal3() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Hardcoded constants for optimal smoke reveal
  const SIM_RESOLUTION = 128;
  const DYE_RESOLUTION = 1024;
  const DENSITY_DISSIPATION = 0.2; // Slow dissipation allows it to fill
  const VELOCITY_DISSIPATION = 0.8;
  const PRESSURE = 0.1;
  const PRESSURE_ITERATIONS = 20;
  const CURL = 15.0; // High curl for smoke
  const SPLAT_RADIUS = 0.4;
  const SPLAT_FORCE = 6000;
  const SHADING = false;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let pointers: Pointer[] = [pointerPrototype()];

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
      varying vec2 vUv; uniform sampler2D uTexture;
      void main () {
          vec3 c = texture2D(uTexture, vUv).rgb;
          float density = max(c.r, max(c.g, c.b));
          
          // Pure white background. The closer to 1 density is, the blacker the smoke.
          vec3 finalColor = mix(vec3(1.0), vec3(0.0), clamp(density, 0.0, 1.0));
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

    // Hardcode all white internally to render as pure black on the reversed shader
    function generateColor() { return { r: 1, g: 1, b: 1 }; }

    function updateFrame() {
      const now = Date.now();
      let dt = Math.min((now - lastUpdateTime) / 1000, 0.016666);
      lastUpdateTime = now;

      // AUTOMATIC REVEAL: Push giant smoke from the left side initially
      const elapsed = (now - startTime) / 1000;
      if (elapsed < 3.0) {
        const xPos = 0.05;
        const yPos = 0.5 + Math.sin(elapsed * 4.0) * 0.15; // sweeping up and down
        // Very heavy force to push across the screen
        splat(xPos, yPos, 80 * (3.0 - elapsed), Math.cos(elapsed * 6.0) * 40, { r: 1, g: 1, b: 1 });
      }

      applyInputs();
      step(dt);
      render(null);
      animFrame = requestAnimationFrame(updateFrame);
    }

    function applyInputs() {
      for (let p of pointers) {
        if (p.moved) {
          p.moved = false;
          splat(p.texcoordX, p.texcoordY, p.deltaX * config.SPLAT_FORCE, p.deltaY * config.SPLAT_FORCE, p.color);
        }
      }
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

    updateFrame();

    // Interaction handling
    function updatePointerDown(pointer: Pointer, id: number, x: number, y: number) {
      if (!canvasRef.current) return;
      pointer.id = id; pointer.down = true; pointer.moved = false;
      pointer.texcoordX = x / canvasRef.current.width; pointer.texcoordY = 1.0 - y / canvasRef.current.height;
      pointer.prevTexcoordX = pointer.texcoordX; pointer.prevTexcoordY = pointer.texcoordY;
      pointer.deltaX = 0; pointer.deltaY = 0;
      pointer.color = generateColor();
    }

    function updatePointerMove(pointer: Pointer, x: number, y: number) {
      if (!canvasRef.current) return;
      pointer.prevTexcoordX = pointer.texcoordX; pointer.prevTexcoordY = pointer.texcoordY;
      pointer.texcoordX = x / canvasRef.current.width; pointer.texcoordY = 1.0 - y / canvasRef.current.height;
      let dx = pointer.texcoordX - pointer.prevTexcoordX;
      let dy = pointer.texcoordY - pointer.prevTexcoordY;
      const aspect = canvasRef.current.width / canvasRef.current.height;
      if (aspect < 1) dx *= aspect; else dy /= aspect;
      pointer.deltaX = dx; pointer.deltaY = dy;
      pointer.moved = Math.abs(dx) > 0 || Math.abs(dy) > 0;
    }

    const mousemove = (e: MouseEvent) => updatePointerMove(pointers[0], e.clientX, e.clientY);
    const mousedown = (e: MouseEvent) => {
      updatePointerDown(pointers[0], -1, e.clientX, e.clientY);
      splat(pointers[0].texcoordX, pointers[0].texcoordY, 10*(Math.random()-0.5), 30*(Math.random()-0.5), generateColor());
    };
    
    window.addEventListener('mousemove', mousemove);
    window.addEventListener('mousedown', mousedown);

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initFramebuffers(); // Re-init
    };
    window.addEventListener('resize', onResize);
    onResize();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('mousemove', mousemove);
      window.removeEventListener('mousedown', mousedown);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'auto' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}></canvas>
    </div>
  );
}