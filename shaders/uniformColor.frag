precision highp float;

uniform vec4 uColor;

void main(){
		gl_FragColor = vec4(uColor[0], uColor[1], uColor[2], 1.0);
}
