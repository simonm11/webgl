precision highp float;

uniform vec4 uColor;

varying vec3 vVertexPosition;
varying vec3 vVertexColor;

void main(){
		gl_FragColor = vec4((vVertexColor[0] + uColor[0])/2.0, vVertexColor[1] + uColor[1], vVertexColor[2] + uColor[2], uColor[3]);
}
