precision highp float;

#extension GL_OES_standard_derivatives : enable
#extension GL_EXT_draw_buffers : enable
#define M_PI 3.1415926535897932384626433832795


const int NB_CASCADE_SPLIT = 4;

varying vec4 vPosition[NB_CASCADE_SPLIT];

void main(void) {

	
  //float linearDepth = (length(vVertexPosition)-uNearPlane) * LinearDepthConstant;
  //gl_FragColor = vec4(vec3(linearDepth), 1.0);
    
  //gl_FragColor = vec4(vec3((gl_FragCoord.z / gl_FragCoord.w)), 1.0);
  /* 
  for (int i = 0; i < NB_CASCADE_SPLIT; i++) {
    float depth = vPosition[i].z / vPosition[i].w;
    
    float dx = dFdx(depth);
    float dy = dFdy(depth);
    gl_FragData[i] = vec4(depth, pow(depth, 2.0) + 0.25*(dx*dx + dy*dy), 0.0, 1.0);
  }
  */
  
  float depth = (gl_FragCoord.z / gl_FragCoord.w);
    
  float dx = dFdx(depth);
  float dy = dFdy(depth);
  gl_FragColor = vec4(depth, pow(depth, 2.0) + 0.25*(dx*dx + dy*dy), 0.0, 1.0);
   
  //gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
