precision highp float;

uniform vec2 uTextureSize;
uniform sampler2D uSample0;

varying vec2 vUv;



float packColor(vec3 color) {
    return color.r + color.g * 256.0 + color.b * 256.0 * 256.0;
}

vec3 unpackColor(float f) {
    vec3 color;
    color.b = floor(f / 256.0 / 256.0);
    color.g = floor((f - color.b * 256.0 * 256.0) / 256.0);
    color.r = floor(f - color.b * 256.0 * 256.0 - color.g * 256.0);
    // now we have a vec3 with the 3 components in range [0..256]. Let's normalize it!
    return color / 256.0;
}

void main () {  
    
    vec4 data = texture2D(uSample0, vUv);
    
    
    float packedNormal = texture2D(uSample0, gl_FragCoord.xy / 1024.0).y;
    
    vec3 normal;
    
    normal.x = floor((packedNormal / (256.0 * 256.0)) - 1.0/255.0);
    normal.y = floor((packedNormal - (normal.x * 256.0 * 256.0)) / 256.0);
    normal.z = (packedNormal - (normal.x * 256.0 * 256.0) - (normal.y * 256.0));
    
    normal /= 256.0;
    normal = (normal * 2.0) - 1.0;

    gl_FragColor = vec4(data);
    
    // t = 128256000;
 /*   float a = floor((t / (256.0 * 256.0)) - 1.0/255.0); // a = 128
    float b = floor((t - (a * 256.0 * 256.0)) / 256.0); // b = 256
    float c = (t - (a * 256.0 * 256.0) - (b * 256.0));
    
    //gl_FragColor = vec4((t - floor(t / 1000.0) * 1000.0) / 256.0, 0.0, 0.0, 1.0);
	
    gl_FragColor = vec4(a / 256.0, b / 256.0, c / 256.0, 1.0);
    */
    /*
    if ( testR != a || testG != b || testB != c ) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    } else {
        gl_FragColor = vec4(a / 256.0, b / 256.0, c / 256.0, 1.0);
    }
    */
    
    
}
