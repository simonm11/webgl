precision highp float;

#extension GL_OES_standard_derivatives : enable
#define M_PI 3.1415926535897932384626433832795
 
/*
	Varyings
*/
varying vec2 vTextureCoord;
varying vec4 vVertexPosition;
varying vec3 vVertexNormal;

varying vec3 vLightDir;

//varying vec3 vEyeDirection;

varying vec4 vPositionLights[4];
varying vec3 worldPosition;
/*
	Textures Uniforms
*/
uniform sampler2D uSamplerSand;
uniform sampler2D uSamplerSandNormal;

uniform sampler2D uSamplerSand2;
uniform sampler2D uSamplerSand2Normal;

uniform sampler2D uSamplerDirt;
uniform sampler2D uSamplerDirtNormal;

uniform sampler2D uSamplerRock;
uniform sampler2D uSamplerRockNormal;

uniform sampler2D uDepthMap;
uniform sampler2D uDepthMap2;
uniform sampler2D uDepthMap3;
uniform sampler2D uDepthMap4;
uniform sampler2D uNoise;

uniform sampler2D uGrid;

uniform sampler2D uDepthMaps[4];

/*
    Engine constantes
*/
uniform vec2 uDepthMapSize;

/*
	Camera Matrix
*/
uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat3 uNormalMatrix;

uniform vec3 eyePosition;

/*
	Light Uniforms
*/
uniform vec3 uAmbientColor;
uniform vec3 uDirectionalColor;
uniform vec3 uLightingDirection;

/*
	Mouse Position
*/
uniform vec2 mouseIndexPosition;

/*
    Map constants
*/
uniform float uHeightScale;
uniform float uMapSize;

/*
	Distance between the light and the closest object and the furthest object
*/
uniform float uFarPlane;
uniform float uNearPlane;

/*
	Mode
	1 = Normal
	2 = DepthMap
	3 = ShadowMap
*/
uniform float uMode;

float Near = uNearPlane;
float Far = uFarPlane;
float LinearDepthConstant = 1.0 / (Far - Near);


/*
	Transform the depth value into RGBA values
*/
vec4 pack (float depth) {
	const vec4 bias = vec4(1.0 / 255.0,
				1.0 / 255.0,
				1.0 / 255.0,
				0.0);

	float r = depth;
	float g = fract(r * 255.0);
	float b = fract(g * 255.0);
	float a = fract(b * 255.0);
	vec4 colour = vec4(r, g, b, a);
	
	return colour - (colour.yzww * bias);
}

/*
	Retrieve the depth value from a RGBA value
*/
float unpack (vec4 colour) {
	const vec4 bitShifts = vec4(1.0,
					1.0 / 255.0,
					1.0 / (255.0 * 255.0),
					1.0 / (255.0 * 255.0 * 255.0));
	return dot(colour, bitShifts);
}

/*
	Normal depthMap lookup
*/
float texture2DCompare(sampler2D depths, vec2 uv, float compare){
    float depth = texture2D(depths, uv).x;
    return step(compare, depth);
}

/*
	depthMap lookup using linear interpolation
*/
float texture2DShadowLerp(sampler2D depths, vec2 size, vec2 uv, float compare){
    vec2 texelSize = vec2(1.0)/size;
    vec2 f = fract(uv*size+0.5);
    vec2 centroidUV = floor(uv*size+0.5)/size;

    float lb = texture2DCompare(depths, centroidUV+texelSize*vec2(0.0, 0.0), compare);
    float lt = texture2DCompare(depths, centroidUV+texelSize*vec2(0.0, 1.0), compare);
    float rb = texture2DCompare(depths, centroidUV+texelSize*vec2(1.0, 0.0), compare);
    float rt = texture2DCompare(depths, centroidUV+texelSize*vec2(1.0, 1.0), compare);
    float a = mix(lb, lt, f.y);
    float b = mix(rb, rt, f.y);
    float c = mix(a, b, f.x);
    return c;
}

/*
	Percentage Closer Filter function using linear interpolation
*/
float PCF(sampler2D depths, vec2 size, vec2 uv, float compare){
    float result = 0.0;
    for(int x=-1; x<=1; x++){
        for(int y=-1; y<=1; y++){
            vec2 off = vec2(x,y)/size;
			
            result += texture2DShadowLerp(depths, size, uv+off, compare);
        }
    }
    return result/9.0;
}

/*
	getTextureColor
*/
vec3 getTextureColor(vec4 color, vec4 normal) {
	
	// Check the XZ angle for the texture normal
	float l1 = (dot(uLightingDirection, vec3(-1.0, 0.0, 0.0)));
	float l2 = (dot(uLightingDirection, vec3(0.0, 0.0, 1.0)));
	
	l1 = ((normal.a - 0.5)*l1) + 0.5;
	l2 = ((normal.g - 0.5)*l2) + 0.5;
	
	l1 = smoothstep(0.2, 0.8, l1);
	l2 = smoothstep(0.2, 0.8, l2);
	
	return (color.rgb * (l1 + l2));
}

vec3 getTextureColor3(vec4 color, vec4 normal) {

	// convert normal map texture to normal vector
	vec3 vNormal = vec3(cos(normal.a*M_PI), sin(normal.a*M_PI) * sin(normal.g*M_PI), cos(normal.g*M_PI));

	// diffuse lighting calculation
	float directionalLightWeighting = max(dot(vLightDir, vNormal), 0.0);
	
	// specular lighting calculation
	//vec3 eyeDirection = normalize(eyePosition - pos);
	//vec3 reflectionDirection = reflect(-vLightDir, vNormal);
	
	//float specularLightWeighting = pow(max(dot(uNormalMatrix * eyeDirection, reflectionDirection), 0.0), color.a);
	//float specularLightWeighting = pow(max(dot(vEyeDirection, reflectionDirection), 0.0), (1.0 - color.a) * 255.0);
	//(uDirectionalColor * directionalLightWeighting) + 
	color.rgb = pow(color.rgb, vec3(2.2));
	vec3 f = color.rgb * (uDirectionalColor * directionalLightWeighting) + uAmbientColor*0.5;
	
	vec3 gamma = vec3(1.0/2.2);
	return pow(f, gamma);
}

vec4 getTextureColor2(vec4 diffuseColor, vec4 normal) {
    
    // convert normal map texture to normal vector
    vec3 vNormal = vec3(cos(normal.a*M_PI), sin(normal.a*M_PI) * sin(normal.g*M_PI), cos(normal.g*M_PI));

    // diffuse lighting calculation
    float directionalLightWeighting = max(dot(vLightDir, vNormal * vec3(1.0, 1.0, -1.0) ), 0.0);
	
    // specular lighting calculation
    vec3 reflectionDirection = reflect(-vLightDir, vNormal * vec3(1.0, 1.0, -1.0));

    //float specularLightWeighting = max(dot(vEyeDirection, reflectionDirection), 0.0);
    //vec3 specularColor = vec3(diffuseColor.a*specularLightWeighting*directionalLightWeighting*2.0);
    
    vec4 color = vec4((diffuseColor.rgb * ((uDirectionalColor * directionalLightWeighting) + uAmbientColor) /*+ specularColor*/), diffuseColor.a);
    
    return color;
}

float LinearizeDepth(float val) {
  float n = 10.0; // camera z near
  float f = 6000.0; // camera z far
  
  return (2.0 * n) / (f + n - val * (f - n));	
}

float ChebyshevUpperBound(vec2 Moments, float t) {
    // One-tailed inequality valid if t &gt; Moments.x
    float p = smoothstep(t-0.02, t, Moments.x);
    // Compute variance.
    float Variance = Moments.y - (Moments.x*Moments.x);
   // Variance = max(Variance, -0.001);
    // Compute probabilistic upper bound.
    float d = t - Moments.x;
    float p_max = Variance / (Variance + d*d);
    return max(p, p_max);
}

float linstep(float low, float high, float v){
    return clamp((v-low)/(high-low), 0.0, 1.0);
}

float VSM(sampler2D depths, vec2 uv, float compare){
    vec2 moments = texture2D(depths, uv).xy;
    float p = smoothstep(compare-0.02, compare, moments.x);
    float variance = max(moments.y - moments.x*moments.x, -0.001);
    float d = compare - moments.x;
    float p_max = linstep(0.2, 1.0, variance / (variance + d*d));
    return clamp(max(p, p_max), 0.0, 1.0);
}

const vec4 far_d = vec4(300.0*3.36, 1000.0*3.36, 1700.0*3.36, 3000.0*3.36);

int depthMapIndex(float depth) {
    
    vec4 index;
    
    vec3 fComparison;
    fComparison.x = float(depth > far_d.x);
    fComparison.y = float(depth > far_d.y);
    fComparison.z = float(depth > far_d.z);
    
    float fIndex = dot(
        vec3( 3 > 0,
            3 > 1,
            3 > 2)
        , fComparison);
        
    fIndex = min(fIndex, 3.0);

    return int(fIndex);
}

void main(void) {

  // if(uMode == 1.0) {
    
    //vec4 grid = texture2D(uGrid, worldPosition.xz / uMapSize);
    
    // Terrain textures horrizontal
    //vec4 textureDirt = 			texture2D(uSamplerDirt, vec2(vTextureCoord.s, vTextureCoord.t));
    //vec4 textureDirtNormal = 	texture2D(uSamplerDirtNormal, vec2(vTextureCoord.s, vTextureCoord.t));	
    
    //vec4 textureSand = 			texture2D(uSamplerSand, vec2(vTextureCoord.s, vTextureCoord.t));
    //vec4 textureSandNormal = 	texture2D(uSamplerSandNormal, vec2(vTextureCoord.s, vTextureCoord.t));
		
    vec4 textureSand2 = 		texture2D(uSamplerSand2, vec2(vTextureCoord.s, vTextureCoord.t));
    vec4 textureSand2Normal =	texture2D(uSamplerSand2Normal, vec2(vTextureCoord.s, vTextureCoord.t));
		
    //vec4 textureRock = 			texture2D(uSamplerRock, vec2(vTextureCoord.s, vTextureCoord.t));
    //vec4 textureRockNormal = 	texture2D(uSamplerRockNormal, vec2(vTextureCoord.s, vTextureCoord.t));
    
    // Terrain textures vertical
    /*vec4 textureDirt = 			texture2D(uSamplerDirt, vec2((pos.y / uHeightScale)*2.0, vTextureCoord.t));
      vec4 textureDirtNormal = 	texture2D(uSamplerDirtNormal, vec2((pos.y / uHeightScale)*2.0, vTextureCoord.t));
        
      vec4 textureDirt2 = 		texture2D(uSamplerDirt, vec2(vTextureCoord.s, (pos.y / uHeightScale)*2.0));
      vec4 textureDirtNormal2 = 	texture2D(uSamplerDirtNormal, vec2(vTextureCoord.s, (pos.y / uHeightScale)*2.0));
    */
    vec4 textureDirt3 = 	    texture2D(uSamplerDirt, vec2(vTextureCoord.s, vTextureCoord.t));
    vec4 textureDirtNormal3 = 	texture2D(uSamplerDirtNormal, vec2(vTextureCoord.s, vTextureCoord.t));
        
    float noise = (texture2D(uNoise, vec2(vTextureCoord.s, vTextureCoord.t)/16.0).r * 2.0) - 1.0;
        
    // Lighting
    float directionalLightWeighting = max(dot(uLightingDirection, vVertexNormal), 0.0);	
    vec3 lightWeighting = uAmbientColor + (uDirectionalColor*directionalLightWeighting);	

    vec4 sandColor = getTextureColor2(textureSand2, textureSand2Normal);
    //vec4 rockColor = getTextureColor2(textureDirt, textureDirtNormal);
    //vec4 rockColor2 = getTextureColor2(textureDirt2, textureDirtNormal2);
    vec4 rockColor3 = getTextureColor2(textureDirt3, textureDirtNormal3);

    //vec4 sandColor = textureSand2 * vec4(lightWeighting, 1.0);
    //vec4 rockColor3 = textureDirt3 * vec4(lightWeighting, 1.0);
    
    //float xC = abs(dot(vVertexNormal, vec3(1.0, 0.0, 0.0)));
    float yC = abs(dot(vVertexNormal, vec3(0.0, 1.0, 0.0)));
    //float zC = abs(dot(vVertexNormal, vec3(0.0, 0.0, 1.0)));
        
    //vec4 yColor = (rockColor * xC) + (rockColor2 * zC) + abs((rockColor3 * ((1.0 - xC) - zC)));
        
    vec4 yColor = rockColor3;
        
    float sandContrib;
        
       
    sandContrib = smoothstep(0.7+(yColor.a*2.0)+(noise*0.25), 1.0, yC);
    sandContrib = smoothstep(0.4, 0.6, sandContrib);
        
    vec4 colorFinal = sandColor * sandContrib + yColor * (1.0 - sandContrib);

    // colorFinal = vec4(sandContrib, 0.0, 0.0, 1.0);
    //colorFinal = sandColor*sandContrib + yColor*(1.0-sandContrib);
        
        
    //float textureSandContribution = 1.0 - smoothstep(-2.0, 10.0, pos.y);		
    //float rockTextureContribution = pow((clamp(dot(vVertexNormal, vec3(0.0, 1.0, 0.0)), 0.0, 1.0)), 5.0);	
		
    //vec3 color = sandColor;
    //vec3 color = (((textureDirt.rgb * fTexture0Contribution + textureColor2.rgb * tex2Contribution )) * (1.0 - textureSandContribution)) + (sandColor * textureSandContribution);
    //vec3 color = (sandColor * (rockTextureContribution)) + (rockColor * (1.0-rockTextureContribution));
    
    /*
      Shadows
    */

    float shadow = 1.0;
    
    vec3 depths[4];
    depths[0] = vPositionLights[0].xyz / vPositionLights[0].w;
    depths[1] = vPositionLights[1].xyz / vPositionLights[1].w;
    depths[2] = vPositionLights[2].xyz / vPositionLights[2].w;
    depths[3] = vPositionLights[3].xyz / vPositionLights[3].w;

    int index = depthMapIndex(length(vVertexPosition));
    
    float d = length(vVertexPosition);
    
    /*
      Variance Shadow map
    */

    float t = 0.0;
    
    float t1 = smoothstep(0.7, 1.0, 1.0 - vPositionLights[0].x);
    float t2 = smoothstep(0.7, 1.0, vPositionLights[0].x);    
    float t3 = smoothstep(0.7, 1.0, 1.0 - vPositionLights[0].y);
    float t4 = smoothstep(0.7, 1.0, vPositionLights[0].y);
    

    t = max(t1 + t2, t3 + t4);
    
    float tt = 0.0;
    
    float tt1 = smoothstep(0.7, 1.0, 1.0 - vPositionLights[1].x);
    float tt2 = smoothstep(0.7, 1.0, vPositionLights[1].x);    
    float tt3 = smoothstep(0.7, 1.0, 1.0 - vPositionLights[1].y);
    float tt4 = smoothstep(0.7, 1.0, vPositionLights[1].y);
    
    tt = max(tt1 + tt2, tt3 + tt4);
    
    float ttt = 0.0;
    
    float ttt1 = smoothstep(0.7, 1.0, 1.0 - vPositionLights[2].x);
    float ttt2 = smoothstep(0.7, 1.0, vPositionLights[2].x);    
    float ttt3 = smoothstep(0.7, 1.0, 1.0 - vPositionLights[2].y);
    float ttt4 = smoothstep(0.7, 1.0, vPositionLights[2].y);
    
    ttt = max(ttt1 + ttt2, ttt3 + ttt4);
    
    float c1 = 1.0 - t;
    float c2 = t - tt;
    float c3 = tt - ttt;
    float c4 = ttt;
    
    float shadow1 = VSM(uDepthMaps[0], depths[0].xy, depths[0].z);
    float shadow2 = VSM(uDepthMaps[1], depths[1].xy, depths[1].z);
    float shadow3 = VSM(uDepthMaps[2], depths[2].xy, depths[2].z);
    float shadow4 = VSM(uDepthMaps[3], depths[3].xy, depths[3].z);
    
    shadow = shadow1*c1 + shadow2*c2 + shadow3*c3 + shadow4*c4;

    vec2 moments = texture2D(uDepthMaps[0], depths[0].xy).xy;
    
    vec4 col = vec4(c1, c2+c4, c3+c4, 1.0);
    
    //colorFinal = mix(colorFinal, col, 0.5);
    
    /*
      Exponential Shadow map
    */
    /*
      float c = 40.0;
      vec4 texel = texture2D(uDepthMap, depth.xy);		
      //float var = depth.z - unpack(texel);
      shadow = clamp(exp(-c * (depth.z - unpack(texel))), 0.0, 1.0);
    */
		
    /*
      Percentage Close Filter
    */	
    /*
      shadow = PCF(uDepthMap, uDepthMapSize, depth.xy, depth.z);
      float linearDepth = (length(vVertexPosition)-1.0) * (1.0 / (5000.0 - 1.0));
      gl_FragColor = vec4(color*clamp(shadow, 0.6, 1.0), 1.0);
    */

    //colorFinal = mix(colorFinal, grid, 0.5);

    //gl_FragColor = vec4(vec3(moments.x), (gl_FragCoord.z / gl_FragCoord.w));
    gl_FragColor = vec4(vec3(colorFinal)*clamp(shadow, 0.7, 1.0), (gl_FragCoord.z / gl_FragCoord.w));

}
