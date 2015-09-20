# Rendering engine using WebGL

I started this project as a way to learn OpenGL, I decided to do it in WebGL because I was curious and interested in the technology.

Since I simply cared about learning about OpenGL/WebGL, I didn't use any existing 3D library (no three.js) and tried to implement everything from -- more or less -- scratch.

Here is what I managed to implement (I'll go in details about each a bit down, if anyone is interested) :

* Draw a terrain mesh using a height map.
* Terrain texturing based on terrain slope and realistic textures blending.
* Shadows using Cascade Variance Shadow Map.
* Procedural Sky
* Water + refraction + sky reflection
* clickable object (scene picking method)
* object colision

### Terrain


