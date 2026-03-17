/**
 * WebGL ScreenPaint + ScreenPaintDistortion
 * ──────────────────────────────────────────────────────────────
 * Full WebGL implementation:
 * - ScreenPaint: FBO ping-pong fluid simulation (frag$n)
 * - ScreenPaintDistortion: Post-effect with velocity distortion + RGB shift (frag$1)
 * - Canvas styled
 */
(function () {
    'use strict';

    /* ── skip touch-only / tiny screens ── */
    var isTouchOnly = ('ontouchstart' in window) && !window.matchMedia('(pointer:fine)').matches;
    if (isTouchOnly) return;
    if (window.innerWidth < 600) return;

    /* ========================================
       STATE
       ======================================== */
    var canvas, gl;
    var viewW, viewH;
    var simW, simH, lowW, lowH;

    /* FBO textures & framebuffers */
    var currPaintFBO, prevPaintFBO, lowPaintFBO, lowBlurFBO;
    var quadVAO, quadBuf;
    var fboTexType; // gl.FLOAT, HALF_FLOAT, or UNSIGNED_BYTE

    /* Shader programs */
    var paintProgram, copyProgram, blurProgram, distortionProgram;

    /* Mouse state */
    var mouseX = -9999, mouseY = -9999;
    var prevMouseX = -9999, prevMouseY = -9999;
    var hadMoved = false;
    var accVelX = 0, accVelY = 0;
    var accelDissipation = 0.80;

    /* ========================================
       CONFIG — defaults
       ======================================== */
    var PUSH_STRENGTH       = 25;
    var VEL_DISSIPATION     = 0.975;
    var WEIGHT1_DISSIP      = 0.95;
    var WEIGHT2_DISSIP      = 0.80;
    var CURL_SCALE          = 0.02;
    var CURL_STRENGTH       = 3.0;
    var MIN_RADIUS          = 0;
    var MAX_RADIUS          = 100;
    var RADIUS_DIST_RANGE   = 100;
    var DISTORT_AMOUNT      = 4.0;
    var DISTORT_RGB_SHIFT   = 1.2;
    var DISTORT_COLOR_MUL   = 25.0;
    var DISTORT_MULTIPLIER  = 6.0;

    /* ========================================
       GLSL SHADERS
       ======================================== */

    /* Shared fullscreen triangle vertex shader */
    var fullscreenVert = [
        'precision highp float;',
        'attribute vec2 a_position;',
        'varying vec2 v_uv;',
        'void main() {',
        '    v_uv = a_position * 0.5 + 0.5;',
        '    gl_Position = vec4(a_position, 0.0, 1.0);',
        '}'
    ].join('\n');

    /* ── ScreenPaint simulation shader (frag$n) ── */
    var paintFrag = [
        'precision highp float;',
        'uniform sampler2D u_lowPaintTexture;',
        'uniform sampler2D u_prevPaintTexture;',
        'uniform vec2 u_paintTexelSize;',
        'uniform vec4 u_drawFrom;',   // xy=from pos, zw=radius info
        'uniform vec4 u_drawTo;',     // xy=to pos, zw=radius info
        'uniform float u_pushStrength;',
        'uniform float u_curlScale;',
        'uniform float u_curlStrength;',
        'uniform vec2 u_vel;',
        'uniform vec3 u_dissipations;', // x=vel, y=w1, z=w2
        'varying vec2 v_uv;',
        '',
        '/* sdSegment */',
        'vec2 sdSegment(in vec2 p, in vec2 a, in vec2 b) {',
        '    vec2 pa = p - a, ba = b - a;',
        '    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);',
        '    return vec2(length(pa - ba * h), h);',
        '}',
        '',
        '/* hash for noise */',
        'vec2 hash(vec2 p) {',
        '    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));',
        '    p3 += dot(p3, p3.yzx + 33.33);',
        '    return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;',
        '}',
        '',
        '/* noised — value noise with derivatives */',
        'vec3 noised(in vec2 p) {',
        '    vec2 i = floor(p);',
        '    vec2 f = fract(p);',
        '    vec2 u = f * f * (3.0 - 2.0 * f);',
        '    vec2 du = 6.0 * f * (1.0 - f);',
        '    vec2 ga = hash(i + vec2(0.0, 0.0));',
        '    vec2 gb = hash(i + vec2(1.0, 0.0));',
        '    vec2 gc = hash(i + vec2(0.0, 1.0));',
        '    vec2 gd = hash(i + vec2(1.0, 1.0));',
        '    float va = ga.x, vb = gb.x, vc = gc.x, vd = gd.x;',
        '    float value = va + u.x*(vb-va) + u.y*(vc-va) + u.x*u.y*(va-vb-vc+vd);',
        '    vec2 deriv = vec2(',
        '        du.x * (vb - va + u.y * (va - vb - vc + vd)),',
        '        du.y * (vc - va + u.x * (va - vb - vc + vd))',
        '    );',
        '    return vec3(value, deriv);',
        '}',
        '',
        'void main() {',
        '    vec2 pixelCoord = v_uv / u_paintTexelSize;',
        '    vec2 fromPos = u_drawFrom.xy;',
        '    vec2 toPos = u_drawTo.xy;',
        '    float drawRadius = u_drawFrom.z;',
        '    vec2 radiusWeight = vec2(u_drawFrom.w, u_drawTo.z);',
        '',
        '    /* sdSegment distance */',
        '    vec2 seg = sdSegment(v_uv, fromPos, toPos);',
        '    float d = drawRadius > 0.0 ? max(0.0, 1.0 - max(0.0, seg.x + 0.001) / drawRadius) : 0.0;',
        '',
        '    /* Sample low texture for advection */',
        '    vec4 lowData = texture2D(u_lowPaintTexture, v_uv);',
        '    vec2 velInv = (0.5 - lowData.xy) * u_pushStrength;',
        '',
        '    /* Curl noise perturbation */',
        '    float noiseWeight = lowData.z + lowData.w;',
        '    if (noiseWeight > 0.001) {',
        '        float curlFreq1 = u_curlScale * (1.0 - lowData.x);',
        '        float curlFreq2 = u_curlScale * (2.0 - lowData.x * 0.5);',
        '        vec3 noise1 = noised(pixelCoord * curlFreq2);',
        '        vec3 noise2 = noised(pixelCoord * curlFreq1);',
        '        vec2 curlNoise = vec2(',
        '            noise1.z + noise2.z * 0.1,',
        '            -(noise1.y + noise2.y * 0.1)',
        '        );',
        '        velInv += curlNoise * noiseWeight * u_curlStrength;',
        '    }',
        '',
        '    /* Advect: sample previous at offset */',
        '    vec4 data = texture2D(u_prevPaintTexture, v_uv + velInv * u_paintTexelSize);',
        '    data.xy -= 0.5;',
        '',
        '    /* Dissipation + injection */',
        '    vec4 delta = (vec4(u_dissipations.xx, u_dissipations.yz) - 1.0) * data;',
        '    vec2 newVel = u_vel * d;',
        '    delta += vec4(newVel, radiusWeight.yy * d);',
        '    delta.zw = sign(delta.zw) * max(vec2(0.004), abs(delta.zw));',
        '    data += delta;',
        '    data.xy += 0.5;',
        '',
        '    gl_FragColor = clamp(data, vec4(0.0), vec4(1.0));',
        '}'
    ].join('\n');

    /* ── Simple copy shader ── */
    var copyFrag = [
        'precision highp float;',
        'uniform sampler2D u_texture;',
        'varying vec2 v_uv;',
        'void main() {',
        '    gl_FragColor = texture2D(u_texture, v_uv);',
        '}'
    ].join('\n');

    /* ── Blur shader (9-tap separable gaussian) ── */
    var blurFrag = [
        'precision highp float;',
        'uniform sampler2D u_texture;',
        'uniform vec2 u_delta;',
        'varying vec2 v_uv;',
        'void main() {',
        '    vec4 sum = vec4(0.0);',
        '    sum += texture2D(u_texture, v_uv - 4.0 * u_delta) * 0.0162;',
        '    sum += texture2D(u_texture, v_uv - 3.0 * u_delta) * 0.0540;',
        '    sum += texture2D(u_texture, v_uv - 2.0 * u_delta) * 0.1216;',
        '    sum += texture2D(u_texture, v_uv - 1.0 * u_delta) * 0.1945;',
        '    sum += texture2D(u_texture, v_uv)                  * 0.2270;',
        '    sum += texture2D(u_texture, v_uv + 1.0 * u_delta) * 0.1945;',
        '    sum += texture2D(u_texture, v_uv + 2.0 * u_delta) * 0.1216;',
        '    sum += texture2D(u_texture, v_uv + 3.0 * u_delta) * 0.0540;',
        '    sum += texture2D(u_texture, v_uv + 4.0 * u_delta) * 0.0162;',
        '    gl_FragColor = sum;',
        '}'
    ].join('\n');

    /* ── ScreenPaintDistortion shader (frag$1) ── */
    var distortionFrag = [
        'precision highp float;',
        'uniform sampler2D u_screenPaintTexture;',
        'uniform vec2 u_screenPaintTexelSize;',
        'uniform float u_amount;',
        'uniform float u_rgbShift;',
        'uniform float u_multiplier;',
        'uniform float u_colorMultiplier;',
        'uniform float u_shade;',
        'varying vec2 v_uv;',
        '',
        'void main() {',
        '    vec4 data = texture2D(u_screenPaintTexture, v_uv);',
        '    float weight = (data.z + data.w) * 0.5;',
        '    vec2 vel = (0.5 - data.xy - 0.001) * 2.0 * weight;',
        '    float velMag = length(vel);',
        '',
        '    /* Spectral chromatic color — enhanced formula */',
        '    float param = (vel.x + vel.y) * 40.0;',
        '    vec3 rainbow = vec3(',
        '        sin(param + 0.0 * u_rgbShift),',
        '        sin(param + 2.0 * u_rgbShift),',
        '        sin(param + 4.0 * u_rgbShift)',
        '    );',
        '',
        '    /* Boost saturation: push away from gray */',
        '    float lum = dot(rainbow, vec3(0.33));',
        '    rainbow = mix(vec3(lum), rainbow, 1.8);',
        '',
        '    float fade = smoothstep(0.4, -0.9, weight);',
        '    vec3 color = rainbow * fade * u_shade * velMag * u_colorMultiplier;',
        '',
        '    /* Alpha from velocity magnitude and weight */',
        '    float alpha = smoothstep(0.0, 0.08, weight)',
        '               * smoothstep(0.0, 0.03, velMag * u_multiplier);',
        '',
        '    /* Output with vivid color — no 0.5 washout */',
        '    gl_FragColor = vec4(abs(color), alpha * 0.7);',
        '}'
    ].join('\n');

    /* ========================================
       WebGL HELPERS
       ======================================== */

    function compileShader(src, type) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function createProgram(vertSrc, fragSrc) {
        var vs = compileShader(vertSrc, gl.VERTEX_SHADER);
        var fs = compileShader(fragSrc, gl.FRAGMENT_SHADER);
        if (!vs || !fs) return null;
        var prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.bindAttribLocation(prog, 0, 'a_position');
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(prog));
            return null;
        }
        /* Cache uniform locations */
        var uniforms = {};
        var numUniforms = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
        for (var i = 0; i < numUniforms; i++) {
            var info = gl.getActiveUniform(prog, i);
            uniforms[info.name] = gl.getUniformLocation(prog, info.name);
        }
        return { program: prog, uniforms: uniforms };
    }

    function createFBO(w, h) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, fboTexType, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

        return { texture: tex, framebuffer: fb, width: w, height: h };
    }

    function resizeFBO(fbo, w, h) {
        fbo.width = w;
        fbo.height = h;
        gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, fboTexType, null);
    }

    function clearFBO(fbo, r, g, b, a) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
        gl.viewport(0, 0, fbo.width, fbo.height);
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    function bindTexture(unit, tex) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
    }

    function drawQuad() {
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    /* Test if float/half-float FBO render target is supported */
    function testFloatFBO(type) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, type, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(fb);
        gl.deleteTexture(tex);
        return status === gl.FRAMEBUFFER_COMPLETE;
    }

    /* ========================================
       INIT WebGL
       ======================================== */
    function initWebGL() {
        /* Try float textures for accurate simulation */
        fboTexType = gl.UNSIGNED_BYTE; // safe fallback

        var floatExt = gl.getExtension('OES_texture_float');
        if (floatExt) {
            gl.getExtension('OES_texture_float_linear');
            var cbfExt = gl.getExtension('WEBGL_color_buffer_float');
            /* Test if float render target actually works */
            if (cbfExt || testFloatFBO(gl.FLOAT)) {
                fboTexType = gl.FLOAT;
            }
        }
        if (fboTexType === gl.UNSIGNED_BYTE) {
            var halfFloatExt = gl.getExtension('OES_texture_half_float');
            if (halfFloatExt) {
                gl.getExtension('OES_texture_half_float_linear');
                var halfType = halfFloatExt.HALF_FLOAT_OES;
                if (testFloatFBO(halfType)) {
                    fboTexType = halfType;
                }
            }
        }

        /* Fullscreen quad (two triangles) */
        quadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,  1, -1, -1, 1,
            -1,  1,  1, -1,  1, 1
        ]), gl.STATIC_DRAW);

        /* Compile all shader programs */
        paintProgram = createProgram(fullscreenVert, paintFrag);
        copyProgram = createProgram(fullscreenVert, copyFrag);
        blurProgram = createProgram(fullscreenVert, blurFrag);
        distortionProgram = createProgram(fullscreenVert, distortionFrag);

        if (!paintProgram || !copyProgram || !blurProgram || !distortionProgram) {
            console.error('ScreenPaint: shader compilation failed');
            return false;
        }

        return true;
    }

    function initFBOs() {
        simW = Math.max(4, Math.round(viewW * 0.25));
        simH = Math.max(4, Math.round(viewH * 0.25));
        lowW = Math.max(2, simW >> 1);
        lowH = Math.max(2, simH >> 1);

        if (!currPaintFBO) {
            currPaintFBO = createFBO(simW, simH);
            prevPaintFBO = createFBO(simW, simH);
            lowPaintFBO  = createFBO(lowW, lowH);
            lowBlurFBO   = createFBO(lowW, lowH);
        } else {
            resizeFBO(currPaintFBO, simW, simH);
            resizeFBO(prevPaintFBO, simW, simH);
            resizeFBO(lowPaintFBO, lowW, lowH);
            resizeFBO(lowBlurFBO, lowW, lowH);
        }

        /* Clear all FBOs to (0.5, 0.5, 0, 0) — neutral velocity, zero weight */
        clearFBO(currPaintFBO, 0.5, 0.5, 0, 0);
        clearFBO(prevPaintFBO, 0.5, 0.5, 0, 0);
        clearFBO(lowPaintFBO,  0.5, 0.5, 0, 0);
        clearFBO(lowBlurFBO,   0.5, 0.5, 0, 0);
    }

    /* ========================================
       SIMULATION STEP — runs frag$n on GPU
       ======================================== */
    function stepSimulation() {
        /* ── Swap ping-pong ── */
        var temp = prevPaintFBO;
        prevPaintFBO = currPaintFBO;
        currPaintFBO = temp;

        /* ── Copy prev paint → low (downsample) ── */
        gl.useProgram(copyProgram.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, lowPaintFBO.framebuffer);
        gl.viewport(0, 0, lowW, lowH);
        bindTexture(0, prevPaintFBO.texture);
        gl.uniform1i(copyProgram.uniforms.u_texture, 0);
        drawQuad();

        /* ── Blur low texture (horizontal + vertical) ── */
        var blurAmount = 8.0;
        /* Horizontal pass */
        gl.useProgram(blurProgram.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, lowBlurFBO.framebuffer);
        gl.viewport(0, 0, lowW, lowH);
        bindTexture(0, lowPaintFBO.texture);
        gl.uniform1i(blurProgram.uniforms.u_texture, 0);
        gl.uniform2f(blurProgram.uniforms.u_delta, blurAmount / lowW, 0);
        drawQuad();
        /* Vertical pass back to lowPaintFBO */
        gl.bindFramebuffer(gl.FRAMEBUFFER, lowPaintFBO.framebuffer);
        bindTexture(0, lowBlurFBO.texture);
        gl.uniform2f(blurProgram.uniforms.u_delta, 0, blurAmount / lowH);
        drawQuad();

        /* ── Compute mouse data ── */
        var msx = mouseX / viewW;
        var msy = 1.0 - mouseY / viewH; // flip Y for GL
        var pmsx = prevMouseX / viewW;
        var pmsy = 1.0 - prevMouseY / viewH;

        var mouseDist = Math.sqrt(
            (mouseX - prevMouseX) * (mouseX - prevMouseX) +
            (mouseY - prevMouseY) * (mouseY - prevMouseY)
        );
        var radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) *
                     Math.min(1, mouseDist / RADIUS_DIST_RANGE);
        var drawRadius = radius / viewH;
        var shouldDraw = hadMoved && mouseX > -5000;
        if (!shouldDraw) drawRadius = 0;

        /* Accumulated velocity in UV space */
        var newVelX = (msx - pmsx) * 0.8;
        var newVelY = (msy - pmsy) * 0.8;
        accVelX = accVelX * accelDissipation + newVelX;
        accVelY = accVelY * accelDissipation + newVelY;

        /* ── Run paint simulation shader ── */
        gl.useProgram(paintProgram.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, currPaintFBO.framebuffer);
        gl.viewport(0, 0, simW, simH);

        bindTexture(0, lowPaintFBO.texture);
        bindTexture(1, prevPaintFBO.texture);
        gl.uniform1i(paintProgram.uniforms.u_lowPaintTexture, 0);
        gl.uniform1i(paintProgram.uniforms.u_prevPaintTexture, 1);

        gl.uniform2f(paintProgram.uniforms.u_paintTexelSize, 1.0 / simW, 1.0 / simH);
        gl.uniform4f(paintProgram.uniforms.u_drawFrom, pmsx, pmsy, drawRadius, 1.0);
        gl.uniform4f(paintProgram.uniforms.u_drawTo, msx, msy, 1.0, 0.0);
        gl.uniform1f(paintProgram.uniforms.u_pushStrength, PUSH_STRENGTH);
        gl.uniform1f(paintProgram.uniforms.u_curlScale, CURL_SCALE);
        gl.uniform1f(paintProgram.uniforms.u_curlStrength, CURL_STRENGTH);
        gl.uniform2f(paintProgram.uniforms.u_vel, accVelX, accVelY);
        gl.uniform3f(paintProgram.uniforms.u_dissipations, VEL_DISSIPATION, WEIGHT1_DISSIP, WEIGHT2_DISSIP);

        drawQuad();
    }

    /* ========================================
       DISTORTION RENDER — frag$1
       ======================================== */
    function renderDistortion() {
        /* Render to screen (null framebuffer) */
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, viewW, viewH);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(distortionProgram.program);
        bindTexture(0, currPaintFBO.texture);
        gl.uniform1i(distortionProgram.uniforms.u_screenPaintTexture, 0);
        gl.uniform2f(distortionProgram.uniforms.u_screenPaintTexelSize, 1.0 / simW, 1.0 / simH);
        gl.uniform1f(distortionProgram.uniforms.u_amount, DISTORT_AMOUNT);
        gl.uniform1f(distortionProgram.uniforms.u_rgbShift, DISTORT_RGB_SHIFT);
        gl.uniform1f(distortionProgram.uniforms.u_multiplier, DISTORT_MULTIPLIER);
        gl.uniform1f(distortionProgram.uniforms.u_colorMultiplier, DISTORT_COLOR_MUL);
        gl.uniform1f(distortionProgram.uniforms.u_shade, 1.8);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        drawQuad();
        gl.disable(gl.BLEND);
    }

    /* ========================================
       CANVAS SETUP
       ======================================== */
    function createCanvas() {
        canvas = document.createElement('canvas');
        canvas.id = 'canvas';
        canvas.style.cssText = [
            'position: fixed',
            'top: 0',
            'left: 0',
            'width: 100%',
            'height: 100%',
            'margin: 0',
            'padding: 0',
            'border: 0',
            'overflow: hidden',
            'overscroll-behavior: none',
            'touch-action: none',
            'pointer-events: none',
            'z-index: 9998'
        ].join(';');
        document.body.appendChild(canvas);

        gl = canvas.getContext('webgl', {
            alpha: true,
            premultipliedAlpha: false,
            antialias: false,
            preserveDrawingBuffer: false
        });

        if (!gl) {
            console.warn('ScreenPaint: WebGL not available');
            return false;
        }

        return true;
    }

    function resize() {
        viewW = window.innerWidth;
        viewH = window.innerHeight;
        var dpr = Math.min(1.5, window.devicePixelRatio || 1);
        canvas.width = Math.round(viewW * dpr);
        canvas.height = Math.round(viewH * dpr);
        viewW = canvas.width;
        viewH = canvas.height;
        initFBOs();
    }

    /* ========================================
       EVENTS
       ======================================== */
    function onMove(e) {
        var dpr = canvas.width / (window.innerWidth || 1);
        prevMouseX = mouseX;
        prevMouseY = mouseY;
        mouseX = e.clientX * dpr;
        mouseY = e.clientY * dpr;
        hadMoved = true;
    }

    function onTouch(e) {
        if (e.touches && e.touches.length) {
            var dpr = canvas.width / (window.innerWidth || 1);
            prevMouseX = mouseX;
            prevMouseY = mouseY;
            mouseX = e.touches[0].clientX * dpr;
            mouseY = e.touches[0].clientY * dpr;
            hadMoved = true;
        }
    }

    function onTouchEnd() {
        mouseX = -9999; mouseY = -9999;
        hadMoved = false;
    }

    /* ========================================
       MAIN LOOP
       ======================================== */
    function loop() {
        requestAnimationFrame(loop);
        stepSimulation();
        renderDistortion();

        if (mouseX > -5000) {
            prevMouseX = mouseX;
            prevMouseY = mouseY;
        }
    }

    /* ========================================
       INIT
       ======================================== */
    function init() {
        if (!createCanvas()) return;
        if (!initWebGL()) return;

        resize();

        window.addEventListener('mousemove', onMove, { passive: true });
        window.addEventListener('touchmove', onTouch, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('resize', resize, false);

        requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
