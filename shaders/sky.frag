precision highp float;

uniform mat3 uNMatrix;
uniform mat4 projNMatrix;

uniform vec4 sky_params1;
uniform vec4 sky_params2;
uniform vec4 sky_params3;
uniform vec4 sky_params4;
uniform vec4 sky_params5;
uniform vec4 sky_params6;

uniform sampler2D uSceneColor;
uniform vec2 canvasSize;

uniform vec3 sunDirection;

varying vec3 vVertexPosition;

vec3 calcExtinction(float dist) {
  return exp(dist * sky_params6.xyz);
}
 
vec3 calcScattering(float cos_theta) {
  float r_phase = (cos_theta * cos_theta) * sky_params6.w + sky_params6.w;
  float m_phase = sky_params1.w * pow(sky_params2.w * cos_theta + sky_params3.w, -1.5);
  return sky_params2.xyz * r_phase + (sky_params3.xyz * m_phase);
}
 
float baseOpticalDepth(in vec3 ray) {
  float a1 = sky_params4.x * ray.y;
  return sqrt(a1 * a1 + sky_params4.w) - a1;
}
 
float opticalDepth(in vec3 pos, in vec3 ray) {
  pos.y += sky_params4.x;
  float a0 = sky_params4.y - dot(pos, pos);
  float a1 = dot(pos, ray);
  return sqrt(a1 * a1 + a0) - a1;
}

float linstep(float low, float high, float v){
    return clamp((v-low)/(high-low), 0.0, 1.0);
}

void main(void) {

	vec3 sun_vec = normalize(sunDirection);
	
	vec3 view_vec = normalize(vVertexPosition.xyz);

	float cos_theta = dot(view_vec, sun_vec);
	
	float ray_dist = baseOpticalDepth(view_vec);

	vec3 extinction = calcExtinction(ray_dist);
	
	vec3 light_ray_pos = view_vec * (ray_dist * sky_params4.z);
	
	
	
	float light_ray_dist = opticalDepth(light_ray_pos, sun_vec);
	
	
	
	float light_ray_dist_full = opticalDepth(view_vec * ray_dist, sun_vec);
	
	
	light_ray_dist = max(light_ray_dist, light_ray_dist_full);
 
	// cast a ray towards the sun and calculate the incoming extincted light
	vec3 incoming_light = calcExtinction(light_ray_dist);


	// calculate the in-scattering
	vec3 scattering = calcScattering(cos_theta);
	scattering *= 1.0 - extinction;
	 
	// combine
	vec3 in_scatter = incoming_light * scattering;
	 
	// sun disk sky_params1.x
	float sun_strength = clamp(cos_theta * sky_params1.x + sky_params1.y, 0.0, 10.0);

	sun_strength *= sun_strength;
    
	vec3 sun_disk = extinction * sun_strength;
	
    // sky_params5.w -> sun sky intensity
    
	gl_FragColor.xyz = sky_params5.xyz * (sky_params5.w * sun_disk + in_scatter);
    //gl_FragColor.xyz = vec3(sun_strength);
        
    gl_FragColor.x = pow(gl_FragColor.x, 1.0/2.0);
    gl_FragColor.y = pow(gl_FragColor.y, 1.0/2.0);
    gl_FragColor.z = pow(gl_FragColor.z, 1.0/2.0);
    gl_FragColor.w = 1.0;

}
