precision highp float;

uniform int uMode;
uniform vec4 uColor;

uniform float uFarPlane;
uniform float uNearPlane;

varying vec4 vWorldPosition;

float Near = 1.0;
float Far = uFarPlane;
float LinearDepthConstant = 1.0 / (Far - Near);

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

void main(){
	
    // depthMap
    if(uMode == 2) {

		float linearDepth = ( length(vWorldPosition) - uNearPlane ) * LinearDepthConstant;
		gl_FragColor = pack(linearDepth);
    
	} else {
    
		gl_FragColor = vec4(uColor.xyz, (gl_FragCoord.z / gl_FragCoord.w));
	
    }

}
