precision highp float;

#extension GL_OES_standard_derivatives : enable

varying vec2 vTextureCoord;
//varying vec3 vLightWeighting;
varying vec4 vVertexPosition;
varying vec3 vVertexNormal;
varying vec3 vTransformedNormal;
varying vec4 vWorldVertex;
varying vec3 pos;

uniform sampler2D uSampler;
uniform sampler2D uSampler1;
uniform sampler2D uSampler2;
uniform sampler2D uSamplerNormal;

uniform vec3 uTranslation;
uniform float unitMode;
uniform float uFarPlane;
uniform float uNearPlane;

uniform mat4 uViewMatrix;

uniform vec3 uLightingDirection;
uniform vec2 mouseIndexPosition;

uniform mat4 uPMatrix;
uniform mat4 uMVMatrix;
		
uniform vec3 uAmbientColor;
uniform vec3 uDirectionalColor;

float Near = 1.0;
float Far = uFarPlane;
float LinearDepthConstant = 1.0 / (Far - Near);

vec2 packHalf (float depth) {
	const vec2 bias = vec2(1.0 / 255.0,
				0.0);
							
	vec2 colour = vec2(depth, fract(depth * 255.0));
	return colour - (colour.yy * bias);
}

vec4 pack (float depth)
{
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



void main(void) {

	float linearDepth = (length(vVertexPosition)-uNearPlane) * LinearDepthConstant;

	//float moment1 = linearDepth;
	//float moment2 = moment1 * moment1;
	//gl_FragColor = vec4(packHalf(moment1), packHalf(moment2));
	

	
	//vec3 worldNormal = normalize(vWorldNormal);
	//vec3 lightPos = (lightView * vWorldPosition).xyz;
	//float linearDepth = clamp(length(lightPos)/40.0, 0.0, 1.0);
	
	//float dx = dFdx(linearDepth);
	//float dy = dFdy(linearDepth);
	//gl_FragColor = vec4(linearDepth, pow(linearDepth, 2.0) + 0.25*(dx*dx + dy*dy), 0.0, 1.0);

	//float linearDepth = length(vVertexPosition) * LinearDepthConstant;

	gl_FragColor = pack(linearDepth);
}
