precision highp float;

uniform vec2 TexelSize;
uniform sampler2D Sampler0;
uniform sampler2D Sampler1;

varying vec2 vUv;

float unpack (vec4 colour) {
    const vec4 bitShifts = vec4(1.0,
				1.0 / 255.0,
				1.0 / (255.0 * 255.0),
				1.0 / (255.0 * 255.0 * 255.0));
    return dot(colour, bitShifts);
}


void main () {
    vec4 color;

    float c1 = unpack(texture2D(Sampler0, vUv));
    float c2 = unpack(texture2D(Sampler1, vUv));
	
    if(c1 < c2) {
	gl_FragColor = texture2D(Sampler0, vUv);
    } else {
	gl_FragColor = texture2D(Sampler1, vUv);
    }

}
