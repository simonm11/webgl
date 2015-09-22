/*
  Engine class
*/

/*global vec3, mat4, mat3, console, Gui, Map, jQuery, Keyboard, Mouse, document, THREE, $, Float32Array, Uint16Array, requestAnimFrame, setTimeout, loadShaders, alert, setAttributes, setUniforms, Player*/
/*jshint sub: true */

/**
 Enum of states
*/
var states = Object.freeze({
    // not init
    STOPPED_0 : 0,
    // init with buffers already in memory
    STOPPED_1 : 1,
    // paused
    PAUSED : 2,
    // running menu
    RUNNING_0 : 3,
    // running game
    RUNNING_1 : 4,
    // Loading phase
    LOADING_0 : 5
});

/**
 *   Engine constructor
 *   @param {webglContext} Webgl rendering context
 */
var Engine = function (gl) {
    
    'use strict';

    // current state of the program (stopped, paused etc..)
    this.state = states.STOPPED_0;

    // array of reference to opengl extensions in use
    this.ext = undefined;

    // reference to webgl object
    this.gl = gl;

    // array of shader programs
    this.shaderPrograms = undefined;

    // value of the loading bar at the start
    this.loadingVal = undefined;

    // ratio from opengl units to meters
    this.unitToMeter = 0;

    // reference to the terrain/map
    this.map = undefined;

    // array of (game) objects (could be players, weapons, trees etc..)
    this.objs = undefined;

    // array of players (a player is defined in player.js)
    this.players = [];

    // reference to the 'main' player (who YOU are)
    this.me = undefined;

    // reference to the keyboard class (manage inputs etc..)
    this.keyboard = undefined;

    // reference to the mouse class
    this.mouse = undefined;

    // webgl buffers 
    this.buffers = [];

    // template of object mesh (cube, rectangles etc..)
    this.objectsModels = [];

    // reference to the graphical interface (written in JS, not opengl)
    this.gui = undefined;

    // array of textures used
    this.textures = [];

    // array of framebuffers
    this.fbo = [];

    // used for object selection (scene picking), this should contain each color of each pixel after a left-click
    this.colorMap = [];

    // size of each depthMap used for shadows
    this.depthMapSize = {h: 0.0, w: 0.0};

    // initialisation of camera variables (could create a Camera class later)
    this.cameraPos = vec3.create();
    this.cameraPitch = -18;
    this.cameraYaw = -85;
    this.mvMatrix = mat4.create();
    this.normalMatrix = mat3.create();
    this.pMatrix = mat4.create();
    this.viewBox = [];
    this.strafSpeed = 0;
    this.speed = 0;
    this.yawRate = 0;
    this.pitchRate = 0;

    this.flowMapOffset0 = 0.0;
    this.flowMapOffset1 = 0.0;
        
    // initialisation of the variable related to the sun (could create a Light class later)
    this.lightDirection = vec3.create([0.0, 0.0, 0.0]);
    this.lightPitch = 0;
    this.lightYawn = 0;
    this.lightMVMatrix = mat4.create();
    this.lightPMatrix = mat4.create();
    this.lightNearPlane = 0;
    this.lightFarPlane = 0;

    // array of lights positions that will be used for cascade shadow mapping technique
    this.cascadeLights = [];
    this.nbCascadeSplit = 0;

    // Timers
    this.shadowMapsLastUpdate = 0;
    this.cameraLastUpdate = 0;
    this.lightLastUpdate = 0;
    this.skyBoxLastUpdate = 0;

    // make sure the object hasn't already been created
    if ( Engine.instanced === undefined ) {

	Engine.instanced = true;

    } else {
	
        console.log('Error : Engine already created');

	return false;

    }

    // check if the WebGl context is valid
    if ( !this.gl ) {
	
        console.log('Error : webgl context undefined');

	return false;

    }

    return this;
};

/**
 *   Initialisation of the engine
 *   @return success
 */
Engine.prototype.init = function () {

    'use strict';

    if ( this.state !== states.STOPPED_0 ) {
        console.log('Error : Engine is running');
        return false;
    }
    
    // Create GUI (JS GUI)
    this.gui = new Gui(this);
    this.gui.start();
    
    this.loadingVal = 0.0;
    this.depthMapSize = {w: 1024/4.0, h: 1024/4.0};
    this.nbCascadeSplit = 4;
    this.unitToMeter = 0.10;
    
    this.state = states.STOPPED_1;
    
    return true;
};

/**
 *   Reset the engine to its original state
 *   @return success
 */
Engine.prototype.reset = function() {

    'use strict';
    
    this.stop();
    this.init();
};


/**
 *   Stop the engine
 */
Engine.prototype.stop = function() {

    'use strict';

    this.state = states.STOPPED_0;

};

/**
 *   Start rendering
 */
Engine.prototype.start = function() {

    'use strict';
    
    var that = this;

    // Error if the engine is already running
    if (this.state !== states.STOPPED_1) {
        console.log('Warning : Engine is already running');
        return -1;
    }
    
    this.state = states.LOADING_0;
    
    var d = jQuery.Deferred();
    var nbTask = 3;
    
    // enable all the needed extentions
    this.enableExtensions();
    
    // Init framebuffers
    this.initAllFramebuffers();
    
    // Load, Compile And Link Shader
    this.initShaders(50.0).then(function(){
	
        nbTask -= 1;
        if(!nbTask) {
            d.resolve();
        }
    });
    
    // Create and load map
    this.map = new Map(this);

    this.map.downloadHeightMap("heightmaps/terrain5.raw", 16).then(function(){
    //this.map.downloadHeightMap("heightmaps/terrain0-16bbp-257x257.raw", 16).then(function(){

        var now, tmp;

        now = new Date().getTime();

        that.map.generateVertexPosition();

        tmp = new Date().getTime() - now;    
        now = new Date().getTime();
        console.log("GenerateVertexPosition : " + tmp + "ms");

        that.map.generateIndexes();

        tmp = new Date().getTime() - now;
        now = new Date().getTime();
        console.log("generateIndexes : " + tmp + "ms");

        that.map.generateNormals();

        tmp = new Date().getTime() - now;
        now = new Date().getTime();
        console.log("generateNormals : " + tmp + "ms");

        that.initBuffers();

        tmp = new Date().getTime() - now;
        now = new Date().getTime();
        console.log("initBuffers : " + tmp + "ms");

        that.initObjectsModels();

        tmp = new Date().getTime() - now;
        now = new Date().getTime();
        console.log("initObjectsModels : " + tmp + "ms");

	
        // Starting position in the middle of the map
        that.cameraPos = [that.map.sizeInUnits / 2, 0, that.map.sizeInUnits / 2];
        
        nbTask -= 1;
        if(!nbTask) {
            d.resolve();
        }      
    });
    
    // Create players
    this.players[0] = new Player(0, [1.0, 0.0, 0.0]);
    this.players[1] = new Player(1, [0.0, 1.0, 0.0]);
    
    this.me = this.players[0];

    // Create object manager
    this.objs = new ObjsManager(this, this.map.sizeInUnits, this.map.sizeInUnits);

    
    // add some units to the map
    for ( var i = 0; i < 3; i++ ) {
	
        this.objs.add(TYPE.UNIT, 0, [20.0 * ( Math.floor(i / 20.0) ), 0, 20.0 * ( i % 20.0 )], this.me);
	
    }
    
    // Make it move
    this.objs.o[0].addAction(ACT.MOVE, [150, 0, 150]);
    
    //this.textures['dudvwater'] = loadDDSTexture(this.gl, this.ext['compressedTexture'], "textures/dudvwaternvidia.dds");
    //this.textures['ddswater'] = loadDDSTexture(this.gl, this.ext['compressedTexture'], "textures/water.dds");
    //this.textures['noise'] = loadDDSTexture(this.gl, this.ext['compressedTexture'], "textures/noise.dds");
    //this.textures['ddssand'] = loadDDSTexture(this.gl, this.ext['compressedTexture'], "textures/desertworld_7.dds");
    //this.textures['heightMap'] = loadDDSTexture(this.gl, this.ext['compressedTexture'], "textures/terrainTest4.dds");
    
    
    // load textures
    this.initTextures(50.0).then(function(){  

	nbTask -= 1;
           
        if(!nbTask) {
            d.resolve();
        }
	
    });
    
    
    // Once everything is done and has been loaded
    d.promise().then(function() {
	
        function disableContextMenu(e) {
	    e.preventDefault();
	    return -1;
	}
        
        that.state = states.RUNNING_1;
        that.gl.clearColor(1.0, 1.0, 1.0, 1.0);
        
        that.keyboard = new Keyboard(that);
        that.mouse = new Mouse(that);
        
        document.onkeydown = function(e){that.keyboard.handleKeyDown(e);};
        document.onkeyup = function(e){that.keyboard.handleKeyUp(e);};
        
        document.addEventListener("mouseup", function(e){that.mouse.up(e);}, false);
	document.addEventListener("mousemove", function(e){that.mouse.move(e);}, false);
	document.addEventListener("mousedown", function(e){that.mouse.down(e);}, false);
	document.addEventListener("contextmenu", disableContextMenu, false);
        

        if (that.map.renderingMode == 'gpu') {

	    // map is currently stored in an array, in gpu mode, it must be in a texture to be loaded by the gpu
            that.map.convertArray();
	    //that.map.randomHeightMap(512.0, 512.0)
	    
	    // if lod mode is also activated, we need to create a grid
	    if ( that.map.lod ) {
		
		that.map.createLodGrid();

	    }
        }
	
        // main rendering loop
        that.renderTick(0);

	// main logic loop
	that.logicTick(new Date().getTime());
    });
};

Engine.prototype.setMatrixUniformsLight = function(prog, i) {

    'use strict';

    if ( this.cascadeLights[i] !== undefined ) {
	
	var s = 'cParams[' + i + ']';
	
	this.gl.uniformMatrix4fv( prog[s + '.mvMatrix'], false, this.cascadeLights[i].mvMatrix );
	this.gl.uniformMatrix4fv( prog[s + '.pMatrix'], false, this.cascadeLights[i].pMatrix );
	this.gl.uniform1f( prog[s + '.farPlane'], this.cascadeLights[i].lightFarPlane );
	this.gl.uniform1f( prog[s + '.nearPlane'], this.cascadeLights[i].lightNearPlane );
    }
};

Engine.prototype.setMatrixUniforms = function(prog) {

    'use strict';

    this.gl.uniformMatrix4fv(prog.uPMatrix, false, this.pMatrix);
    this.gl.uniformMatrix4fv(prog.uMVMatrix, false, this.mvMatrix);
    
    var normalMatrix = mat3.create();
    mat4.toInverseMat3(this.mvMatrix, normalMatrix);
    //mat3.transpose(normalMatrix);

    this.gl.uniformMatrix3fv(prog.uNormalMatrix, false, normalMatrix);	
};

var init = new Date();

function pow4(val) {

    'use strict';

    val = val * val;
    return val * val;
}


function sqr(val) {

    'use strict';

    return val * val;
}

/**
 *   Return 8 points delimiting the current view frustum (this is used for the shadow map)
 *   @param {float} far plane distance
 *   @return {array} 8 vec3 representing the 6 planes of the view frustum
 */
Engine.prototype.viewFrustumUnaltered = function(far) {

    'use strict';

    var gl = this.gl;
    
    var nearDist = 10.0;
    var farDist = far;
    var fov = 90.0;
    var ratio = gl.viewportWidth / gl.viewportHeight;
    var p = this.cameraPos;
    
    var d = vec3.create(); 
    d[0] = -Math.sin(this.cameraYaw*Math.PI/180)*Math.cos(this.cameraPitch*Math.PI/180);
    d[1] = Math.sin(this.cameraPitch*Math.PI/180);
    d[2] = -Math.cos(this.cameraYaw*Math.PI/180)*Math.cos(this.cameraPitch*Math.PI/180);
    
    // Calculating up and right vectors
    var right = vec3.normalize(vec3.cross(d, [0.0, 1.0, 0.0], []));
    var up = vec3.normalize(vec3.cross(right, d, []));

    // Planes width and heigh
    var Hnear = 2 * Math.tan(fov / 2) * nearDist;
    var Wnear = Hnear * ratio;
    
    var Hfar = 2 * Math.tan(fov / 2) * farDist;
    var Wfar = Hfar * ratio;
    
    /* View frustum far plane */
    
    // fc = p + (d * farDist)
    var fc = vec3.create();
    fc[0] = p[0] + (d[0] * farDist);
    fc[1] = p[1] + (d[1] * farDist);
    fc[2] = p[2] + (d[2] * farDist);
    
    // ftl = fc + (up * Hfar/2) - (right * Wfar/2)
    var ftl = vec3.create();
    ftl[0] = fc[0] + (up[0]*Hfar/2) - (right[0]*Wfar/2);
    ftl[1] = fc[1] + (up[1]*Hfar/2) - (right[1]*Wfar/2);
    ftl[2] = fc[2] + (up[2]*Hfar/2) - (right[2]*Wfar/2);
    
    // fbl = fc - (up * Hfar/2) - (right * Wfar/2)
    var fbl = vec3.create();
    fbl[0] = fc[0] - (up[0]*Hfar/2) - (right[0]*Wfar/2);
    fbl[1] = fc[1] - (up[1]*Hfar/2) - (right[1]*Wfar/2);
    fbl[2] = fc[2] - (up[2]*Hfar/2) - (right[2]*Wfar/2);
    
    // ftr = fc + (up * Hfar/2) + (right * Wfar/2)
    var ftr = vec3.create();
    ftr[0] = fc[0] + (up[0]*Hfar/2) + (right[0]*Wfar/2);
    ftr[1] = fc[1] + (up[1]*Hfar/2) + (right[1]*Wfar/2);
    ftr[2] = fc[2] + (up[2]*Hfar/2) + (right[2]*Wfar/2);
    
    // fbr = fc - (up * Hfar/2) + (right * Wfar/2)
    var fbr = vec3.create();
    fbr[0] = fc[0] - (up[0]*Hfar/2) + (right[0]*Wfar/2);
    fbr[1] = fc[1] - (up[1]*Hfar/2) + (right[1]*Wfar/2);
    fbr[2] = fc[2] - (up[2]*Hfar/2) + (right[2]*Wfar/2);
    
    /* View frustum near plane */
    
    // nc = p + d * nearDist 
    var nc = vec3.create();
    nc[0] = p[0] + (d[0] * nearDist);
    nc[1] = p[1] + (d[1] * nearDist);
    nc[2] = p[2] + (d[2] * nearDist);
    
    // ntl = nc + (up * Hnear/2) - (right * Wnear/2)
    var ntl = vec3.create();
    ntl[0] = nc[0] + (up[0]*Hnear/2) - (right[0]*Wnear/2);
    ntl[1] = nc[1] + (up[1]*Hnear/2) - (right[1]*Wnear/2);
    ntl[2] = nc[2] + (up[2]*Hnear/2) - (right[2]*Wnear/2);
    
    // ntr = nc + (up * Hnear/2) + (right * Wnear/2)
    var ntr = vec3.create();
    ntr[0] = nc[0] + (up[0]*Hnear/2) + (right[0]*Wnear/2);
    ntr[1] = nc[1] + (up[1]*Hnear/2) + (right[1]*Wnear/2);
    ntr[2] = nc[2] + (up[2]*Hnear/2) + (right[2]*Wnear/2);
    
    // nbl = nc - (up * Hnear/2) - (right * Wnear/2)
    var nbl = vec3.create();
    nbl[0] = nc[0] - (up[0]*Hnear/2) - (right[0]*Wnear/2);
    nbl[1] = nc[1] - (up[1]*Hnear/2) - (right[1]*Wnear/2);
    nbl[2] = nc[2] - (up[2]*Hnear/2) - (right[2]*Wnear/2);
    
    // nbr = nc - (up * Hnear/2) + (right * Wnear/2)
    var nbr = vec3.create();
    nbr[0] = nc[0] - (up[0]*Hnear/2) + (right[0]*Wnear/2);
    nbr[1] = nc[1] - (up[1]*Hnear/2) + (right[1]*Wnear/2);
    nbr[2] = nc[2] - (up[2]*Hnear/2) + (right[2]*Wnear/2);
    

    var points = [];
    points[0] = [ntl[0], ntl[1], ntl[2]];
    points[1] = [ntr[0], ntr[1], ntr[2]];
    points[2] = [nbr[0], nbr[1], nbr[2]];
    points[3] = [nbl[0], nbl[1], nbl[2]];
    points[4] = [ftl[0], ftl[1], ftl[2]];
    points[5] = [ftr[0], ftr[1], ftr[2]];
    points[6] = [fbr[0], fbr[1], fbr[2]];
    points[7] = [fbl[0], fbl[1], fbl[2]];
    
    return points;
};

/**
 *   Create each split light frustm and update the related view and projection matrices
 */
Engine.prototype.updateCascadeShadowMaps = function(cascadeIndex) {

    'use strict';
    
    // 1. Determine how to split the frustum
    // 
    // For now, this is done manually
    // TODO: find those values automatically based on map.sizeInMeters
    var splits = [50.0, 200.0, 600.0, 3000.0];

    //
    // 2. For each interval, create a view frustum
    //

    // each view frustum will be stored in this.cascadeLights
    // if it hasn't been defined yet, we do it
    if(this.cascadeLights[cascadeIndex] === undefined) {

        this.cascadeLights[cascadeIndex] = {};

        // a view frustum is defined by :

        // a model view matrix, telling where the light (the sun here) is.
        this.cascadeLights[cascadeIndex].mvMatrix = mat4.create();

        // a projection matrix
        this.cascadeLights[cascadeIndex].pMatrix = mat4.create();

        // the far plane distance
        this.cascadeLights[cascadeIndex].lightFarPlane = 0.0;

        // the near plane distance
        this.cascadeLights[cascadeIndex].lightNearPlane = 0.0;

    }
    
    var farDist = splits[cascadeIndex];
    
    // Create the view frustum
    var points = this.viewFrustumUnaltered(farDist);
    
    var center = vec3.create([0.0, 0.0, 0.0]); 
    var j;

    // The goal here is to find the center of the view frustum 
    // To do that, we do the average of each vertices contained in 'points', and story it into 'center'

    for ( j in points ) {

        vec3.add( center, points[j] );

    }
    
    vec3.scale(center, 1.0/points.length);

    // Now that we have the center, we need to find the radius of the bounding cercle
    
    var radius = 0;

    // For simplicity purposes, the radius of the bounding sphere is equal to the maximum distance between
    // the center and each points
    for ( j in points ) {
        radius = Math.max( vec3.length( vec3.subtract( points[j], center, [] ) ), radius );
    }
    
    // Calculate position of the light for this current frustum split (center + (direction*farDist))
    var ExtraBackup = 0.0;//20.0;
    var NearClip = 0.0;//1.0;
    
    var backupDist = ExtraBackup + NearClip + radius;

    var shadowCamPos = [];
    shadowCamPos[0] = center[0] + (this.lightDirection[0] * backupDist);
    shadowCamPos[1] = center[1] + (this.lightDirection[1] * backupDist);
    shadowCamPos[2] = center[2] + (this.lightDirection[2] * backupDist);

    // Current near and far clip for the light
    var near = -500.0;
    var far = radius*2.0 + 400.0;
    
    // Model view matrix
    mat4.lookAt(shadowCamPos, center, [0.0, 1.0, 0.0], this.cascadeLights[cascadeIndex].mvMatrix);
    
    // Orthogonal projection matrix
    var bounds = radius/2.0;
    mat4.ortho(-bounds, bounds, -bounds, bounds, near, far, this.cascadeLights[cascadeIndex].pMatrix);
    
    // Make sure the view matrix only moves in increment of 1/shadowMapSize
    var refMV = this.cascadeLights[cascadeIndex].mvMatrix;
    var refP = this.cascadeLights[cascadeIndex].pMatrix;
    
    refMV[12] *= this.depthMapSize.w*0.5*refP[0];
    refMV[12] = Math.floor(refMV[12]);
    refMV[12] /= this.depthMapSize.w*0.5*refP[0];
    
    refMV[13] *= this.depthMapSize.h*0.5*refP[5];
    refMV[13] = Math.floor(refMV[13]);
    refMV[13] /= this.depthMapSize.h*0.5*refP[5];
    
    this.cascadeLights[cascadeIndex].LightNearPlane = near;
    this.cascadeLights[cascadeIndex].LightFarPlane = far;
    
};

/**
 *   Update the direction, position, modelview matrix and projection matrix of the sun
 */
Engine.prototype.updateLight = function() {
    
    'use strict';

    this.lightLastUpdate = new Date().getTime();

    // Update LightDirection
    this.lightDirection[0] = Math.cos(this.lightYawn) * Math.cos(this.lightPitch);
    this.lightDirection[1] = Math.sin(this.lightPitch);
    this.lightDirection[2] = Math.sin(this.lightYawn) * Math.cos(this.lightPitch);

};

/**
 *   Compute and send to the shader the necessary values for sky (and water) rendering
 *   credits to Conor Dickinson for this.
 *   @param {shaderProgram} shader program where to send the values   
 */
Engine.prototype.setSkyParamUniforms = function(prog) {

    'use strict';
    
    /* Reading the variable values from the html */
    var sky_props = {};
    sky_props.clarity = parseFloat($( "#label-clarity" ).text());
    sky_props.density = parseFloat($( "#label-density" ).text());
    sky_props.pollution = parseFloat($( "#label-pollution" ).text());
    sky_props.planet_scale = parseFloat($( "#label-planet-scale" ).text());
    sky_props.atmosphere_scale = parseFloat($( "#label-atmosphere-scale" ).text());
    sky_props.sun_disk_radius =  parseFloat($( "#label-disk-radius" ).text());
    sky_props.brightness = parseFloat($( "#label-brightness" ).text());
    sky_props.sun_disk_intensity = parseFloat($( "#label-disk-intensity" ).text());
    
    
    var sky_params1 = vec3.create();
    var sky_params2 = vec3.create();
    var sky_params3 = vec3.create();
    var sky_params4 = vec3.create();
    var sky_params5 = vec3.create();
    var sky_params6 = vec3.create();
    
    var sky_params1w;
    var sky_params2w;
    var sky_params3w;
    var sky_params4w;
    var sky_params5w;
    var sky_params6w;
    
    var sky_lambda = vec3.create([680e-9, 550e-9, 450e-9]);
    var sky_k = vec3.create([0.686, 0.678, 0.766]);
    
    var earth_radius = 6.371e6;
    var earth_atmo_thickness = 0.1e6;
    
    var clarity = 1 + sky_props.clarity;
    var two_pi = 2 * Math.PI;
    
    // compute betaR
    var factor= 1.86e-31 / (clarity*Math.max(sky_props.density, 0.001));
    
    sky_params2[0] = factor / pow4(sky_lambda[0]);
    sky_params2[1] = factor / pow4(sky_lambda[1]);
    sky_params2[2] = factor / pow4(sky_lambda[2]);

    // compute betaM
    factor = 1.36e-19 * Math.max(sky_props.pollution, 0.001);
    sky_params3[0] = factor * sky_k[0] * sqr(two_pi / sky_lambda[0]);
    sky_params3[1] = factor * sky_k[1] * sqr(two_pi / sky_lambda[1]);
    sky_params3[2] = factor * sky_k[2] * sqr(two_pi / sky_lambda[2]);
    

    // betaR + betaM, -(betaR + betaM), betaR / (betaR + betaM), betaM / (betaR + betaM)
    sky_params1 = vec3.add(sky_params2, sky_params3, sky_params1);
    var tmp = vec3.create();
    tmp = vec3.add(sky_params2, sky_params3, tmp);
    sky_params6 = vec3.scale(tmp, -1);
    
    sky_params2[0] = sky_params2[0] / sky_params1[0];
    sky_params2[1] = sky_params2[1] / sky_params1[1];
    sky_params2[2] = sky_params2[2] / sky_params1[2];
    
    sky_params3[0] = sky_params3[0] / sky_params1[0];
    sky_params3[1] = sky_params3[1] / sky_params1[1];
    sky_params3[2] = sky_params3[2] / sky_params1[2];
    
    // mie scattering phase constants
    var g = 0.2*(1 - sky_props.pollution) + 0.75;
    sky_params1w =  sqr(1 - g) / (4 * Math.PI);
    sky_params2w = -2 * g;
    sky_params3w = 1 + sqr(g);
    
    var planet_radius = earth_radius * sky_props.planet_scale;
    var atmo_radius = planet_radius + earth_atmo_thickness * sky_props.atmosphere_scale;
    sky_params4[0] = planet_radius;
    sky_params4[1] = atmo_radius * atmo_radius;
    sky_params4[2] = 0.15 + (0.75 * this.lightDirection[1]);
    sky_params4w = atmo_radius * atmo_radius - planet_radius * planet_radius;
    
    // sun disk cutoff
    sky_params1[1] = -(1 - (0.015 * sky_props.sun_disk_radius));
    sky_params1[0] = 1 / (1 + sky_params1[1]);
    sky_params1[1] *= sky_params1[0];
    
    sky_params5 = vec3.scale([4.0, 4.0, 4.0], sky_props.brightness);
    sky_params5w = sky_props.sun_disk_intensity;
    
    sky_params6w =( 3 * clarity) / (16 * Math.PI);	

    this.gl.uniform4f(prog.sky_params1, sky_params1[0], sky_params1[1], sky_params1[2], sky_params1w);
    this.gl.uniform4f(prog.sky_params2, sky_params2[0], sky_params2[1], sky_params2[2], sky_params2w);
    this.gl.uniform4f(prog.sky_params3, sky_params3[0], sky_params3[1], sky_params3[2], sky_params3w);
    this.gl.uniform4f(prog.sky_params4, sky_params4[0], sky_params4[1], sky_params4[2], sky_params4w);
    this.gl.uniform4f(prog.sky_params5, sky_params5[0], sky_params5[1], sky_params5[2], sky_params5w);
    this.gl.uniform4f(prog.sky_params6, sky_params6[0], sky_params6[1], sky_params6[2], sky_params6w);

};

/**
 *   Render a frustum with lines
 */
Engine.prototype.renderFrustum = function(points) {
    
    'use strict';
    
    var gl = this.gl;
 
    var indices = [
        0, 1,
        2, 3,
        4, 5,
        6, 7,
        
        8, 9,
        10, 11,
        12, 13,
        14, 15,
        
        16, 17,
        18, 19,
        20, 21,
        22, 23
    ];
    
    var lines = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lines);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    
    var indicesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
       
    var prog = this.shaderPrograms.uniformColor;  
    gl.useProgram(prog);
    
    gl.enableVertexAttribArray(prog.aVertexPosition);
    gl.uniform4fv(prog.uColor, [1.0, 0.0, 0.0, 1.0]);
    gl.uniform3fv(prog.uTranslation, [0.0, 0.0, 0.0]);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, lines);
    this.setMatrixUniforms(prog);
    
    
    gl.vertexAttribPointer(prog.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.drawElements(gl.LINES, points.length/3, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.disableVertexAttribArray(prog.aVertexPosition);

};

/**
 *   Change resolution of a texture
 */
Engine.prototype.downSample = function(from, to, x, y, w, h) {
    
    'use strict';

    var gl = this.gl;
    
    if(to !== null) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, to.framebuffer);
    }
    else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    // Set up the verticies and indices
    var quadVerts = [
        -1,  1,  0, 1,
        -1, -1,  0, 0,
        1,  1,  1, 1,

        -1, -1,  0, 0,
        1, -1,  1, 0,
        1,  1,  1, 1
    ];

    var quadVertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVerts), gl.STATIC_DRAW);
    
    gl.viewport(x, y, w, h);

    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);	
    
    gl.disable(gl.DEPTH_TEST);
    var prog = this.shaderPrograms['downSample'];
    
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertBuffer);
    
    gl.enableVertexAttribArray(prog.aVertexPosition);
    gl.enableVertexAttribArray(prog.aTexturePosition);
    gl.vertexAttribPointer(prog.aVertexPosition, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(prog.aTexturePosition, 2, gl.FLOAT, false, 16, 8);
    
    gl.uniform2f(prog.uTextureSize, gl.viewportWidth, gl.viewportHeight);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(prog.uSample0, 0);
    gl.bindTexture(gl.TEXTURE_2D, from.texture);


    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.enable(gl.DEPTH_TEST);
    gl.disableVertexAttribArray(prog.aVertexPosition);
    gl.disableVertexAttribArray(prog.aTexturePosition);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

/**
 *   Apply FXAA to a texture
 */
Engine.prototype.fxaa = function(from, to, w, h) {

    'use strict';

    var gl = this.gl;
    
    if(to !== null) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, to.framebuffer);
    }
    else { 
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    // Set up the verticies and indices
    var quadVerts = [
        -1,  1,  0, 1,
        -1, -1,  0, 0,
        1,  1,  1, 1,

        -1, -1,  0, 0,
        1, -1,  1, 0,
        1,  1,  1, 1
    ];

    var quadVertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVerts), gl.STATIC_DRAW);
    
    gl.viewport(0, 0, w, h);

    gl.disable(gl.DEPTH_TEST);
    var prog = this.shaderPrograms['fxaa'];
    
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertBuffer);
    
    gl.enableVertexAttribArray(prog.aVertexPosition);
    gl.vertexAttribPointer(prog.aVertexPosition, 2, gl.FLOAT, false, 16, 0);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(prog.uTexture, 0);
    gl.bindTexture(gl.TEXTURE_2D, from.texture);

    gl.uniform2fv(prog.uTexelSize, [1.0/w, 1.0/h]);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.disableVertexAttribArray(prog.aVertexPosition);
    gl.enable(gl.DEPTH_TEST);    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);	
};

/**
 *   Blur texture
 */
Engine.prototype.blur = function(from, to, orientation, w, h) {
    
    'use strict';
    
    var gl = this.gl;
    
    if(to !== null) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, to.framebuffer);
    }
    else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    // Set up the verticies and indices
    var quadVerts = [
        -1,  1,  0, 1,
        -1, -1,  0, 0,
        1,  1,  1, 1,

        -1, -1,  0, 0,
        1, -1,  1, 0,
        1,  1,  1, 1
    ];

    var quadVertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVerts), gl.STATIC_DRAW);
    
    gl.viewport(0, 0, w, h);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);	
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    
    gl.disable(gl.DEPTH_TEST);
    var prog = this.shaderPrograms['blur'];
    
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertBuffer);
    
    gl.enableVertexAttribArray(prog.aVertexPosition);
    gl.enableVertexAttribArray(prog.aTexturePosition);
    gl.vertexAttribPointer(prog.aVertexPosition, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(prog.aTexturePosition, 2, gl.FLOAT, false, 16, 8);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(prog.uSample0, 0);
    gl.bindTexture(gl.TEXTURE_2D, from.texture);

    gl.uniform2fv(prog.uTextureSize, [(1/w), (1/h)]);
    gl.uniform1i(prog.uOrientation, orientation);
    gl.uniform1i(prog.uBlurAmount, 5);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.enable(gl.DEPTH_TEST);
    gl.disableVertexAttribArray(prog.aVertexPosition);
    gl.disableVertexAttribArray(prog.aTexturePosition);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

/**
 * Create de DepthMap textures
 * The procedure is different depending if the heigh map is store in RAM (CPU mode) or 
 * if the height map is stored as a texture and read directly in the shaders (GPU mode)
 */
Engine.prototype.drawDepthMapCascade = function(fbo, split_id) {
    
    'use strict';
    
    if ( this.map.renderingMode == 'cpu' ) {

        this.drawDepthMapCascadeCPU(fbo, split_id);

    } else {

        this.drawDepthMapCascadeGPU(fbo, split_id);

    }
    
};

/**
 * 
 */
Engine.prototype.drawDepthMapCascadeGPU = function(fbo, split_id) {

    'use strict';

    var gl = this.gl;

    if(fbo !== null) {

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo.framebuffer);

    } else {

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    }
   
    gl.viewport(0, 0, this.depthMapSize.w, this.depthMapSize.h);   
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.map.renderDepthMapGPU(split_id);
    
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

}

/**
 * 
 */
Engine.prototype.drawDepthMapCascadeCPU = function(fbo, split_id) {
    var gl = this.gl;
    var i;
    
    if(fbo !== null) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
    }
    else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.viewport(0, 0, this.depthMapSize.w, this.depthMapSize.h);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    
    // Light POV
    var prog = this.shaderPrograms['depthMap'];
    gl.useProgram(prog);
    
    gl.enableVertexAttribArray(prog.aVertexPosition);
    
    gl.uniformMatrix4fv(prog["uMVMatrix"], false, this.cascadeLights[split_id].mvMatrix);
    gl.uniformMatrix4fv(prog["uPMatrix"], false, this.cascadeLights[split_id].pMatrix);

    i = 0;
    
    while(this.map.buffers['chunk'+i] !== undefined) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.map.buffers['chunk'+i]['position']);
        gl.vertexAttribPointer(prog.aVertexPosition, this.map.buffers['chunk'+i]['position'].itemSize, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.map.buffers['chunk'+i]['indexes']);
        
        if(this.ext['uintElementIndex']) {
            gl.drawElements(gl.TRIANGLES, this.map.buffers['chunk'+i]['indexes'].numItems, gl.UNSIGNED_INT, 0);
        }
        else {
            gl.drawElements(gl.TRIANGLES, this.map.buffers['chunk'+i]['indexes'].numItems, gl.UNSIGNED_SHORT, 0);
        }
        
        i+=1;
    }
    
    gl.disableVertexAttribArray(prog.aVertexPosition);
    
    gl.disable(gl.CULL_FACE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); 
};


/**
 * Render each side of the sky to the cube map
 * For efficiency purpose, this is only done when the light change
 */
Engine.prototype.updateSkyCube = function(fbo) {

    var camerasPitch = [0, 0, 90 + 180, 90, 0,  0];
    var camerasYawn =  [90, 90 + 180, 0, 180,  180, 0];

    this.gl.bindFramebuffer( this.gl.FRAMEBUFFER, fbo.framebuffer );

    // Render each face of the cube map 
    for ( i = 0; i < 6; i++ ) {

        // bind the right face of the cube map
        this.gl.framebufferTexture2D( this.gl.FRAMEBUFFER,
                                      this.gl.COLOR_ATTACHMENT0,
                                      this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
                                      fbo.texture,
                                      0
                                    );

        // render the sky to the face
        this.renderSkyCubeMap( fbo, camerasYawn[i], camerasPitch[i] );
    }

    this.gl.bindFramebuffer( this.gl.FRAMEBUFFER, null);
}

/**
 * First rendering pass 
 *
 * Draws :
 *   - Terrain
 *   - Objects
 *   - Shadows (assuming all the needed DepthMaps have already been rendered)
 */
Engine.prototype.pass1 = function(fbo) {
    
    'use strict';
    
    var gl = this.gl;
    
    if(fbo !== null) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
    }
    else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);   
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(90.0, gl.viewportWidth / gl.viewportHeight, 1.0, 100000.0, this.pMatrix);
    gl.enable(gl.DEPTH_TEST);

    
    this.cameraPos[1] = this.map.getHeightAt(this.cameraPos[0], this.cameraPos[2]) + (3.0 / this.unitToMeter) ;

    // View
    
    mat4.identity(this.mvMatrix);
    
    mat4.rotate(this.mvMatrix, -(this.cameraPitch * Math.PI / 180), [1, 0, 0]);
    mat4.rotate(this.mvMatrix, -(this.cameraYaw * Math.PI / 180), [0, 1, 0]);
    mat4.translate(this.mvMatrix, [-(this.cameraPos[0]), -(this.cameraPos[1]), -(this.cameraPos[2])]);
    
    // Draw Terrain
    
    var prog;
    
    if ( this.map.renderingMode == 'cpu') {
	
	prog = this.shaderPrograms['terrain'];

    } else {

	prog = this.shaderPrograms['terrainGPU'];

    }

    gl.useProgram(prog);

    gl.uniform3f(prog.uAmbientColor, 0.13, 0.12, 0.1);
    gl.uniform3fv(prog.uLightingDirection, this.lightDirection);
    gl.uniform3f(prog.uDirectionalColor, 1.0, 1.0, 1.0);
    
    this.setMatrixUniforms(prog);
    
    this.setMatrixUniformsLight(prog, 0);
    this.setMatrixUniformsLight(prog, 1);
    this.setMatrixUniformsLight(prog, 2);
    this.setMatrixUniformsLight(prog, 3);
    
    gl.uniform1f(prog.uMode, 1);
    gl.uniform3fv(prog.uEyesPosition, this.cameraPos);
    gl.uniform1f(prog.uHeightScale, this.map.heightScale);
    gl.uniform2f(prog.uDepthMapSize, this.depthMapSize.h, this.depthMapSize.w);
    
    this.map.render(prog);
    
    // Draw Objects
    
    prog = this.shaderPrograms['units'];

    gl.useProgram(prog);
    this.setMatrixUniforms(prog);
    
    this.objs.render(prog, 1);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);    
};

var previousT = (new Date()).getTime();

/**
 * Second rendering pass
 *   
 * Render :
 *   - Water
 *   - Sky
 */
Engine.prototype.pass2 = function(from, to) {
    
    'use strict';
    
    var gl = this.gl;
    var canvas = $('#webgl-canvas')[0];
    var prog;

    if(to !== null) {
        gl.bindFramebuffer( gl.FRAMEBUFFER, to.framebuffer );
    }
    else {
        gl.bindFramebuffer( gl.FRAMEBUFFER, null );
    }
    
    // 1. Sky		
    gl.disable(gl.DEPTH_TEST);

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    mat4.identity(this.mvMatrix);
    
    mat4.rotate(this.mvMatrix, -(this.cameraPitch*Math.PI / 180), [1, 0, 0]);
    mat4.rotate(this.mvMatrix, -(this.cameraYaw*Math.PI / 180), [0, 1, 0]);
    mat4.rotate(this.mvMatrix, -(180*Math.PI / 180), [0, 0, 1]);

    prog = this.shaderPrograms['skyBox'];
    
    gl.useProgram(prog);

    gl.enableVertexAttribArray(prog.aVertexPosition);

    this.setSkyParamUniforms(prog);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, from.texture);
    gl.uniform1i(prog.uSceneColor, 0);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.fbo['skyCubeMap'].texture);
    gl.uniform1i(prog.uSkyCubeColor, 1);
    
    gl.uniform2f(prog.canvasSize, canvas.width, canvas.height);
    this.setMatrixUniforms(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['cube'].vertexPosition);
    gl.vertexAttribPointer(prog.aVertexPosition, this.buffers['cube'].vertexPosition.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers['cube'].vertexIndex);
    gl.drawElements(gl.TRIANGLES, this.buffers['cube'].vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);

    gl.disableVertexAttribArray(prog.aVertexPosition);
    
    // Water
    
    mat4.rotate(this.mvMatrix, -( 180 * Math.PI / 180), [0, 0, 1]);
    mat4.translate(this.mvMatrix, [-this.cameraPos[0], -this.cameraPos[1], -this.cameraPos[2]]);

    prog = this.shaderPrograms['water'];

    gl.useProgram(prog);
    gl.enableVertexAttribArray(prog['aVertexPosition']);
    gl.enableVertexAttribArray(prog['aTexturePosition']);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures['waterNormal']);
    gl.uniform1i(prog['uSampler'], 0);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, from.texture);
    gl.uniform1i(prog['uSceneColor'], 1);
    
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.textures['noise']);
    gl.uniform1i(prog['uNoise'], 2);
    
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.textures['flowmap']);
    gl.uniform1i(prog['uFlowMap'], 3);

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.fbo['skyCubeMap'].texture);
    gl.uniform1i(prog['uSkyCube'], 4);
    
    var d = new Date();
    var n = d.getTime();
    
    var time = n-init;
    var timeS = time/2000;
    
    var elapsed = n - previousT;
    previousT = n;
    
    this.setSkyParamUniforms(this.shaderPrograms['water']);
    
    
    var flowSpeed = 1.0;
    var cycle = 3.0;
    
    this.flowMapOffset0 += flowSpeed * elapsed/1000.0;
    this.flowMapOffset1 += flowSpeed * elapsed/1000.0;
    
    if (this.flowMapOffset0 >= cycle) {
        this.flowMapOffset0 = 0.0;      
    }
    
    gl.uniform1f(this.shaderPrograms['water']['time1'], parseFloat(this.flowMapOffset0));
    gl.uniform1f(this.shaderPrograms['water']['time2'], parseFloat(this.flowMapOffset1));
    gl.uniform1f(this.shaderPrograms['water']['time'], parseFloat(timeS));
    gl.uniform3f(this.shaderPrograms['water']['sunDirection'], this.lightDirection[0], this.lightDirection[1], this.lightDirection[2]);

    gl.uniform3fv(this.shaderPrograms['water']['eyePosition'], this.cameraPos);
    
    gl.uniform2f(this.shaderPrograms['water']['canvasSize'], canvas.width, canvas.height);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['square'].vertexPosition);
    gl.vertexAttribPointer(this.shaderPrograms['water']['aVertexPosition'], this.buffers['square'].vertexPosition.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['square'].uv);
    gl.vertexAttribPointer(this.shaderPrograms['water']['aTexturePosition'], this.buffers['square'].uv.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers['square'].vertexIndex);
    
    this.setMatrixUniforms(this.shaderPrograms['water']);
    gl.drawElements(gl.TRIANGLES, this.buffers['square'].vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);
    
    gl.disableVertexAttribArray(this.shaderPrograms['water']['aVertexPosition']);
    gl.disableVertexAttribArray(this.shaderPrograms['water']['aTexturePosition']);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

/**
 *   Render scene picking (to click on objects)
 */
Engine.prototype.renderScenePicking = function(to) {

    'use strict';
    
    var gl = this.gl;

    if ( to !== null ) {
        gl.bindFramebuffer( gl.FRAMEBUFFER, to.framebuffer );
    }
    else {
        gl.bindFramebuffer( gl.FRAMEBUFFER, null );
    }

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(90.0, gl.viewportWidth / gl.viewportHeight, 1.0, 100000.0, this.pMatrix);
    
    gl.enable(gl.DEPTH_TEST);
    
    // Setup correct view
    mat4.identity(this.mvMatrix);
    
    mat4.rotate(this.mvMatrix, -(this.cameraPitch * Math.PI / 180), [1, 0, 0]);
    mat4.rotate(this.mvMatrix, -(this.cameraYaw * Math.PI / 180), [0, 1, 0]);
    mat4.translate(this.mvMatrix, [-(this.cameraPos[0]), -(this.cameraPos[1]), -(this.cameraPos[2])]);
    
    // Draw objects
    var prog = this.shaderPrograms['units'];

    gl.useProgram(prog);
    this.setMatrixUniforms(prog);
    
    this.objs.render(prog, 3);
    
    gl.readPixels(0, 0, gl.viewportWidth, gl.viewportHeight, gl.RGBA, gl.UNSIGNED_BYTE, this.colorMap);
    
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
};

/**
 *   Render the sky cube map
 */
Engine.prototype.renderSkyCubeMap = function(to, yaw, pitch) {

    'use strict';
    
    var gl = this.gl;

    var canvas = $('#webgl-canvas')[0];
    
    // Sky

    gl.viewport(0, 0, to.size[0], to.size[1]);   
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mat4.perspective(90.0, to.size[0] / to.size[1], 100.0, 1000.0, this.pMatrix);
    
    mat4.identity(this.mvMatrix);
    
    mat4.rotate(this.mvMatrix, -(pitch * Math.PI / 180), [1, 0, 0]);
    mat4.rotate(this.mvMatrix, -(yaw * Math.PI / 180), [0, 1, 0]);


    var prog = this.shaderPrograms['sky'];   
    gl.useProgram(prog);

    gl.enableVertexAttribArray(prog.aVertexPosition);

    this.setSkyParamUniforms(prog);

    gl.uniform3f(prog.sunDirection, this.lightDirection[0], this.lightDirection[1], this.lightDirection[2]);
    
    gl.uniform2f(prog.canvasSize, canvas.width, canvas.height);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['cube'].vertexPosition);
    gl.vertexAttribPointer(prog.aVertexPosition, this.buffers['cube'].vertexPosition.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers['cube'].vertexIndex);

    this.setMatrixUniforms(prog);

    gl.drawElements(gl.TRIANGLES, this.buffers['cube'].vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);
    gl.disableVertexAttribArray(prog.aVertexPosition);

};

/**
 *   Draw current position of the mouse projected on the map
 *   
 *   @param {Object.<Framebuffer>} Where to draw
 */
Engine.prototype.drawLines = function(to) {
    
    var gl = this.gl;

    if ( to !== null ) {
        gl.bindFramebuffer( gl.FRAMEBUFFER, to.framebuffer );
    }
    else {
        gl.bindFramebuffer( gl.FRAMEBUFFER, null );
    }
    
    var points = [
        0.0, 0.0, 0.0,
        0.0, 100.0, 0.0,
        0.0, 0.0, 100.0,
        100.0, 0.0, 0.0
    ];
    
    var indices = [
        0, 1,
        0, 2,
        0, 3
    ];
    
    var lines = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lines);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    
    var indicesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    var prog = this.shaderPrograms['uniformColor'];
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST);
    
    this.setMatrixUniforms(prog);
    
    gl.enableVertexAttribArray(prog.aVertexPosition);
    
    gl.uniform4fv(prog.uColor, [1.0, 1.0, 0.0, 1.0]);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, lines);
    gl.vertexAttribPointer(prog['aVertexPosition'], 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    
    // Mouse position
    var translation = [];
    translation[0] = this.mouse.mouseIndexPos[0];
    translation[1] = this.map.getHeightAt(this.mouse.mouseIndexPos[0], this.mouse.mouseIndexPos[1]);
    translation[2] = this.mouse.mouseIndexPos[1];
    
    gl.uniform3fv(prog.uTranslation, translation);
    
    gl.drawElements(gl.LINES, 6, gl.UNSIGNED_SHORT, 0);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

/**
 *   Rendering Loop
 */
Engine.prototype.renderTick = function(currentFrame) {
    
    'use strict';

    var canvas = $('#webgl-canvas')[0];
    var i = 0;
    
    // Start FPS tracker
    this.gui.stats.begin();

    // Frame interval to updates shadow maps
    // for example, [4, 4, 8, 8] means that the shadow map 0 & 1 will be updated every 4 frames
    var updateShadowTiming = [4, 4, 8, 8];
    
    // If the camera has been updated
    // No point re-rendering the shadow map if the camera hasn't moved (unless the sun moved..)
    if ( this.cameraLastUpdate > this.shadowMapsLastUpdate ) {
	
        // Circle through the shadow maps
        for ( i = 0; i < this.nbCascadeSplit; i++ ) {

            // re-render shadow map every x frames, x being updateShadowTiming[i] defined abone
            if ( (currentFrame + i) % updateShadowTiming[i] === 0 || currentFrame === 0 ) {

                // temporary framebuffer used to do some post-processing on the shadow map (blur etc..)
                var tmpFBO = this.fbo['tmp' + i];

                // final framebuffer
                var shadowMapFBO = this.fbo['terrainDepth' + i];

                // Update the light for this split
                this.updateCascadeShadowMaps(i);

                // Render the shadow map
                this.drawDepthMapCascade( shadowMapFBO, i );

                // Blur the shadow map
                this.blur( shadowMapFBO, tmpFBO, 1, this.depthMapSize.w, this.depthMapSize.h );
                this.blur( tmpFBO, shadowMapFBO, 0, this.depthMapSize.w, this.depthMapSize.h );
                
            }
        }

        this.shadowMapsLastUpdate = new Date().getTime();
    }
    
    var camerasPitch = [0, 0, 90 + 180, 90, 0,  0];
    var camerasYawn =  [90, 90 + 180, 0, 180,  180, 0];
    
    // Update the sky cube
    if ( this.lightLastUpdate > this.skyBoxLastUpdate ) {

        this.updateSkyCube(this.fbo['skyCubeMap']);
	
        this.skyBoxLastUpdate = new Date().getTime();
    }

    // Render terrain, units and shadows
    for(i = 0; i < 1; i++) {
        this.pass1( this.fbo['scene1'] );
    } 
    
    // this.drawLines( this.fbo['scene1'] );
    
    // Water and sky
    for(i = 0; i < 1; i++) {
        this.pass2( this.fbo['scene1'], null );
    }
    
    //this.map.renderLodGPU(this.gl.TRIANGLES);
    //this.map.renderLodGPU(this.gl.LINE_STRIP);
    //this.map.renderGridCorners();

    //this.renderScenePicking( null );

    this.downSample( this.fbo['terrainDepth0'], null, canvas.width * 0.75, 0, canvas.width * 0.25, canvas.width * 0.25 );
    //this.downSample( this.fbo['scenePicking'], null, canvas.width * 0.75, 0, canvas.width * 0.25, canvas.width * 0.25 );
    
    //this.downSample( {texture: this.map.heightMapT}, null, canvas.width * 0.75, 0, canvas.width * 0.25, canvas.width * 0.25 );
    
    this.gui.stats.end();
    
    var callBack = function() {
	
        this.renderTick( currentFrame + 1 );

    }.bind(this);

    if ( this.state == states.RUNNING_1 ) {
	requestAnimFrame(callBack);
    }
};

Engine.prototype.logicTick = function(time) {

    'use strict';

    var that = this;

    this.keyboard.handleKeys();
    
    this.objs.makeCollisionTree();
    
    time = this.updatePositions(time);

    // increase the level of water slowly (todo: only works in GPU mode for now)
    // this.map.waterLevel += 0.0005/60;
    
    var callBack = function() {
        that.logicTick(time);
    };

    if ( this.state == states.RUNNING_1 ) {
	setTimeout(callBack, (1/60)*1000);
    }
};

/**
 *   Update positions of objects and camera
 */
Engine.prototype.updatePositions = function(lastTime) {
    
  'use strict';
    
  var timeNow = new Date().getTime();
  
    /*
      Editeur de map
    */
    /*
      if(clickDown) {
      var index = ((gl.viewportHeight - currentY)*((gl.viewportWidth)*4)) + (currentX * 4);

      if(colorMap[index] == 0) {
      Editor.averageY(mouseIndexPos[0], mouseIndexPos[1], 10);
      }
      }*/
    
    if (lastTime !== 0) {
        
        var elapsed = timeNow - lastTime;
        
        // Remove every object with less than 0 HP
        this.objs.removeDead();
        
      // Remove dead object from selection
      if ( this.me.selected.length > 0 ) {
        
        for ( var i = 0; i < this.me.selected.length; ++i ) {
	  
          if ( this.objs.o[this.me.selected[i] - 1].uniqueId == -1 ) {
            
            this.me.removeFromSelection( this.me.selected[i] );
            
          }
          
        }
        
      }
        
        // Update position of each objects
        this.objs.doActions( elapsed );
        
        /*
          for ( var i = 0; i < this.objs.nbTotal; ++i ) {
          
          var currentObject = this.objs.o[i];
          
          if ( currentObject.uniqueId != -1 ) {
          
          currentObject.lastMove += elapsed;
          currentObject.doAction( currentObject.lastMove );

          currentObject.lastMove = 0;
          
          }
          
          }*/
        


        if (this.strafSpeed !== 0) {
            
            this.cameraPos[0] -= Math.cos(this.cameraYaw * Math.PI / 180) * this.strafSpeed * elapsed;
            this.cameraPos[2] -= -Math.sin(this.cameraYaw * Math.PI / 180) * this.strafSpeed * elapsed;
          
          this.cameraLastUpdate = new Date().getTime();
        }
      
      if (this.speed !== 0) {
        this.cameraPos[0] -= Math.sin(this.cameraYaw * Math.PI / 180) * this.speed * elapsed;
        this.cameraPos[2] -= Math.cos(this.cameraYaw * Math.PI / 180) * this.speed * elapsed;

        this.cameraLastUpdate = new Date().getTime();
      }

    }
    
    return timeNow;
};

/**
 *   Restart engine
 */
Engine.prototype.restart = function() {
    
    'use strict';
    
    this.reset();
    this.start();
   
};

/**
 *   Pause engine
 */
Engine.prototype.pause = function() {
    'use strict';
};

/**
 *   Enable the needed extentions
 */
Engine.prototype.enableExtensions = function() {
    
    'use strict';
    
    this.ext = [];

    //this.ext['depthTexture'] = this.gl.getExtension("WEBGL_depth_texture");
    if(!this.ext['depthTexture']) { console.log('Warning : couldn\'t load "WEBGL_depth_texture"'); }
    
    (this.ext)['uintElementIndex'] = (this.gl).getExtension("OES_element_index_uint");
    if(!this.ext['uintElementIndex']) { console.log('Warning : couldn\'t load "OES_element_index_uint"'); }
    
    (this.ext)['textureFloat'] = (this.gl).getExtension("OES_texture_float");
    if(!this.ext['textureFloat']) { console.log('Warning : couldn\'t load "OES_texture_float"'); }
    
    (this.ext)['textureFloatLinear'] = (this.gl).getExtension("OES_texture_float_linear");
    if(!this.ext['textureFloatLinear']) { console.log('Warning : couldn\'t load "OES_texture_float_linear"'); }
    
    (this.ext)['compressedTexture'] = (this.gl).getExtension("WEBGL_compressed_texture_s3tc");
    if(!this.ext['compressedTexture']) { console.log('Warning : couldn\'t load "WEBGL_compressed_texture_s3tc"'); }
    
    (this.ext)['standardDerivatives'] = (this.gl).getExtension("OES_standard_derivatives");
    if(!this.ext['standardDerivatives']) { console.log('Warning : couldn\'t load "OES_standard_derivatives"'); }
    
    //(this.ext)['WEBGL_draw_buffers'] = (this.gl).getExtension("WEBGL_draw_buffers");
    if(!this.ext['WEBGL_draw_buffers']) { console.log('Warning : couldn\'t load "WEBGL_draw_buffers"'); } 
    
    return 1;
};

/**
 *   Load, compile and link shaders one by one while keeping the browser in control
 *   @param {int} approximation of the loading time portion
 */
Engine.prototype.initShaders = function(loadTotal) {
    
    'use strict';
    
    if ( this.shaderPrograms === undefined ) {
        this.shaderPrograms = [];
    }
    
    // Definitions   
    var def = [];
    
    def['quad'] = [];
    
    def['quad'][0] = ['aVertexPosition', 'aTexturePosition'];
    def['quad'][1] = ['uTexture'];
    
    def['units'] = [];
    
    def['units'][0] = ['aVertexPosition', 'aVertexColor'];
    def['units'][1] = ['uPMatrix', 'uMVMatrix', 'uFarPlane', 'uNearPlane', 'uDirection', 'uTranslation', 'uScale', 'uColor', 'uMode'];
    
    def['blend'] = [];
    
    def['blend'][0] = ['aVertexPosition', 'aVertexColor'];
    def['blend'][1] = ['uPMatrix', 'uTexture1', 'uTexture2', 'uTexelSize'];
    
    def['blur'] = [];
    
    def['blur'][0] = ['aVertexPosition', 'aTexturePosition'];
    def['blur'][1] = ['uOrientation', 'uBlurAmount', 'uTextureSize', 'uSample0'];
    
    def['downSample'] = [];
    def['downSample'][0] = ['aVertexPosition', 'aTexturePosition'];
    def['downSample'][1] = ['uSample0', 'uTextureSize'];
    
    def['fxaa'] = [];
    
    def['fxaa'][0] = ['aVertexPosition'];
    def['fxaa'][1] = ['uTexture', 'uTexelSize'];
    
    def['uniformColor'] = [];

    def['uniformColor'][0] = ['aVertexPosition'];
    def['uniformColor'][1] = ['uColor', 'uTranslation', 'uPMatrix', 'uMVMatrix'];
    
    def['terrainGPU'] = [];

    def['terrainGPU'][0] = ['aVertexPosition'];
    def['terrainGPU'][1] = ['uTranslation', 'uPMatrix', 'uMVMatrix', 'uHeightMap', 'uMode', 'uUVScale', 'uNoise',
                            'uHeightScale', 'uMapSize', 'uDirectionalColor', 'uAmbientColor', 'uLightingDirection',
                            'uSamplerSand', 'uSamplerSandNormal', 'uSamplerSand2', 'uSamplerSand2Normal',
                            'uSamplerDirt', 'uSamplerDirtNormal', 'uSamplerRock', 'uSamplerRockNormal',
			    'uWaterLevel', 'uDepthMapSize', 'uDepthMaps[0]', 'uDepthMaps[1]', 'uDepthMaps[2]', 'uDepthMaps[3]'];

    for(var j = 0; j < 4; j++) {
        def['terrainGPU'][1].push("cParams[" + j + "].mvMatrix");
        def['terrainGPU'][1].push("cParams[" + j + "].pMatrix");
        def['terrainGPU'][1].push("cParams[" + j + "].nearPlane");
        def['terrainGPU'][1].push("cParams[" + j + "].farPlane");
    }

    console.log(def['terrainGPU'][1]);

    def['terrain'] = [];
    
    def['terrain'][0] = ['aVertexPosition', 'aTexturePosition', 'aVertexTangent', 'aVertexNormal'];
    def['terrain'][1] = ['uPMatrix', 'uMVMatrix', 'uViewMatrix', 'uModelMatrix', 'uNormalMatrix', 'uMapSize', 
                         'uEyesPosition', 'uLightMVMatrix', 'uLightPMatrix', 'uHeightMap', 'uTerrainNormals',
                         'uSamplerSand', 'uSamplerSandNormal', 'uSamplerSand2', 'uSamplerSand2Normal', 'uGrid',
                         'uSamplerDirt', 'uSamplerDirtNormal', 'uSamplerRock', 'uSamplerRockNormal',
                         'uDepthMaps[3]', 'uAmbientColor', 'uLightingDirection', 'uDirectionalColor',
                         'uMouseIndexPosition', 'uMode', 'uFarPlane', 'uNearPlane', 'uHeightScale', 'uNoise', 'uDepthMapSize', 'uDepthMaps[0]', 'uDepthMaps[1]', 'uDepthMaps[2]'];
    
    for(var j = 0; j < 4; j++) {
        def['terrain'][1].push("cParams[" + j + "].mvMatrix");
        def['terrain'][1].push("cParams[" + j + "].pMatrix");
        def['terrain'][1].push("cParams[" + j + "].nearPlane");
        def['terrain'][1].push("cParams[" + j + "].farPlane");
    }

    
    def['water'] = [];
    
    def['water'][0] = ['aVertexPosition', 'aTexturePosition'];
    def['water'][1] = ['uPMatrix', 'uMVMatrix', 'uNormalMatrix', 'uSampler', 'uSceneColor', 'uSceneDepth', 'sunDirection', 'time', 'eyePosition', 'canvasSize', 'sky_params1', 'sky_params2', 'sky_params3',
                       'sky_params4', 'sky_params5', 'sky_params6', 'time1', 'time2', 'uDudvWater', 'uNoise', 'uFlowMap', 'uSkyCube'];
    
    def['sky'] = [];
    
    def['sky'][0] = ['aVertexPosition'];
    def['sky'][1] = ['uPMatrix', 'uMVMatrix', 'uNMatrix', 'sunDirection', 'sky_params1', 'sky_params2', 'sky_params3', 'uSceneColor', 'canvasSize',
                     'sky_params4', 'sky_params5', 'sky_params6'];
    

    def['depthMapGPU'] = [];
    
    def['depthMapGPU'][0] = ['aVertexPosition'];
    def['depthMapGPU'][1] = ['uTranslation', 'uMapSize', 'uHeightScale', 'uHeightMap', 'uMVMatrix', 'uPMatrix', 'uWaterLevel'];
    
    def['depthMap'] = [];
    
    def['depthMap'][0] = ['aVertexPosition'];
    
    var nbCascadeSplit = 4;
    
    def['depthMap'][1] = ['uDepthMapSize', 'uMVMatrix', 'uPMatrix'];
    
    for(j = 0; j < nbCascadeSplit; j++) {
        def['depthMap'][1].push("cParams[" + j + "].mvMatrix");
        def['depthMap'][1].push("cParams[" + j + "].pMatrix");
        def['depthMap'][1].push("cParams[" + j + "].nearPlane");
        def['depthMap'][1].push("cParams[" + j + "].farPlane");
    }
    
    def['skyBox'] = [];

    def['skyBox'][0] = ['aVertexPosition'];
    def['skyBox'][1] = ['uSceneColor', 'uSkyCubeColor', 'uMVMatrix', 'uPMatrix', 'canvasSize'];
    
    def['normal'] = [];
    
    def['normal'][0] = ['aVertexPosition'];
    def['normal'][1] = ['uTextureSize', 'uSample0'];
    
    def['units'] = [];
    def['units'][0] = ['aVertexPosition'];
    def['units'][1] = ['uMVMatrix', 'uPMatrix', 'uTranslation', 'uScale', 'uDirection', 'uColor', 'uMode'];
    
    var numItem = Object.keys(def).length;
    var d = jQuery.Deferred();
    var that = this;
    var gl = this.gl;

    var pending = [];

    var _attachShaders = function(shader, def, j) {
	var name = Object.keys(def)[j];

	if(pending[name] === undefined) {
            pending[name] = shader;
	} else {

            that.shaderPrograms[name] = gl.createProgram();
            var shaderProg = that.shaderPrograms[name];
            gl.attachShader(shaderProg, pending[name][0]);
            gl.attachShader(shaderProg, shader[0]);
            gl.linkProgram(shaderProg);

            if (!gl.getProgramParameter(shaderProg, gl.LINK_STATUS)) {
		alert(name + " " + gl.getProgramInfoLog(shaderProg));
            }

            setAttributes(gl, def[name][0], shaderProg);
            setUniforms(gl, def[name][1], shaderProg);

            that.loadingVal += loadTotal/numItem;

            if(j == numItem - 1) {
		d.resolve();
            }
	}
    };
    
    var _initShaders = function(def, a) {
        
        var name = Object.keys(def)[a];

        loadShaders(gl, name + '.frag', function(shader){_attachShaders(shader, def, a);});
        loadShaders(gl, name + '.vertex', function(shader){_attachShaders(shader, def, a);});

	if(a < numItem - 1) {
            setTimeout(function(){_initShaders(def, a+1);}, 0);
	}
    };
    
    _initShaders(def, 0);
    
    return d.promise(); 
};

/**
 *   Download and load textures
 */
Engine.prototype.initTextures = function(loadTotal) {

    var j = 0;
    var def = [];
    
    //def[j++] = ['waterheight.png', 'waterHeight'];
    //def[j++] = ['xil_dirt.png', 'sand'];
    //def[j++] = ['xil_dirtnormal.png', 'sandNormal'];
    def[j++] = ['desertworld_sand.png', 'sand2', 'linear'];
    def[j++] = ['desertworld_sandnormal.png', 'sand2Normal', 'linear'];
    def[j++] = ['dirt_cracked.png', 'dirt', 'linear'];
    def[j++] = ['dirt_crackednormal.png', 'dirtNormal', 'linear'];
    //def[j++] = ['bel_shir_bricks_small.png', 'rock'];
    //def[j++] = ['bel_shir_bricks_smallnormal.png', 'rockNormal'];
    def[j++] = ['waterNormal.png', 'waterNormal', 'linear'];
    //def[j++] = ['terrainTest4.png', 'heightMap', 'linear'];
    def[j++] = ['noise.png', 'noise', 'linear'];
    def[j++] = ['grid.png', 'grid', 'nearest'];
    
    //def[j++] = ['flowmap.png', 'flowmap'];

    var i = 0;
    var d = jQuery.Deferred();
    var that = this;
    var pending = j;
    var gl = this.gl;
    
    var _handleLoadTexture = function(texture, opt) {

        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        
        if ( opt == 'linear') {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        }
        
        
        gl.bindTexture(gl.TEXTURE_2D, null); 
        
    };

    var _initTextures = function(def, i) {
        
        var name = def[i][1];
        var src = def[i][0];
        var opt = def[i][2];
        
        var texture = gl.createTexture();
        that.textures[name] = texture;
        that.textures[name].image = new Image();
        
        that.textures[name].image.onload = function() {
            _handleLoadTexture(texture, opt);
            pending--;

            if(pending === 0) {
                d.resolve();
            }

            that.loadingVal += loadTotal/j;
        };
        
        that.textures[name].image.src = "textures/" + src;

        if(i < j - 1) {
            setTimeout(function(){_initTextures(def, ++i);}, 0);
        }
    };
    
    _initTextures(def, i);
    
    return d.promise();     
};

Engine.prototype.handleLoadTexture = function(texture) {

    var gl = this.gl;

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    gl.generateMipmap(gl.TEXTURE_2D);
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    return 1;
};

Engine.prototype.load = function(src, name) {

    var that = this;

    var texture = gl.createTexture();
    this.textures[name] = texture;
    this.textures[name].image = new Image();
    
    this.textures[name].image.onload = function() {
        that.handleLoadTexture(texture);
    };

    this.textures[name].image.src = "textures/" + src;
    
};

/**
 *   Create all the framebuffer necessary to render the game
 */
Engine.prototype.initAllFramebuffers = function() {
    
    var gl = this.gl;
    

    // Scene framebuffer (Depth Channel and 1 texture)
    this.fbo['scene1'] = this.createFramebufferDepth(gl.viewportWidth, gl.viewportHeight, gl.FLOAT);

    
    //this.fbo['scene2'] =          this.createFramebuffer(gl.viewportWidth, gl.viewportHeight);
    this.fbo['terrainDepth0'] = this.createFramebufferDepth(this.depthMapSize.w, this.depthMapSize.h, gl.FLOAT);
    this.fbo['terrainDepth1'] = this.createFramebufferDepth(this.depthMapSize.w, this.depthMapSize.h, gl.FLOAT);
    this.fbo['terrainDepth2'] = this.createFramebufferDepth(this.depthMapSize.w, this.depthMapSize.h, gl.FLOAT);
    this.fbo['terrainDepth3'] = this.createFramebufferDepth(this.depthMapSize.w, this.depthMapSize.h, gl.FLOAT);

    var sizeSkyCube = [256, 256];

    this.fbo['skyCubeMap'] = this.createCubeMap( sizeSkyCube[0], sizeSkyCube[1] );

    //this.fbo['unitsDepth'] =        this.createFramebufferDepth(this.depthMapSize.w, this.depthMapSize.h);
    //this.fbo['depthMap'] =          this.createFramebuffer(this.depthMapSize.w, this.depthMapSize.h);   
    this.fbo['tmp0'] = this.createFramebufferDepth(this.depthMapSize.w, this.depthMapSize.h, gl.FLOAT);
    this.fbo['tmp1'] = this.createFramebufferDepth(this.depthMapSize.w, this.depthMapSize.h, gl.FLOAT);
    this.fbo['tmp2'] = this.createFramebufferDepth(this.depthMapSize.w, this.depthMapSize.h, gl.FLOAT);
    this.fbo['tmp3'] = this.createFramebufferDepth(this.depthMapSize.w, this.depthMapSize.h, gl.FLOAT);

    this.fbo['terrainHeights']  = this.createFramebuffer(512.0, 512.0);
    this.fbo['terrainNormals']  = this.createFramebuffer(512.0, 512.0);
    
    //this.fbo['downsample2'] =       this.createFramebuffer(this.depthMapSize.w/2, this.depthMapSize.h/2);
    //this.fbo['downsample4'] =       this.createFramebuffer(this.depthMapSize.w/4, this.depthMapSize.h/4);
    //this.fbo['downsample4tmp'] =    this.createFramebuffer(this.depthMapSize.w/4, this.depthMapSize.h/4);
    
    this.fbo['scenePicking'] = this.createFramebufferDepth(gl.viewportWidth, gl.viewportHeight, gl.UNSIGNED_BYTE);
    
    this.colorMap = new Uint8Array(gl.viewportWidth * gl.viewportHeight * 4);
};

/**
 *   Create a cube map attached to a framebuffer
 */
Engine.prototype.createCubeMap = function(w, h) {

    var fbo = {};
    var gl = this.gl;

    fbo.size = [w, h];

    fbo.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer( gl.FRAMEBUFFER, fbo.framebuffer );

    fbo.texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_CUBE_MAP, fbo.texture );

    gl.texParameteri( gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR );

    for ( var i = 0; i < 6; ++i ) {
        gl.texImage2D( gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, null );
    }

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X, fbo.texture, 0);

    gl.bindTexture( gl.TEXTURE_CUBE_MAP, null );
    gl.bindFramebuffer( gl.FRAMEBUFFER, null );
    
    return fbo;
};

/**
 *   Create a framebuffer Object
 */
Engine.prototype.createFramebuffer = function(w, h) {

    var fbo = {};
    var gl = this.gl;
    
    fbo.size = [w, h];
    
    fbo.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);

    fbo.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, null);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbo.texture, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    return fbo;
};

/**
 *   Create a framebuffer Object with a depth renderbuffer attached to it
 */
Engine.prototype.createFramebufferDepth = function(w, h, format) {

    var fbo = {};
    var gl = this.gl;

    // Create framebuffer for scene
    fbo.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);    

    // create texture
    fbo.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, format, null);

    
    // Create the depth buffer
    var renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
    

    // Bind to the framebuffer
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbo.texture, 0);

    var FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if(FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
        console.log("Error : Framebuffer unrenderable");
    }  

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return fbo;
};

/**
 *   Create a framebuffer Object with a depth renderbuffer attached to it and multiple textures
 *
 *   Extension WEBGL_draw_buffers must be available
 */
Engine.prototype.createFramebufferDepthMultipleTexture = function(w, h) {

    var fbo = {};
    var gl = this.gl;
    var nbTextures = 4;

    var i;
    
    // Init textures array
    fbo.texture = [];
    fbo.colorAttachment = [];
    
    // Create the neccesary textures
    for(i = 0; i < nbTextures; ++i) {
	fbo.texture[i] = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, fbo.texture[i]);
	
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, null);

	// Gives each texture a specific color attachment
	fbo.colorAttachment[i] = this.ext['WEBGL_draw_buffers'].COLOR_ATTACHMENT0_WEBGL + i;
    }
    
    // Create the depth buffer
    var renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
    
    fbo.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);

    this.ext['WEBGL_draw_buffers'].drawBuffersWEBGL(fbo.colorAttachment);
    
    for(i = 0; i < nbTextures; i++) {
	gl.framebufferTexture2D(gl.FRAMEBUFFER, fbo.colorAttachment[i], gl.TEXTURE_2D, fbo.texture[i], 0);
    }

    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);


    var FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if(FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
        console.log("Error : Framebuffer unrenderable");
    }  

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return fbo;
};

/**
 *    Init framebuffer with depth texture as depth componnent
 *    
 *    WEBGL_depth_texture extension must be available
 */
Engine.prototype.createFramebufferDepthTexture = function(w, h) {
    
    var fbo = {};
    var gl = this.gl;
    
    // Create framebuffer for scene
    fbo.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);

    // Create color texture for scene
    fbo.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);	
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // Create the depth texture
    fbo.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fbo.depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
    

    // Bind everything to the framebuffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbo.texture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, fbo.depthTexture, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return fbo;
};

/**
 *   Transfer buffers to GPU memory
 */
Engine.prototype.initBuffers = function() {
    // Map
    
    if(this.ext['uintElementIndex']) {
        this.map.initBuffers();
    } else {
        console.log('chunks');
        this.map.initBuffersChunk();
    }
    
    // Cube
    this.createBuffer('cube', SimpleModels.getModel('cube', 500.0));
    
    // Small cube
    this.createBuffer('smallCube', SimpleModels.getModel('cube', 1.0));
    
    // Square
    this.createBuffer('square', SimpleModels.getModel('square', 50000.0));
    
};

/**
 *   Load and create buffers for units, buildings and other objects
 */
Engine.prototype.initObjectsModels = function() {
    
    // only one object for now (cube) 
    this.objectsModels[0] = this.buffers['smallCube'];

    return 1;
};

/**
 *   Load a simple model into GPU memory and return the ref
 */
Engine.prototype.createBuffer = function(name, source) {

    var gl = this.gl;
    var tmpTexturePositionBuffer;
    
    var tmpVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tmpVertexPositionBuffer);
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(source.vertices), gl.STATIC_DRAW);
    tmpVertexPositionBuffer.itemSize = source.vertices.itemSize;
    tmpVertexPositionBuffer.numItems = source.vertices.numItems;
    
    var tmpVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tmpVertexIndexBuffer);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(source.indices), gl.STATIC_DRAW);
    tmpVertexIndexBuffer.itemSize = source.indices.itemSize;
    tmpVertexIndexBuffer.numItems = source.indices.numItems;
    
    if(source.uv.numItems !== undefined) {
        tmpTexturePositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tmpTexturePositionBuffer);
        
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(source.uv), gl.STATIC_DRAW);
        tmpTexturePositionBuffer.itemSize = source.uv.itemSize;
        tmpTexturePositionBuffer.numItems = source.uv.numItems;
    }
    
    this.buffers[name] = {
        vertexPosition : tmpVertexPositionBuffer,
        vertexIndex : tmpVertexIndexBuffer,
        uv : tmpTexturePositionBuffer
    };
};

Engine.prototype.unprojectOnTerrain = function(x, y) {
    
    var viewportArray = [
        0, 0, this.gl.viewportWidth, this.gl.viewportHeight
    ];

    // The results of the operation will be stored in this array.
    var close = [], far = [];
    
    var success = GLU.unProject(
        x, this.gl.viewportHeight - y, 0,
        this.mvMatrix, this.pMatrix,
        viewportArray, close);
    
    var success = GLU.unProject(
        x, this.gl.viewportHeight-y, 1,
        this.mvMatrix, this.pMatrix,
        viewportArray, far);

    var vec = [];
    vec3.subtract(far, close, vec);			
    
    vec3.normalize(vec);
    
    var dist = this.map.rayIntersect(close, vec);
    
    return [close[0] + dist*vec[0], close[2] + dist*vec[2]];
    
};

/**
 *   Return color based on id (used clicking on units)
 *   @param {number} id the of object
 *   @return {array} color
 */
Engine.prototype.idToPickingColor = function(id) {

    var color = [];

    color[0] = ( 255 - ( id % 254 ) ) / 255;
    color[1] = ( 254 - ( ( id / 254 ) | 0 ) ) / 254;
    color[2] = 0.0;
    color[3] = 1.0;
    
    return color;
};

/**
 *   Return Id based on color (used for clicking on units)
 *   @param {array} color
 *   @return {number} id
 */
Engine.prototype.colorPickingToId = function(color) {
    
    var id = ((255 - color[0]) + 1) + (254 * (255 - color[1]));
    
    return id;
};
