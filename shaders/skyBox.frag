precision highp float;

uniform sampler2D uSceneColor;
uniform samplerCube uSkyCubeColor;

uniform vec2 canvasSize;

varying vec3 vVertexPosition;

void main(void) {
  
  vec4 colorTerrain = texture2D(uSceneColor, gl_FragCoord.xy/canvasSize);
    
  if(colorTerrain.w != 1.0) {
    gl_FragColor = vec4(vec3(colorTerrain), 1.0);
  } else {
  
    vec3 view_vec = normalize(vVertexPosition);
    vec4 color = textureCube( uSkyCubeColor, view_vec );
    
    gl_FragColor = vec4(color.rgb, 1.0);
  }
}
