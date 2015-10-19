precision highp float;

uniform sampler2D uSampler;
uniform sampler2D uSceneColor;
uniform sampler2D uNoise;
uniform sampler2D uFlowMap;
uniform samplerCube uSkyCube;

uniform vec3 sunDirection;
uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;
uniform mat3 uNormalMatrix;

uniform vec3 eyePosition;
uniform float time;
uniform vec2 canvasSize;

uniform vec4 sky_params1;
uniform vec4 sky_params2;
uniform vec4 sky_params3;
uniform vec4 sky_params4;
uniform vec4 sky_params5;
uniform vec4 sky_params6;

uniform float time1;
uniform float time2;

varying vec3 worldPosition;

varying vec2 vUv;

vec3 sunColor = vec3(2.0, 2.0, 2.0);

vec3 horizonColor = vec3(0.6, 0.7, 1.0);
vec3 zenithColor = vec3(0.025, 0.1, 0.5);
vec3 eye = eyePosition;



vec3 atmosphereColor(vec3 rayDirection){
  float a = max(0.0, dot(rayDirection, vec3(0.0, 1.0, 0.0)));
  vec3 skyColor = mix(horizonColor, zenithColor, a);
  float sunTheta = max( dot(rayDirection, sunDirection), 0.0 );
  return skyColor+sunColor*pow(sunTheta, 256.0)*0.5;
}

vec3 applyFog(vec3 albedo, float dist, vec3 rayOrigin, vec3 rayDirection){
  float fogDensity = 0.00006;
  float vFalloff = 20.0;
  vec3 fogColor = vec3(0.88, 0.92, 0.999);
  float fog = exp((-rayOrigin.y*vFalloff)*fogDensity) * (1.0-exp(-dist*rayDirection.y*vFalloff*fogDensity))/(rayDirection.y*vFalloff);
  return mix(albedo, fogColor, clamp(fog, 0.0, 1.0));
}

vec3 aerialPerspective(vec3 albedo, float dist, vec3 rayOrigin, vec3 rayDirection){
  float atmosphereDensity = 0.000025;
  vec3 atmosphere = atmosphereColor(rayDirection)+vec3(0.0, 0.02, 0.04); 
  vec3 color = mix(albedo, atmosphere, clamp(1.0-exp(-dist*atmosphereDensity), 0.0, 1.0));
	
  return color;
  //return applyFog(color, dist, rayOrigin, rayDirection);
}

vec4 getNoise(vec2 uv){

  float t = 2.0 * 100.0;
    
  vec2 uv0 = (uv/(103.0)*t)+vec2(time/(17.0*t), time/(29.0*t));
  vec2 uv1 = uv/(107.0*t)-vec2(time/-(19.0*t), time/(31.0*t))+vec2((0.23*t));
  vec2 uv2 = uv/vec2((897.0*t), (983.0*t))+vec2(time/(101.0*t), time/(97.0*t))+vec2((0.51*t));
  vec2 uv3 = uv/vec2((991.0*t), (877.0*t))-vec2(time/(109.0*t), time/(-113.0*t))+vec2((0.71*t));
  vec4 noise = (texture2D(uSampler, uv0)) +
    (texture2D(uSampler, uv1)) +
    (texture2D(uSampler, uv2)) +
    (texture2D(uSampler, uv3));
  return noise*0.5-1.0;
}
/*
  vec4 getNoise(vec2 uv){
  vec2 uv0 = (uv/103.0)+vec2(time/17.0, time/29.0);
  vec2 uv1 = uv/107.0-vec2(time/-19.0, time/31.0)+vec2(0.23);
  vec2 uv2 = uv/vec2(897.0, 983.0)+vec2(time/101.0, time/97.0)+vec2(0.51);
  vec2 uv3 = uv/vec2(991.0, 877.0)-vec2(time/109.0, time/-113.0)+vec2(0.71);
  vec4 noise = (texture2D(uSampler, uv0)) +
  (texture2D(uSampler, uv1)) +
  (texture2D(uSampler, uv2)) +
  (texture2D(uSampler, uv3));
  return noise*0.5-1.0;
  }
*/
void sunLight(const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse,
	      inout vec3 diffuseColor, inout vec3 specularColor){
  vec3 reflection = normalize(reflect(-sunDirection, surfaceNormal));
  float direction = max(0.0, dot(eyeDirection, reflection));
  specularColor += pow(direction, shiny)*sunColor*spec;
  diffuseColor += max(dot(sunDirection, surfaceNormal), 0.0)*sunColor*diffuse;
}

vec3 calcExtinction(float dist) {
  return exp(dist * sky_params6.xyz);
}
 
vec3 calcScattering(float cos_theta) {
  float r_phase = (cos_theta * cos_theta) * sky_params6.w + sky_params6.w;
  float m_phase = sky_params1.w * pow(sky_params2.w * cos_theta + sky_params3.w, -1.5);
  return sky_params2.xyz * r_phase + (sky_params3.xyz * m_phase);
}
 
float baseOpticalDepth(in vec3 ray) {
  float a1 = sky_params4.x * ray.y;
  return sqrt(a1 * a1 + sky_params4.w) - a1;
}
 
float opticalDepth(in vec3 pos, in vec3 ray) {
  pos.y += sky_params4.x;
  float a0 = sky_params4.y - dot(pos, pos);
  float a1 = dot(pos, ray);
  return sqrt(a1 * a1 + a0) - a1;
}

float LinearizeDepth(float val) {
  float n = 10.0; // camera z near
  float f = 6000.0; // camera z far
  return (2.0 * n) / (f + n - val * (f - n));	
}

float Near = 10.0;
float Far = 6000.0;
float LinearDepthConstant = 1.0 / (Far - Near);


vec4 calcRefractionColor(vec3 surfaceNormal, vec3 viewVec, float diff, float d_water) {
  //vec4 colorTerrain = texture2D(uSceneColor, gl_FragCoord.xy/canvasSize);
             
  vec3 refractedVec = normalize(refract(viewVec, surfaceNormal, 1.0/1.33)); // 1.0/1.33 = indice de refraction air/water
  
  // Modification de worldPosition en fonction de l'angle de refraction
  vec3 posRefracted = worldPosition;
  
  posRefracted += refractedVec*clamp(diff, 0.0, 200.0)*0.15;
    
  // projection to camera space
  vec4 posProjected = uPMatrix*uMVMatrix*vec4(posRefracted, 1.0);
    
  // projection to screen space
  posProjected = ((posProjected / posProjected.w) + 1.0) * 0.5;
                
  vec4 refractionColor = texture2D(uSceneColor, posProjected.xy);

  return refractionColor;
}

vec4 calcRefractionColor2(vec3 surfaceNormal, vec3 viewVec, float terrain_height) {
         
  vec3 refractedVec = normalize(refract(viewVec, surfaceNormal, 1.0/1.33)); // 1.0/1.33 = indice de refraction air/water
  
  // Modification de worldPosition en fonction de l'angle de refraction
  vec3 posRefracted = worldPosition;
  
  posRefracted += refractedVec * clamp(-terrain_height, 0.0, 200.0) * 0.15;
    
  // projection to camera space
  vec4 posProjected = uPMatrix * uMVMatrix * vec4(posRefracted, 1.0);
    
  // projection to screen space
  posProjected = ((posProjected / posProjected.w) + 1.0) * 0.5;
                
  vec4 refractionColor = texture2D(uSceneColor, posProjected.xy);

  return refractionColor;
}

vec3 getWaterNormal() {
  
  // random noise
  //float noise = texture2D(uNoise, vUv*16.0).r;
  float noise = 0.0;
  float size_mod = 100.0;
  
  // Time
  float phase0 = (noise * 0.05) + (time1 * 0.01);
  float phase1 = (noise * 0.05) + (time2 * 0.01);
    
  // Water flow direction
  vec2 flowdir = vec2(1.0, 0.0);
  //vec2 flowdir = normalize((texture2D(uFlowMap, vUv).rg) * 2.0 - 1.0);
    
  // Matrix to shift the water normal texture toward the flow direction
  mat2 rotmat = mat2(flowdir.x, -flowdir.y, flowdir.y ,flowdir.x);
  
  // Big waves
  vec3 normalT0 = texture2D(uSampler, (rotmat * vUv) * 100.0 + vec2(phase0, 0.0)).rgb;
  vec3 normalT1 = texture2D(uSampler, (rotmat * vUv) * 100.0 + vec2(phase1, 0.0)).rgb;
    
  // Small waves
  vec3 normalT3 = texture2D(uSampler, (rotmat * vUv) * 440.0 + vec2(phase0, 0.0) * 2.0).rgb;
  vec3 normalT4 = texture2D(uSampler, (rotmat * vUv) * 440.0 + vec2(phase1, 0.0) * 2.0).rgb;
    
  normalT1 = normalT1 + normalT4 - 1.0;
  normalT0 = normalT0 + normalT3 - 1.0;

  float flowLerp = (abs(1.5 - time1) / 1.5);
  vec3 newNormal = mix(normalT0, normalT1, flowLerp);

  return newNormal;
}

void main(void){

  /*
    0. Setting up variables
  */    
  
  vec3 viewVec = normalize(worldPosition - eye);
  float waterDist = length(worldPosition - eye);
  vec3 sunVec = normalize(sunDirection);
  
  /*
    1. Check if the water is visible or not
  */

  vec4 colorTerrain = texture2D(uSceneColor, gl_FragCoord.xy/canvasSize);

  //gl_FragColor = vec4( colorTerrain.xyz, 1.0 );

  
  // distance between the terrain and the camera
  float d_scene = colorTerrain.w;
  
  // distance between the water and the camera
  float d_water = (gl_FragCoord.z / gl_FragCoord.w);

  // distance between the terrain and the water from the camera POV
  float diff = d_scene - d_water;
  
  // Water visible
  if (diff >= 0.0 || d_scene == 1.0) {
    // Water surface normal
    //vec3 surfaceNormal = normalize(getNoise(worldPosition.xz).xzy * vec3(2.0, clamp(waterDist*0.001, 1.0, 10.0), 2.0));
    vec3 surfaceNormal = getWaterNormal();
    surfaceNormal = normalize(surfaceNormal.xzy * vec3(1.0, clamp(d_water * 0.001, 1.0, 10.0), 1.0));

    // Reflection Color
    vec3 reflectedVec = normalize( reflect( viewVec, surfaceNormal ) ); 
    reflectedVec.y = -abs(reflectedVec.y);
    reflectedVec.x *= -1.0;
    
    vec3 reflectionColor = textureCube( uSkyCube, reflectedVec ).rgb;

    // Only calculate reflection if the terrain is not visible
    if ( d_scene == 1.0 ) {
        gl_FragColor = vec4( reflectionColor, 1.0 );
    } else {
        // Refraction Color
        vec4 refractionColor = calcRefractionColor(surfaceNormal, viewVec, diff, d_water);

        // Distance between the camera and the refracted point
        float d_scene_refracted = refractionColor.w;
        // Distance between the refracted point and the water
        float diff_refracted = d_scene_refracted - d_water;

        float r = 0.4;
        
        float y = float(diff_refracted > 0.0);
        vec3 originalOrRefraction = (y * refractionColor.rgb) + ((1.0 - y) * colorTerrain.rgb);
        
        vec3 finalColor = (originalOrRefraction * (1.0 - r)) + (reflectionColor * r);
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
  } else { 
    gl_FragColor = vec4(colorTerrain.rgb, 1.0);
  }
    
    
    
  /*  
  // random noise
  //float noise = texture2D(uNoise, vUv*16.0).r;
  float noise = 0.0;
    
  // Time
  float phase0 = (noise * 0.05) + (time1 * 0.01);
  float phase1 = (noise * 0.05) + (time2 * 0.01);
    
  // Water flow direction
  vec2 flowdir = vec2(1.0, 0.0);
  //vec2 flowdir = normalize((texture2D(uFlowMap, vUv).rg) * 2.0 - 1.0);
    
  // Matrix to shift the water normal texture toward the flow direction
  mat2 rotmat = mat2(flowdir.x, -flowdir.y, flowdir.y ,flowdir.x);
    
  // Big waves
  vec3 normalT0 = texture2D(uSampler, (rotmat * vUv)*100.0 + vec2(phase0, 0.0)).rgb;
  vec3 normalT1 = texture2D(uSampler, (rotmat * vUv)*100.0 + vec2(phase1, 0.0)).rgb;
    
  // Small waves
  vec3 normalT3 = texture2D(uSampler, (rotmat * vUv)*440.0 + vec2(phase0, 0.0) * 2.0).rgb;
  vec3 normalT4 = texture2D(uSampler, (rotmat * vUv)*440.0 + vec2(phase1, 0.0) * 2.0).rgb;
    
  normalT1 = normalT1 + normalT4 - 1.0;
  normalT0 = normalT0 + normalT3 - 1.0;

  float flowLerp = (abs(1.5 - time1) / 1.5);
  vec3 newNormal = mix(normalT0, normalT1, flowLerp);
  vec3 surfaceNormal = normalize(newNormal.xzy * vec3(1.0, clamp(waterDist*0.001, 1.0, 10.0), 1.0));   *//*
  vec3 surfaceNormal = normalize(getNoise(worldPosition.xz).xzy * vec3(2.0, clamp(waterDist*0.001, 1.0, 10.0), 2.0));
    
  
  vec3 reflectionColor = calcReflectionColor(surfaceNormal, sunVec, viewVec);
  

  vec4 colorTerrain = texture2D(uSceneColor, gl_FragCoord.xy/canvasSize);
        
  // distance between the terrain and the camera
  float d_scene = colorTerrain.w;
  // distance between the water and the camera
  float d_water = (gl_FragCoord.z / gl_FragCoord.w); 
  //float d_water = LinearizeDepth(gl_FragCoord.z);
    
  // distance between the terrain and the water from the camera POV
  float diff = d_scene - d_water; 
        
         
  vec3 refractedVec = normalize(refract(viewVec, surfaceNormal, 1.0/1.33)); // 1.0/1.33 = indice de refraction air/water
    
  // Modification de worldPosition en fonction de l'angle de refraction
  vec3 posRefracted = worldPosition;
  posRefracted += refractedVec*clamp(diff, 0.0, 100.0)*0.2;
    
  // projection to camera space
  vec4 posProjected = uPMatrix*uMVMatrix*vec4(posRefracted, 1.0);
    
  // projection to screen space
  posProjected = ((posProjected / posProjected.w) + 1.0) * 0.5;
                
  vec4 refractionColor = texture2D(uSceneColor, posProjected.xy);

  // Distance between the camera and the refracted point
  float d_scene_refracted = refractionColor.w;
  // Distance between the refracted point and the water
  float diff_refracted = d_scene_refracted - d_water;
  */
  //vec4 refractionColor = texture2D(uSceneColor, gl_FragCoord.xy/canvasSize);
  /*
    4. Calculating color
  */
    
  //float r = 0.4;
  //gl_FragColor = vec4((refractionColor.rgb * (1.0 - r)) + (reflectionColor*r), 1.0);
  /*
    if(diff >= 0.0) {
    if(diff_refracted >= 0.0) {
    gl_FragColor = vec4((refractionColor.rgb * (1.0 - r)) + (reflectionColor*r), 1.0);
    } else {
    gl_FragColor = vec4((colorTerrain.rgb * (1.0 - r)) + (reflectionColor*r), 1.0);
    }
    } else if(d_scene == 1.0) {
    gl_FragColor = vec4(reflectionColor, 1.0);
    } else {
    gl_FragColor = vec4(colorTerrain.rgb, 1.0);
    }
  */
  //gl_FragColor = vec4(-flowdir, 0.0, 1.0);
    
}
