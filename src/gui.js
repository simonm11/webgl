/*
    Graphic interface using browser DOM
*/

var Gui = function(_engine) {

    this.engine = _engine;
    this.state = 'undefined';
    this.types = [];
    this.show = 0;
    this.stats = undefined;

}

Gui.prototype.init = function() {

}

Gui.prototype.start = function() {
    
    // Init FPS stats
    this.stats = new Stats();
    this.stats.setMode(0); // 0: fps, 1: ms

    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.right = '10px';
    this.stats.domElement.style.top = '10px';

    document.body.appendChild(this.stats.domElement);
    
    // create loading bar
    $("body").append('<div id="loadbar"></div>');
    
    $("#loadbar").progressbar({value: 0});
    
    $("#loadbar").css({
        'background':'#bebebe',
        'position':'relative',
        'top': $('body').outerHeight()/3.0,
        'width':'30%',
        'margin':'auto',
        'display':'none'
    });
    
    this.startLoadingScreen();
    
    this.tick();
}

Gui.prototype.tick = function() {

    var that = this;
    
    // switch GUI state
    if (this.engine.state !== this.state) {
	
        this.state = this.engine.state;
        
        if (this.state === states.LOADING_0) {
            this.startLoadingScreen();
        } else if (this.state === states.RUNNING_0) {
            this.startMenu();
        } else if (this.state === states.RUNNING_1) {
            this.startGame();
        } 
	
    }
    
    if (this.state === states.LOADING_0) {

        $( "#loadbar" ).progressbar( "option", {
          value: this.engine.loadingVal
        });
	
    } else if (this.state === states.RUNNING_1) {

	$('#nbvertex').html(this.engine.map.nbVertexes + ' ' + this.engine.map.nbVertexesRendered);
    }
    
    var callBack = function() {
        that.tick();
    }
    
    setTimeout(callBack, (1/60)*1000);
    
}

/**
*   switch to loading screen mode
*/
Gui.prototype.startLoadingScreen = function() {
    // check the current mode and remove/hide the related elems
    
    // hide the webgl canvas
    $('#webgl-canvas').css({'display':'none'});
    
    // body blackground color
    $('body').css({'background':'#dedede'});
    
    // display loading bar
    $('#loadbar').css({'display':'block'});
     
}

Gui.prototype.startMenu = function() {
    $('#loadbar').css({'display':'none'});
  //  $('body').css({'background':'#fafafa'});    
}

Gui.prototype.startGame = function() {
    // hide loading bar
    $('#loadbar').css({'display':'none'});
    
    // Display Webgl canvas
    $('#webgl-canvas').css({'display':'block'});   
    
    var that = this;
    
    $('body').append('<div id="nbvertex"></div>');
    
    $('#nbvertex').css({
        'color':'black',
        'position':'absolute',
        'top':'10px',
        'right':'150px'});
    
    // Setup the sliders for the sky params
    $( "#pitch, #yawn, #pollution, #clarity, #density, #planet-scale, #atmosphere-scale, #disk-radius, #brightness, #disk-intensity" ).slider({
        orientation: "horizontal",
        range: "min",
        slide: function(){that.refreshSkyParams();},
        change: function(){that.refreshSkyParams();}
    });

    // Shadow checkbox
    $('#enableShadows').change(function() {

	if($(this).is(":checked")) {
	    that.engine.shadowsEnable = true;
	} else {
	    that.engine.shadowsEnable = false;
	}
    });

    // show / hide gui event
    $('#show-gui').on('click', function() {
        that.toggleDisplay();
    });
    
    $(".slider-sky .ui-slider-handle").unbind('keydown');
    
    var pres = 1000;
    
    $("#pitch" ).slider( "value", 35.0);
    $("#pitch" ).slider( "option", "min", 0);
    $("#pitch" ).slider( "option", "max", 180);
    
    $("#yawn" ).slider( "option", "min", 0);
    $("#yawn" ).slider( "option", "max", 360.0);
    $("#yawn" ).slider( "value", 123);
    
    $("#pollution" ).slider( "value", Math.sqrt(0.03*pres));
    $("#pollution" ).slider( "option", "min", 0);
    $("#pollution" ).slider( "option", "max", Math.sqrt(1*pres));
    
    $("#clarity" ).slider( "value", Math.sqrt(0.2*pres));
    $("#clarity" ).slider( "option", "min", 0);
    $("#clarity" ).slider( "option", "max", Math.sqrt(10*pres));
    
    $("#density" ).slider( "value", Math.sqrt(0.99*pres));
    $("#density" ).slider( "option", "min", 0);
    $("#density" ).slider( "option", "max", Math.sqrt(10*pres));
    
    $("#planet-scale" ).slider( "value", Math.sqrt(1.0*pres));
    $("#planet-scale" ).slider( "option", "min", 0.01);
    $("#planet-scale" ).slider( "option", "max", Math.sqrt(10*pres));
    
    $("#atmosphere-scale" ).slider( "value", Math.sqrt(1.0*pres));
    $("#atmosphere-scale" ).slider( "option", "min", 0.01);
    $("#atmosphere-scale" ).slider( "option", "max", Math.sqrt(10*pres));
    
    $("#disk-radius" ).slider( "value", Math.sqrt(0.1*pres));
    $("#disk-radius" ).slider( "option", "min", 0);
    $("#disk-radius" ).slider( "option", "max", Math.sqrt(1*pres));
    
    $("#brightness" ).slider( "value", Math.sqrt(1.46*pres));
    $("#brightness" ).slider( "option", "min", 0);
    $("#brightness" ).slider( "option", "max", Math.sqrt(4*pres));
    
    $("#disk-intensity" ).slider( "value", Math.sqrt(0.5*pres));
    $("#disk-intensity" ).slider( "option", "min", 0);
    $("#disk-intensity" ).slider( "option", "max", Math.sqrt(1*pres));
    /*
    $('#sky_box_param').css({
        'position':'fixed',
        'top':'-2000px',
        'left':'20px'
    });
    */
}

Gui.prototype.refreshSkyParams = function() {

    var pres = 1000;
    
    $("#label-pitch").text($("#pitch").slider( "value" ));
    $("#label-yawn").text($("#yawn").slider( "value" ));
    
    $("#label-pollution").text(($("#pollution").slider( "value" )*$("#pollution").slider( "value" ))/pres);
    $("#label-clarity").text((($( "#clarity" ).slider( "value" ))*($( "#clarity" ).slider( "value" )))/pres);
    
    $("#label-density").text(($( "#density" ).slider( "value" )*$( "#density" ).slider( "value" ))/pres);
    $("#label-planet-scale").text(($( "#planet-scale" ).slider( "value" )*$( "#planet-scale" ).slider( "value" ))/pres);
    $("#label-atmosphere-scale").text(($( "#atmosphere-scale" ).slider( "value" )*$( "#atmosphere-scale" ).slider( "value" ))/pres);
    $("#label-disk-radius").text(($( "#disk-radius" ).slider( "value" )*$( "#disk-radius" ).slider( "value" ))/pres);
    $("#label-brightness").text(($( "#brightness" ).slider( "value" )*$( "#brightness" ).slider( "value" ))/pres);
    $("#label-disk-intensity").text(($( "#disk-intensity" ).slider( "value" )*$( "#disk-intensity" ).slider( "value" ))/pres);
    
    this.engine.lightPitch = ($("#pitch").slider( "value" ) * Math.PI) / 180;
    this.engine.lightYawn = ($("#yawn").slider( "value" ) * Math.PI) / 180;
    
    this.engine.updateLight();
};

Gui.prototype.toggleDisplay = function() {

    if (this.show == 0) {

	this.show = 1;

	$('#gui').css({'display':'block'});
	
    } else {

	this.show = 0;

	$('#gui').css({'display':'none'});
    }
}


