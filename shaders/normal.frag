precision highp float;

uniform vec2 uTextureSize;
uniform sampler2D uSample0;

vec3 get(float x, float y){
    vec2 uv = (gl_FragCoord.xy+vec2(x,y))/512.0; 
    float h = texture2D(uSample0, uv).x;
    return vec3(uv.x*20.0, h*10.0, uv.y*20.0);
}

vec3 getn(vec3 pos, float x, float y){
    vec3 v = get(x, y) - pos;
    vec3 perp = cross(vec3(0.0, 1.0, 0.0), v);
    return normalize(cross(v, perp));
}

void main(){
    vec3 pos = get(0.0, 0.0);
    vec3 normal =  normalize((
        getn(pos, -1.0,  1.0) +
        getn(pos,  0.0,  1.0) +
        getn(pos,  1.0,  1.0) +
        getn(pos, -1.0,  0.0) +
        getn(pos,  1.0,  0.0) +
        getn(pos, -1.0, -1.0) +
        getn(pos,  0.0, -1.0) +
        getn(pos,  1.0, -1.0)
    )/8.0);
    

    normal = ((normal * 0.5) + 0.5) * 256.0;
    

    float t =   (floor(normal.r) * 256.0 * 256.0) + 
                (floor(normal.g) * 256.0) + 
                (floor(normal.b));
   
    
    gl_FragColor = vec4(t, normal.r, normal.g, normal.b);
}
