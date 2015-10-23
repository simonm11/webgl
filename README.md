# Rendering engine using WebGL

![test](http://i.imgur.com/Da6pZie.jpg)

I started this project as a way to learn OpenGL. I decided to do it in WebGL because I was curious and interested in the technology.

Since I simply cared about learning about OpenGL/WebGL, I didn't use any existing 3D library (no three.js) and tried to implement everything from -- more or less -- scratch.

Here is what I managed to implement (I'll go in details about each a bit down, if anyone is interested) :

* [Terrain](#terrain) : Draw a terrain mesh using a height map + number of levels of details configurable.
* [Textures](#textures) : Bump Mapping + realistic textures blending.
* [Shadows](#shadows) : Shadows using Cascaded Variance Shadow Map.
* [Sky](#sky) : Sky procedurally generated
* [Water](#water) : refraction + sky reflection
* [objects](#objects) : Scene picking + Colision

# Terrain
# Textures

Bump Mapping + texture blending :

![text1](http://i.imgur.com/l5cOxBA.png)![text2](http://i.imgur.com/RmAHqiv.png)

# Shadows

![shadow1](http://imgur.com/EVHfaxW)

# Sky
# Water

![water](http://imgur.com/4CVdb7v)

# Objects

