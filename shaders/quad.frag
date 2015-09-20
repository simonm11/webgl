precision highp float;

uniform sampler2D diffuse;

varying vec2 texCoord;

float unpackHalf (vec2 colour)
{
	return colour.x + (colour.y / 255.0);
}

float unpack (vec4 colour) {
	const vec4 bitShifts = vec4(1.0,
					1.0 / 255.0,
					1.0 / (255.0 * 255.0),
					1.0 / (255.0 * 255.0 * 255.0));
	return dot(colour, bitShifts);
}

float LinearizeDepth(vec2 uv) {
  float n = 1.0; // camera z near
  float f = 100.0; // camera z far
  float z = texture2D(diffuse, uv).x;
  return (2.0 * n) / (f + n - z * (f - n));	
}

void main(){

		float deptha = unpack(texture2D(diffuse, texCoord));
		//float deptha = unpackHalf(texture2D(diffuse, texCoord).xy);
	
		//gl_FragColor = vec4(deptha, deptha, deptha, 1.0);

		//vec4 color = texture2D(diffuse, texCoord);
		//gl_FragColor = vec4(color.rgb/2.0, 1.0);
		
		float d;
		if (texCoord.x < 0.5) // left part
		d = LinearizeDepth(texCoord);
		else // right part
		d = texture2D(diffuse, texCoord).x;
		gl_FragColor = vec4(d, d, d, 1.0);
}
