precision highp float;

#extension GL_OES_standard_derivatives : enable
#define M_PI 3.1415926535897932384626433832795

// Textures

uniform sampler2D uSamplerSand;
uniform sampler2D uSamplerSandNormal;

uniform sampler2D uSamplerSand2;
uniform sampler2D uSamplerSand2Normal;

uniform sampler2D uSamplerDirt;
uniform sampler2D uSamplerDirtNormal;

uniform sampler2D uSamplerRock;
uniform sampler2D uSamplerRockNormal;

uniform sampler2D uHeightMap;
uniform sampler2D uNoise;

// map constantes

uniform float uMapSize;
uniform float uHeightScale;
uniform float uMode;
uniform float uUVScale;
uniform float uWaterLevel;

// Lighting uniforms

uniform vec3 uDirectionalColor;
uniform vec3 uAmbientColor;


// Varyings
varying vec4 vPositionLights[4];
varying vec3 vLightDir;
varying vec3 vEyeDirection;
varying vec3 vWorldPosition;
varying vec3 vVertexNormal;
varying vec4 vVertexPosition;

/**
*   Diffuse, normal bump mapping and specular lighting
*/
vec4 getTextureColor(vec4 diffuseColor, vec4 normal) {
    
    // convert normal map texture to normal vector
    vec3 vNormal = vec3( cos(normal.a * M_PI), 
                         sin(normal.a * M_PI) * sin(normal.g * M_PI), 
                         cos(normal.g * M_PI) );

    // diffuse lighting calculation
    float diffWeighting = max( dot(vLightDir, vNormal ), 0.0 );
    
    // specular lighting calculation
    vec3 reflectionDirection = reflect(-vLightDir, vNormal);

    float specWeighting = max( dot(vec3(0.0, 1.0, 0.0), reflectionDirection), 0.0 );
    vec3 specularColor = vec3(diffuseColor.a * specWeighting * diffWeighting * 2.0);
    
    vec4 color = vec4((diffuseColor.rgb * ((uDirectionalColor * diffWeighting) + uAmbientColor) /*+ specularColor*/), diffuseColor.a);

    //vec4 color = vec4((diffuseColor.rgb * ((uDirectionalColor * diffWeighting) + uAmbientColor) /*+ specularColor*/), 1.0);
    
    return color;
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

void main() {
    
    if ( vWorldPosition.x < 0.0 || vWorldPosition.z < 0.0 || vWorldPosition.x > uMapSize || vWorldPosition.z > uMapSize) {
        discard;
    }

    vec2 uv = (vWorldPosition.xz / uMapSize) * uUVScale;
    
    // Sample textures
    
    vec4 textureSand2 = 	texture2D(uSamplerSand2, uv);
    vec4 textureSand2Normal =	texture2D(uSamplerSand2Normal, uv);
		
    vec4 textureDirt3 = 	texture2D(uSamplerDirt, uv);
    vec4 textureDirtNormal3 = 	texture2D(uSamplerDirtNormal, uv);
    
    vec4 sandColor = getTextureColor(textureSand2, textureSand2Normal);
    vec4 rockColor3 = getTextureColor(textureDirt3, textureDirtNormal3);
    
    float noise = (texture2D(uNoise, uv / 16.0).r * 2.0) - 1.0;
    
    vec4 yColor = rockColor3;
        
    float sandContrib;
    
    float yC = abs(dot(vVertexNormal, vec3(0.0, 1.0, 0.0)));
    sandContrib = smoothstep(0.7 + (yColor.a * 2.0) + (noise * 0.25), 1.0, yC);
    sandContrib = smoothstep(0.4, 0.6, sandContrib);
        
    vec4 colorFinal = sandColor * sandContrib + yColor * (1.0 - sandContrib);

    gl_FragColor = vec4(vec3(colorFinal), (gl_FragCoord.z / gl_FragCoord.w));   
}
