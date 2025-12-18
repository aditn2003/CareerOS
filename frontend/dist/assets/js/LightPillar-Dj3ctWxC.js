import{j as B}from"./index-0AUaX9b2.js";import{r as e}from"./vendor-maps-C-WKv3dq.js";import{V as H,S as $,O as J,W as Q,a as Z,P as ee,M as te,C as oe,b as re}from"./vendor-three-D34SSa7r.js";const ne=({topColor:y="#5227FF",bottomColor:w="#FF9FFC",intensity:x=1,rotationSpeed:R=.3,interactive:s=!1,className:b="",glowAmount:P=.005,pillarWidth:C=3,pillarHeight:S=.4,noiseIntensity:F=.5,mixBlendMode:A="screen",pillarRotation:L=0})=>{const v=e.useRef(null),u=e.useRef(null),o=e.useRef(null),i=e.useRef(null),c=e.useRef(null),f=e.useRef(null),d=e.useRef(null),z=e.useRef(new H(0,0)),T=e.useRef(0),[p,E]=e.useState(!0);return e.useEffect(()=>{const a=document.createElement("canvas");a.getContext("webgl")||a.getContext("experimental-webgl")||(E(!1),console.warn("WebGL is not supported in this browser"))},[]),e.useEffect(()=>{if(!v.current||!p)return;const a=v.current,m=1200,h=300,W=new $;c.current=W;const U=new J(-1,1,1,-1,0,1);f.current=U;let l;try{l=new Q({antialias:!1,alpha:!0,powerPreference:"high-performance",precision:"lowp",stencil:!1,depth:!1})}catch(n){console.error("Failed to create WebGL renderer:",n),E(!1);return}l.setSize(m,h,!1),l.setPixelRatio(1);const r=l.domElement;r.width=m,r.height=h,r.style.position="absolute",r.style.top="0",r.style.left="0",r.style.width="100%",r.style.height="100%",r.style.objectFit="cover",r.style.imageRendering="auto",a.appendChild(r),o.current=l;const V=l.setSize.bind(l);l.setSize=function(n,t,q){V(m,h,!1)};const D=n=>{const t=new oe(n);return new re(t.r,t.g,t.b)},X=`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,_=`
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      uniform float uIntensity;
      uniform bool uInteractive;
      uniform float uGlowAmount;
      uniform float uPillarWidth;
      uniform float uPillarHeight;
      uniform float uNoiseIntensity;
      uniform float uPillarRotation;
      varying vec2 vUv;

      const float PI = 3.141592653589793;
      const float EPSILON = 0.001;
      const float E = 2.71828182845904523536;
      const float HALF = 0.5;

      mat2 rot(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat2(c, -s, s, c);
      }

      // Procedural noise function
      float noise(vec2 coord) {
        float G = E;
        vec2 r = (G * sin(G * coord));
        return fract(r.x * r.y * (1.0 + coord.x));
      }

      // Apply layered wave deformation to position
      vec3 applyWaveDeformation(vec3 pos, float timeOffset) {
        float frequency = 1.0;
        float amplitude = 1.0;
        vec3 deformed = pos;
        
        for(float i = 0.0; i < 4.0; i++) {
          deformed.xz *= rot(0.4);
          float phase = timeOffset * i * 2.0;
          vec3 oscillation = cos(deformed.zxy * frequency - phase);
          deformed += oscillation * amplitude;
          frequency *= 2.0;
          amplitude *= HALF;
        }
        return deformed;
      }

      // Polynomial smooth blending between two values
      float blendMin(float a, float b, float k) {
        float scaledK = k * 4.0;
        float h = max(scaledK - abs(a - b), 0.0);
        return min(a, b) - h * h * 0.25 / scaledK;
      }

      float blendMax(float a, float b, float k) {
        return -blendMin(-a, -b, k);
      }

      void main() {
        // ALWAYS use fixed resolution - completely ignore uResolution
        // This ensures the effect never changes regardless of container size
        vec2 fixedRes = vec2(1200.0, 300.0);
        vec2 fragCoord = vUv * fixedRes;
        vec2 uv = (fragCoord * 2.0 - fixedRes) / fixedRes.y;
        
        // Apply 2D rotation to UV coordinates (45 degrees for diagonal)
        float rotAngle = uPillarRotation * PI / 180.0;
        uv *= rot(rotAngle);

        vec3 origin = vec3(0.0, 0.0, -10.0);
        vec3 direction = normalize(vec3(uv, 1.0));

        float maxDepth = 50.0;
        float depth = 0.1;

        mat2 rotX = rot(uTime * 0.3);
        if(uInteractive && length(uMouse) > 0.0) {
          rotX = rot(uMouse.x * PI * 2.0);
        }

        vec3 color = vec3(0.0);
        
        for(float i = 0.0; i < 100.0; i++) {
          vec3 pos = origin + direction * depth;
          pos.xz *= rotX;

          // Apply vertical scaling and wave deformation
          vec3 deformed = pos;
          deformed.y *= uPillarHeight;
          deformed = applyWaveDeformation(deformed + vec3(0.0, uTime, 0.0), uTime);
          
          // Calculate distance field using cosine pattern
          vec2 cosinePair = cos(deformed.xz);
          float fieldDistance = length(cosinePair) - 0.2;
          
          // Radial boundary constraint
          float radialBound = length(pos.xz) - uPillarWidth;
          fieldDistance = blendMax(radialBound, fieldDistance, 1.0);
          fieldDistance = abs(fieldDistance) * 0.15 + 0.01;

          vec3 gradient = mix(uBottomColor, uTopColor, smoothstep(15.0, -15.0, pos.y));
          color += gradient * pow(1.0 / fieldDistance, 1.0);

          if(fieldDistance < EPSILON || depth > maxDepth) break;
          depth += fieldDistance;
        }

        // Normalize by pillar width to maintain consistent glow regardless of size
        float widthNormalization = uPillarWidth / 3.0;
        color = tanh(color * uGlowAmount / widthNormalization);
        
        // Add noise postprocessing
        float rnd = noise(gl_FragCoord.xy);
        color -= rnd / 15.0 * uNoiseIntensity;
        
        gl_FragColor = vec4(color * uIntensity, 1.0);
      }
    `,G=new Z({vertexShader:X,fragmentShader:_,uniforms:{uTime:{value:0},uResolution:{value:new H(1200,300)},uMouse:{value:z.current},uTopColor:{value:D(y)},uBottomColor:{value:D(w)},uIntensity:{value:x},uInteractive:{value:s},uGlowAmount:{value:P},uPillarWidth:{value:C},uPillarHeight:{value:S},uNoiseIntensity:{value:F},uPillarRotation:{value:L}},transparent:!0,depthWrite:!1,depthTest:!1});i.current=G;const I=new ee(2,2);d.current=I;const K=new te(I,G);W.add(K);let g=null;const M=n=>{if(!s||g)return;g=window.setTimeout(()=>{g=null},16);const t=a.getBoundingClientRect(),q=(n.clientX-t.left)/t.width*2-1,Y=-((n.clientY-t.top)/t.height)*2+1;z.current.set(q,Y)};s&&a.addEventListener("mousemove",M,{passive:!0});let N=performance.now();const k=1e3/60;let O=!0;const j=n=>{if(!O||!i.current||!o.current||!c.current||!f.current)return;const t=n-N;t>=k&&(T.current+=.016*R,i.current&&i.current.uniforms&&(i.current.uniforms.uTime.value=T.current),o.current&&c.current&&f.current&&o.current.render(c.current,f.current),N=n-t%k),u.current=requestAnimationFrame(j)};return u.current=requestAnimationFrame(j),()=>{O=!1,s&&a.removeEventListener("mousemove",M),u.current&&(cancelAnimationFrame(u.current),u.current=null),o.current&&(o.current.dispose(),o.current.forceContextLoss(),a.contains(o.current.domElement)&&a.removeChild(o.current.domElement),o.current=null),i.current&&(i.current.dispose(),i.current=null),d.current&&(d.current.dispose(),d.current=null),c.current=null,f.current=null}},[y,w,x,R,s,P,C,S,F,L,p]),p?B.jsx("div",{ref:v,className:`light-pillar-container ${b}`,style:{mixBlendMode:A}}):B.jsx("div",{className:`light-pillar-fallback ${b}`,style:{mixBlendMode:A},children:"WebGL not supported"})},ue=e.memo(ne);export{ue as default};
