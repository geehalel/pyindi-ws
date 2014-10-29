var Indi = Indi || {};

Indi.util =  {
    // internal base64 decode if Base64.btoa not present
    base64_decode: function( d,b,c,u,r,q,x ) {
        b="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        for(r=q=x="";c=d.charAt(x++);~c&&(u=q%4?u*64+c:c,q++%4)?r+=String.fromCharCode(255&u>>(-2*q&6)):0) c=b.indexOf(c);
        return r;
    },

    str2ab: function(str) {
       var buf = new ArrayBuffer(str.length); // 2 bytes for each char
       var bufView = new Uint8Array(buf);
       for (var i=0, strLen=str.length; i<strLen; i++) {
         bufView[i] = str.charCodeAt(i);
       }
       return buf;
     },

    b64decode: (window.atob ? (function(x) { return window.atob(x); }) : (function(x) { return Indi.util.base64_decode(x); })),

    histogram: (function($) {
	var histogram = function(data, width, height, extent) {
	    this.data = data;
	    this.width = width;
	    this.height = height;
	    this.nelem = this.width * this.height;
	    if (typeof(extent[0]) === 'undefined'|| typeof(extent[1]) === 'undefined') {
		var minmax = this.findminmax();
		this.min=minmax.min;
		this.max=minmax.max;
	    } else {
		this.min=extent[0];
		this.max=extent[1];
	    }
	};

	histogram.prototype = {
	    constructor: histogram,
	    findminmax: function() {
		if (typeof(this.data) === 'undefined'|| typeof(this.data[0]) === 'undefined') {
		    alert('histogram: data array is empty or undefined');
		    return {min: 0, max :0};
		}
		min = this.data[0]; max = this.data[0];
		for (var i = 1; i < this.nelem; i++) {
		    if (this.data[i] < min)
			min = this.data[i];
		    else		 
			if (this.data[i] > max)
			    max = this.data[i];
		}
		return {min: min, max :max};
	    },
	    constructHistogram : function (hist_width, hist_height) {
		var pixel_range = ~~(this.max - this.min);
		this.histArray = new Array(hist_width);
		this.cumulativeFreq = new Array(hist_width);
		this.average=0;
		this.stddev = 0;
		for (var i = 0; i < hist_width; i++) {
		    this.histArray[i] = 0;
		    this.cumulativeFreq[i] = 0;
		}
		this.binWidth=hist_width / pixel_range;
		if (this.binWidth == 0 || typeof(this.data) === 'undefined')
		    return;
		for (var i = 0; i < this.nelem; i++) {
		    var id = ~~((this.data[i] - this.min) * this.binWidth);
		    if (id >= hist_width)
			id = hist_width - 1;
		    else if (id < 0)
			id = 0;
		    this.histArray[id] += 1;
		    this.average += this.data[i];
		}
		this.average = this.average / this.nelem;
		for (var i = 0; i < this.nelem; i++) {
		    var l = this.data[i] - this.average;
		    this.stddev += l * l;
		}
		this.stddev = Math.sqrt(this.stddev / (this.nelem - 1));
		console.log('average: '+this.average+' stddev: '+this.stddev);
		for (var i = 0; i < hist_width; i++) {
		    for (var j = 0; j < i; j++)
			this.cumulativeFreq[i] += this.histArray[j];
		}
		this.maxIntensity=0;
		this.maxFrequency=this.histArray[0];
		for (var i = 0; i < hist_width; i++) {
		    if (this.histArray[i] > this.maxFrequency) {
			this.maxIntensity=i;
			this.maxFrequency=this.histArray[i];	
		    }
		}
		this.median=0;
		this.halfCumulative=this.cumulativeFreq[this.histArray.length - 1]/2;
		for (var i = 0; i < hist_width; i++) {
		       if (this.cumulativeFreq[i] > this.halfCumulative) {
			   this.median = i * this.binWidth + this.min;
			   break;
		       }
		}
		this.JMIndex = this.maxIntensity / hist_width;
	    }

	};
	
	return histogram;
    }(jQuery)),
  
    starfind: (function($) {
	var MINIMUM_PIXEL_RANGE = 5,
	    MINIMUM_STDVAR = 5,
	    MINIMUM_ROWS_PER_CENTER=3,
            JM_UPPER_LIMIT = 0.5,
            LOW_EDGE_CUTOFF_1 = 50,
            LOW_EDGE_CUTOFF_2 = 10,
	    DIFFUSE_THRESHOLD = 0.15,
	    MINIMUM_EDGE_LIMIT = 2;

	var starfind = function(data, histogram) {
	    this.data = data;
	    this.histogram = histogram;
	    this.starSearched = false;
	};

	starfind.prototype = {
	    constructor: starfind,
	    checkCollision : function(s1, s2) {
		var dis; //distance

		var diff_x=s1.x - s2.x;
		var diff_y=s1.y - s2.y;

		dis = Math.abs(Math.sqrt(diff_x*diff_x + diff_y*diff_y));
		dis -= s1.width/2;
		dis -= s2.width/2;

		if (dis<=0) //collision
		    return true;
		
		//no collision
		return false;
	    },

	    findCentroid : function (initStdDev, minEdgeWidth) {
		var threshold = 0;
		var avg = 0;
		var sum = 0;
		var min = 0;
		var pixelRadius = 0;
		var pixVal = 0;
		var  badPix = 0;
		var minimumEdgeLimit = MINIMUM_EDGE_LIMIT;
		var JMIndex = this.histogram.JMIndex;
		var  badPixLimit = 0;
		var edges = new Array();
		if (JMIndex > DIFFUSE_THRESHOLD) {
		    minEdgeWidth = JMIndex*35+1;
		    minimumEdgeLimit=minEdgeWidth-1;
		} else {
		    minEdgeWidth =6;
		    minimumEdgeLimit=4;
		}
		while (initStdDev >= 1) {
		    minEdgeWidth--;
		    minimumEdgeLimit--;
		    if (minEdgeWidth < 3)
			minEdgeWidth = 3;
		    if (minimumEdgeLimit < 1)
			minimumEdgeLimit=1;
		    if (JMIndex > DIFFUSE_THRESHOLD) {
			threshold = this.histogram.max - this.histogram.stddev* (MINIMUM_STDVAR - initStdDev +1);
			min =this.histogram.min;
			badPixLimit=minEdgeWidth*0.5;
		    } else {
			threshold = (this.histogram.max - this.histogram.min)/2.0 + this.histogram.min  + this.histogram.stddev* (MINIMUM_STDVAR - initStdDev);
			if ((this.histogram.max - this.histogram.min)/2.0 > (this.histogram.average+this.histogram.stddev*5))
			    threshold = this.histogram.average+this.histogram.stddev*initStdDev;
			min = this.histogram.min;
			badPixLimit =2;
		    }
		    threshold -= this.histogram.min;
		    for (var i=0; i < this.histogram.height; i++) {
			pixelRadius = 0;
			for(var j=0; j < this.histogram.width; j++) {
			    pixVal = this.data[j+(i*this.histogram.width)] - min;
			    // If pixel value > threshold, let's get its weighted average
			    if ( pixVal >= threshold || (sum > 0 && badPix <= badPixLimit)) {
				if (pixVal < threshold)
				    badPix++;
				else
				    badPix=0;
				avg += j * pixVal;
				sum += pixVal;
				pixelRadius++;
			    } else if (sum > 0) { // Value < threshold but avg exists
				// We found a potential centroid edge
				if (pixelRadius >= (minEdgeWidth - (MINIMUM_STDVAR - initStdDev))) {
				    var center = avg/sum;
				    if (center > 0) {
					var i_center = Math.round(center);
					var newEdge = {};
					newEdge.x = center;
					newEdge.y = i;
					newEdge.scanned = false;
					newEdge.val  = this.data[i_center+(i*this.histogram.width)] - min;
					newEdge.width = pixelRadius;
					newEdge.HFR = 0;
					newEdge.sum = sum;
					edges.push(newEdge);
				    }
				}
				// Reset
				badPix = 0;
				avg=0;
				sum=0;
				pixelRadius=0;
			    }
			}
		    }
		    // In case of hot pixels
		    if (edges.length == 1 && initStdDev > 1) {
			initStdDev--;
			continue;
		    }
		    if (edges.length >= minimumEdgeLimit)
			break;
		    edges = new Array();
		    initStdDev--;
		}
		
		var cen_count=0;
		var cen_x=0;
		var cen_y=0;
		var cen_v=0;
		var cen_w=0;
		var width_sum=0;

		// Let's sort edges, starting with widest
		edges.sort(function(s1, s2) { return s2.width - s1.width;});
		for (var i=0; i < edges.length; i++) {
		    if (edges[i].scanned) 
			continue;
		    cen_x = edges[i].x;
		    cen_y = edges[i].y;
		    cen_v = edges[i].sum;
		    cen_w = edges[i].width;
		    var avg_x = 0;
		    var avg_y = 0;
		    sum = 0;
		    cen_count=0;
		    for (var j=0; j < edges.length;j++) {
			if (edges[j].scanned)
			    continue;
			if (this.checkCollision(edges[j], edges[i])) {
			    if (edges[j].sum >= cen_v) {
				cen_v = edges[j].sum;
				cen_w = edges[j].width;
			    }
			    edges[j].scanned = true;
			    cen_count++;
			    avg_x += edges[j].x * edges[j].val;
			    avg_y += edges[j].y * edges[j].val;
			    sum += edges[j].val;
			    continue;
			}
		    }
	            var cen_limit = (MINIMUM_ROWS_PER_CENTER - (MINIMUM_STDVAR - initStdDev));
		    if (edges.length < LOW_EDGE_CUTOFF_1) {
			if (edges.length < LOW_EDGE_CUTOFF_2)
			    cen_limit = 1;
			else
			    cen_limit = 2;
		    }
	            if (cen_limit < 1)
			continue;
		    if (cen_count >= cen_limit) {
			// We detected a centroid, let's init it
			var rCenter={};
			
			rCenter.x = avg_x/sum;
			rCenter.y = avg_y/sum;
			rCenter.width = cen_w; // seems there is an error here in source
			width_sum += rCenter.width;
			            // Calculate Total Flux From Center, Half Flux, Full Summation
			var TF = 0;
			var HF = 0;
			var FSum = 0;
			cen_x = ~~(rCenter.x);
			cen_y = ~~(rCenter.y);
			if (cen_x < 0 || cen_x > this.histogram.width || cen_y < 0 || cen_y > this.histogram.height)
			    continue;
			// Complete sum along the radius
			for (var k=~~(rCenter.width/2); k >= -(~~(rCenter.width/2)) ; k--)
			    FSum += this.data[cen_x-k+(cen_y*this.histogram.width)] - min;
			
			// Half flux
			HF = FSum / 2.0;

			// Total flux starting from center
			TF = this.data[cen_y * this.histogram.width + cen_x] - min;
			
			var pixelCounter = 1;
			// Integrate flux along radius axis until we reach half flux
			for (var k=1; k < ~~(rCenter.width/2); k++) {
			    TF += this.data[cen_y * this.histogram.width + cen_x + k] - min;
			    TF += this.data[cen_y * this.histogram.width + cen_x - k] - min;
			    
			    if (TF >= HF) {
				break;
			    }

			    pixelCounter++;
			}
			// Calculate weighted Half Flux Radius
			rCenter.HFR = pixelCounter * (HF / TF);
			// Store full flux
			rCenter.val = FSum;
			this.starCenters.push(rCenter);
		    }
		}
		console.log('findcentroid : found '+this.starCenters.length+' stars');
	    },
	    getHFR : function (type) {
		// This method is less susceptible to noise
		// Get HFR for the brightest star only, instead of averaging all stars
		// It is more consistent.
		// TODO: Try to test this under using a real CCD.
		
		if (this.starCenters.length == 0)
		    return -1;

		if (type == 'HFR_MAX') {
		    var maxVal=0;
		    var maxIndex=0;
		    for (var i=0; i < this.starCenters.length ; i++) {
			if (this.starCenters[i].val > maxVal) {
			    maxIndex=i;
			    maxVal = this.starCenters[i].val;
			}
		    }

		    maxHFRStar = this.starCenters[maxIndex];
		    return this.starCenters[maxIndex].HFR;
		}

		var FSum=0;
		var avgHFR=0;
		// Weighted average HFR
		for (var i=0; i < this.starCenters.length ; i++) {
		    avgHFR += this.starCenters[i].val * this.starCenters[i].HFR;
		    FSum   += this.starCenters[i].val;
		}

		if (FSum != 0) {
		    return (avgHFR / FSum);
		} else
		    return -1;
	    },

	    findStars : function() {
		if (typeof(this.histogram) === 'undefined')
		    return -1;
		if (!this.starSearched) {
		    this.starCenters=new Array();
		    if (this.histogram.JMIndex < JM_UPPER_LIMIT) {
			this.findCentroid(MINIMUM_STDVAR, MINIMUM_PIXEL_RANGE);
			//var hfrmax=this.getHFR('HFR_MAX');
			//var hfravg=this.getHFR('HFR_AVG');
			//console.log('HFR MAX: '+ hfrmax+' HFR_AVG: '+hfravg);
		    }
		}
		this.starSearched = true;
		return this.starCenters.length;
	    }
	};
	
	return starfind;
    }(jQuery)),

    simpletextviewer: (function($) {
	var simpletextviewer = function(iblob) {
	    this.iblob = iblob;
	    this.textarea=$('<textarea style="width:100%" rows="10" readonly="readonly"/>');
	};

	simpletextviewer.prototype = {
	    constructor: simpletextviewer,
	    getdivelt : function () {
		return this.textarea;
	    },
	    refresh : function() {
		this.textarea.html(this.iblob.blob);
	    },
	    controls: function () {
		return 'simpletext';
	    }
	};
	
	return simpletextviewer;
    }(jQuery)),

     simpleimageviewer: (function($) {
	var canvasdim = {width: 400, height: 300};

	var simpleimageviewer = function() {
	    this.name = 'none';
	    this.format='';
	    this.divelt=$('<div></div>',{
		css: {'text-align': 'center'}
	    });
	    this.canvas=$('<canvas></canvas>', {
		attr: {width: canvasdim.width, height: canvasdim.height},
		css: {border: '1px solid'},
		html: this.name+' canvas display not supported by your browser'
	    });
	    this.ctx=this.canvas[0].getContext('2d');
	    this.image=new Image();
	    //this.image=$('<img/>');
	    $(this.image).on('load', {context: this}, function (evt) {
		var viewer=evt.data.context;
		//alert('image for '+viewer.iblob.name+' loaded');
		viewer.refresh();
	    });
	    //this.format=this.iblob.format.substring(1);
	    //this.compressed=(this.format.charAt(this.format.length - 1) == 'z');
	    //if (this.compressed) {
	    //  this.format=this.iblob.format.substring(1, this.iblob.format.length - 1);
	    //  //this.iblob=
	    //}
	    this.divelt.append(this.canvas);
	    // Controls
	    this.controlsdiv=$('<table></table>',{
		//attr: {width: '400', height: '300'},
		css: {border:  '1px solid', 'font-size':'smaller'}
	    });
	    this.widthelt=$('<td></td>');
	    this.controlsdiv.append('<tr><th>Width</th></tr>');
	    this.controlsdiv.append('<tr>',this.widthelt,'</tr>');
	    this.heightelt=$('<td></td>');
	    this.controlsdiv.append('<tr><th>Height</th></tr>');
	    this.controlsdiv.append('<tr>',this.heightelt,'</tr>');
	    // pan/zoom
	    this.zoom={ value: 1.0, x: 1.0, y: 1.0, max: 1.0, step: 1.1};
	    this.center={x:0, y: 0, imgx: 0, imgy: 0};
	    this.orig={x:0, y: 0, imgx: 0, imgy: 0};
	    this.size={x:0, y: 0, imgx: 0, imgy: 0};
	    this.mouse={x: 0, y: 0, imgx: 0, imgy:0};
	    this.dragstart=false;
	    this.zoomrange=$('<input/>', {
		attr: {type: "range", min: "1", max: "301"},
		css: {width: '300px', 'text-align': 'none'},
	    });
	    this.divelt.append('<br/>', '<span>', 'Fit', this.zoomrange, 'Max', '</span>');
	    this.zoomelt=$('<td></td>');
	    this.controlsdiv.append('<tr><th>Zoom</th></tr>');
	    this.controlsdiv.append('<tr>',this.zoomelt,'</tr>');
	    this.centerxelt=$('<td></td>');
	    this.centeryelt=$('<td></td>');
	    this.controlsdiv.append('<tr><th>Center</th></tr>');
	    this.controlsdiv.append('<tr>',this.centerxelt,'</tr>');	    
	    this.controlsdiv.append('<tr>',this.centeryelt,'</tr>');
	    
	    this.zoomrange.on('change', {context: this}, function(evt) {
		var viewer=evt.data.context;
		var z = viewer.zoomrange.val();
		var zoomvalue = Math.pow(viewer.zoom.step, (z / viewer.zoomrange.attr('step')));
		viewer.redrawzoom(zoomvalue);
		viewer.zoomelt.empty();
		viewer.zoomelt.append(((viewer.zoom.value / viewer.zoom.max) * 100).toFixed(2)+'%');
	    });
	    this.canvas.on('mousedown', {context: this}, function(evt) {
		var viewer=evt.data.context;
		var offset=viewer.canvas.offset();
		if (evt.which != 1) return;
		viewer.dragstart=true;
		viewer.mouse.x = evt.pageX - offset.left;
		viewer.mouse.y = evt.pageY - offset.top;
		//alert('mousedown page x '+evt.pageX+' y '+evt.pageY + ' canvas left '+offset.left+' top '+offset.top);
		/*
		  viewer.canvas.on('mousemove', {context: viewer}, function(evt) {
		    var viewer=evt.data.context;
		    var offset=viewer.canvas.offset();
		    viewer.centerxelt.empty();
		    viewer.centerxelt.append((evt.pageX - offset.left).toFixed(2));
		    viewer.centeryelt.empty();
		    viewer.centeryelt.append((evt.pageY - offset.top).toFixed(2));
		});
		*/
		viewer.canvas.on('mouseup', {context: viewer}, function(evt) {
		    var viewer=evt.data.context;
		    var offset=viewer.canvas.offset();
		    if (evt.which != 1) return;
		    //alert('mouseup page x '+evt.pageX+' y '+evt.pageY + ' canvas left '+offset.left+' top '+offset.top);
		    var dx = (viewer.mouse.x - (evt.pageX - offset.left)) * viewer.zoom.max / viewer.zoom.value;
		    var dy = (viewer.mouse.y - (evt.pageY - offset.top)) * viewer.zoom.max / viewer.zoom.value;
		    viewer.redrawpan(dx, dy);
		    viewer.canvas.off('mousemove');
		    viewer.canvas.off('mouseup');
		});
	    });

	};
   
	simpleimageviewer.prototype = {
	    constructor: simpleimageviewer,
	    getdivelt : function () {
		return this.divelt;
	    },
	    //reload: function() {
	    //  this.image.src='data:image/'+this.format+';base64,'+this.iblob.b64blob;
	    //},
	    reload: function(format, data) {
		this.format = format;
		this.data = data;
		//this.image.src='data:image/'+this.format+';'+this.data;
		this.image.src=this.data;
	    },
	    redrawpan: function(dx, dy) {
		this.ctx.clearRect(0, 0, canvasdim.width, canvasdim.height);
		if (this.orig.imgx + dx < 0)
		    this.orig.imgx = 0;
		else if (this.orig.imgx + dx + this.size.imgx > this.image.width)
		    this.orig.imgx = this.image.width -  this.size.imgx;
		else
		    this.orig.imgx +=dx;
		if (this.orig.imgy + dy < 0)
		    this.orig.imgy = 0;
		else if (this.orig.imgy + dy + this.size.imgy > this.image.height)
		    this.orig.imgy = this.image.height -  this.size.imgy;
		else
		    this.orig.imgy +=dy;
		this.centerxelt.empty();
		this.centerxelt.append((this.orig.imgx + (this.size.imgx/2)).toFixed(0));
		this.centeryelt.empty();
		this.centeryelt.append((this.orig.imgy+(this.size.imgy/2)).toFixed(0));
		this.ctx.drawImage(this.image, this.orig.imgx, this.orig.imgy, this.size.imgx, this.size.imgy, 
				   this.orig.x, this.orig.y, this.size.x, this.size.y
				  );
	    },
	    redrawzoom: function(zoomvalue) {
		this.ctx.clearRect(0, 0, canvasdim.width, canvasdim.height);
		zoomvalue=Math.min(zoomvalue, this.zoom.max);
		var dx = ((this.image.width/this.zoom.value) - (this.image.width/zoomvalue)) / 2;
		var dy = ((this.image.height/this.zoom.value) - (this.image.height/zoomvalue)) / 2;
		if (this.orig.imgx + dx < 0)
		    this.orig.imgx = 0;
		else if (this.orig.imgx + dx + this.size.imgx > this.image.width)
		    this.orig.imgx = this.image.width -  this.size.imgx;
		else
		    this.orig.imgx +=dx;
		if (this.orig.imgy + dy < 0)
		    this.orig.imgy = 0;
		else if (this.orig.imgy + dy + this.size.imgy > this.image.height)
		    this.orig.imgy = this.image.height -  this.size.imgy;
		else
		    this.orig.imgy +=dy;		
		this.orig.x = Math.max(0, (canvasdim.width / 2) - (this.image.width * zoomvalue/ (2 * this.zoom.max)));
		this.orig.y = Math.max(0, (canvasdim.height / 2) - (this.image.height * zoomvalue / (2 * this.zoom.max)));
		this.size.imgx = this.image.width/zoomvalue;
		this.size.imgy = this.image.height/zoomvalue
		this.size.x = Math.min(canvasdim.width, (this.image.width * zoomvalue / this.zoom.max));
		this.size.y = Math.min(canvasdim.height, (this.image.height * zoomvalue / this.zoom.max));
		this.centerxelt.empty();
		this.centerxelt.append((this.orig.imgx + (this.size.imgx/2)).toFixed(0));
		this.centeryelt.empty();
		this.centeryelt.append((this.orig.imgy+(this.size.imgy/2)).toFixed(0));
		this.ctx.drawImage(this.image, this.orig.imgx, this.orig.imgy, this.size.imgx, this.size.imgy, // clip image
				   this.orig.x, this.orig.y, this.size.x, this.size.y                // reduce/stretch image
				  );
		this.zoom.value = zoomvalue;
	    },
	    refresh : function() {
		this.zoom.max=Math.max((this.image.width/canvasdim.width), (this.image.height/canvasdim.height));
		this.zoomrange.attr('step', 300 / Math.ceil(Math.log(this.zoom.max) / Math.log(this.zoom.step)));
		this.widthelt.empty();this.widthelt.append(this.image.width.toString());
		this.heightelt.empty();this.heightelt.append(this.image.height.toString());
		this.orig.imgx = 0; this.orig.imgy = 0;
		this.zoom.value = 1.0;
		this.redrawzoom(1.0);
	    },
	    controls: function () {
		return this.controlsdiv;
	    }
	};
	
	return simpleimageviewer;
    }(jQuery)),

    glviewer: (function($) {
	var viewOptions= {
	    header: { label:'View Header'},
	    data: { label:'View Data'}
	};
	//use square viewport for astro.js/rawimage
	var viewDims =  { width: 640, height: 480 };
	var colormaps= [
	    'base64','Accent','Blues','BrBG','BuGn','BuPu','CMRmap','Dark2','GnBu','Greens','Greys','OrRd','Oranges','PRGn',
	    'Paired','Pastel1','Pastel2','PiYG','PuBuGn','PuBu','PuOr','PuRd','Purples','RdBu','RdGy','RdPu','RdYlBu','RdYlGn',
	    'Reds','Set1','Set2','Set3','Spectral','YlGnBu','YlGn','YlOrBr','YlOrRd','afmhot','autumn','binary','bone','brg',
	    'bwr','cool','coolwarm','copper','cubehelix','flag','gist_earth','gist_gray','gist_heat','gist_ncar','gistainbow',
	    'gist_stern','gist_yarg','gnuplot2','gnuplot','gray','hot','hsv','jet','ocean','pink','prism','rainbow','seismic',
	    'spectral','spring','summer','terrain','winter'
	];
	var glviewer = function() {
	    var tmpelt=null;
	    //this.iblob = iblob;
	    this.name = 'none';
	    this.fits=null;
	    this.blobblob=null;
	    this.hdus=new Array();
	    this.divelt=$('<div></div>',{
		css: {width: (viewDims.width+4)+'px', height: (viewDims.height+(2 * 28))+'px', 
		      'overflow-x': 'auto', 'overflow-y': 'auto'}
	    });
	    // Controls
	    this.controlsdiv=$('<table></table>',{
		//attr: {width: '400', height: '300'},
		css: {border:  '1px solid', 'font-size':'smaller'}
	    });
	    this.hduslist=$('<tr></tr>', {
		html: '<th colspan="4">HDUs</th>'
	    });
	    this.selected=null;
	    this.current=null;
	    this.hduselected=$('<tr></tr>', {
		html: '<th colspan="4">None</th>'
	    });	    
	    this.selectview=$('<select></select>');
	    for (var v in viewOptions) { 
		var opt=viewOptions[v];
		var optelt=$('<option value="'+v+'">'+opt.label+'</option>');
		this.selectview.append(optelt);
		opt.optelt=optelt;
	    }
	    this.selectview.on('change', {context: this}, function(evt) {
		var viewer = evt.data.context;
		viewer.setview(this[this.selectedIndex].value);
	    	//alert('view changed');
	    });
	    this.controlsdiv.append(this.hduslist);
	    this.controlsdiv.append(this.hduselected);
	    tmpelt=$('<td colspan="4"></td>');
	    tmpelt.append(this.selectview);
	    this.controlsdiv.append($('<tr></tr>').append(tmpelt));
	    this.currentview=null;
	    this.defaultdataelt=$('<div/>',{
		css : {border: '1px solid'},
		html : '<b>No display for this HDU type</b>'
	    });
	};

	glviewer.prototype = {
	    constructor: glviewer,
	    getdivelt : function () {
		return this.divelt;
	    },
	    buildhduelt: function (index, hdu) {
		var elt = $('<tr></tr>');
		var sel=$('<td title="Select"><button>'+index+'</button></td>');
		var hdr=hdu.header;
		elt.append(sel);
		sel.on('click', {context: this}, function(evt) {
		    evt.data.context.setcurrenthdu(index);
		});
		if (hdr.isPrimary())
		    elt.append('<td title="Primary">P</td>');
		else if (hdr.isExtension())
		    elt.append('<td title="Extension">E</td>');
		else
		    elt.append('<td title="Unknown">?</td>');
		if (hdr.hasDataUnit())
 		    elt.append('<td title="Has Data">x</td>');	
		else
		    elt.append('<td title="No Data">-</td>');
		elt.append('<td title="Data Type">'+hdr.getDataType()+'</td>');
		return elt;
	    },
	    buildfitsheaderelt: function (index, hdu) {
		var elt = $('<table></table>',{
		    css : {border: '1px solid', 'font-size': 'smaller'}
		});
		var hdr=hdu.header;
		elt.append('<tr><th colspan="4">FITS Header for HDU'+index+'</th></tr>');
		for (var card in hdr.cards) {
		    var c=hdr.cards[card];
		    if (Array.isArray(c)) {
			if (c.length == 0) {
			    elt.append('<tr><td></td><td>'+card+'</td><td colspan="2"><i>empty</i></td>');
			} else {
			    elt.append('<tr><td rowspan="'+c.length+'"></td><td rowspan="'+c.length+'">'+card+
				       '</td><td colspan="2">'+c[0]+'</td>');
			    for (var l=1; l < c.length; l++) {
				elt.append('<tr><td colspan="2">'+c[l]+'</td>');		
			    }
			} 
		    } else {
			elt.append('<tr><td>'+c.index+'</td><td>'+card+'</td><td>'+c.value+'</td><td>'+c.comment+'</td></tr>');
		    }
		}
		elt.hide();
		return elt;
	    },
	    // Define callback for when pixels have been read from file
	     createVisualization: function(arr, opts) {
		 var viewer=opts.context;
		 var stretchselect=opts.ctrlelts.stretchselect;
		 var colormapselect=opts.ctrlelts.colormapselect;
		 var flipXcheckbox = opts.ctrlelts.flipXcheckbox;
		 var flipYcheckbox = opts.ctrlelts.flipYcheckbox;
		 var crosshaircheckbox = opts.ctrlelts.crosshaircheckbox;
		 // Get dataunit, width, and height from options
		 //var dataunit = opts.dataunit;
		 var width = opts.width;
		 var height = opts.height;
		 

		 // Get the minimum and maximum pixels
		 var extent = opts.extent || [];
		 
		 // Get the DOM element
		 var el =  opts.el;
		 var factor= Math.min(viewDims.width / width, viewDims.height / height);
		 
		 // Initialize a WebFITS context with a viewer of size width
		 var raw;
		 if (factor < 1.0) 
		   raw = new rawimage(el, {width: factor * width, height: factor*height});
	         else 
		   raw = new rawimage(el, {width: width, height: height});
		 //var raw = new rawimage(el, 400);
		 if (!raw)
		     alert('Can not create rawimage(webgl absent?)');
		 
		 this.frame = arr;
		 this.histogram = new Indi.util.histogram(arr, width, height, extent);
		 if (factor < 1.0)
		     this.histogram.constructHistogram(factor * width, 100);
		 else
		     this.histogram.constructHistogram(width, 100);
		 this.starfind = new Indi.util.starfind(arr, this.histogram);
		 this.starfind.findStars();
		 this.hfrelt.html('<b>HFR max/avg: '+this.starfind.getHFR('HFR_MAX').toFixed(2)+'/'+this.starfind.getHFR('HFR_AVG').toFixed(2)+'</b>');

		 // Enable pan and zoom controls
		 raw.setupControls({
		     onmousemove: function(x, y, opts, e) {
			 // 'this' is the rawimage
			 var coord = (x-1)  + (y-1) * width;
			 thisviewer=opts.context;
			 if (x >=  1 && x <= width && y>= 1 && y <= height) {
			     thisviewer.xoffsetelt.html('X Offset: '+x);
			     thisviewer.yoffsetelt.html('Y Offset: '+y);
			     thisviewer.valueelt.html('Pixel value: '+ thisviewer.frame[coord].toFixed(2));
			     //console.log(thisviewer.iblob.name +' '+x+', '+y);
			 }
		     }
		 }, {context: this});
		 
		 //raw.zoom = (factor/2) / width;
		 //raw.zoom = 2.0 / width;
		 if (factor < 1.0) {
		     raw.zoomX = raw.zoomX * factor;
		     raw.zoomY = raw.zoomY * factor;
		     raw.xOffset=-width / 2;
		     raw.yOffset=-height / 2;
		 }
		 // Load array representation of image
		 raw.loadImage(viewer.name, arr, width, height);
		 // Load all other frames
		 if (this.frames.length > 0) {
		     for (var i = 0; i < this.frames.length; i++)
			 raw.loadImage(viewer.name+'_FRAME'+i, this.frames[i], width, height);
		 }
		 raw.setImage(viewer.name);
		 // Set the intensity range and stretch
		 raw.setExtent(this.histogram.min, this.histogram.max);
		 raw.setStretch('linear');
		 for (var stretch in raw.fragmentShaders) {
		     var stretchoptelt=$('<option value="'+raw.fragmentShaders[stretch]+'">'+raw.fragmentShaders[stretch]+'</option>');
		     if (raw.fragmentShaders[stretch] == 'linear') stretchoptelt.attr('selected', 'selected');
		     stretchselect.append(stretchoptelt);
		 }
		 stretchselect.on('change', {context: this, raw: raw}, function(evt) {
		     var stretch = this[this.selectedIndex].value;
		     var viewer = evt.data.context;
		     evt.data.raw.setStretch(stretch);
		     if ((stretch == 'color') && (viewer.frames.length >=3)) {
			 evt.data.raw.drawColor(viewer.name+'_FRAME0', viewer.name+'_FRAME1', viewer.name+'_FRAME2');
		     } else {
			 //evt.data.raw.setImage(viewer.name); 
			 evt.data.raw.draw();
		     }
		 });

		 raw.setColorMap('binary');
		 for (var cmap in colormaps) {
		     var cmapoptelt=$('<option value="'+colormaps[cmap]+'">'+colormaps[cmap]+'</option>');
		     if (colormaps[cmap] == 'binary') cmapoptelt.attr('selected', 'selected');
		     colormapselect.append(cmapoptelt);
		 }
		 colormapselect.on('change', {context: this, raw: raw}, function(evt) {
		     var cmap = this[this.selectedIndex].value;
		     evt.data.raw.setColorMap(cmap);
		 });		 
		 // Color Images 
		 raw.setScales(1.0/255, 1.0/255, 1.0/255);
		 raw.setCalibrations(1.0, 1.0, 1.0);
		 raw.setAlpha(1.0);
		 raw.setQ(1.0);
		 
		 flipXcheckbox.on('change', {context: this, raw: raw}, function(evt) {
		     evt.data.raw.flipX = !(evt.data.raw.flipX);
		     evt.data.raw.draw();
		 });		 
		 flipYcheckbox.on('change', {context: this, raw: raw}, function(evt) {
		     evt.data.raw.flipY = !(evt.data.raw.flipY);
		     evt.data.raw.draw();
		 });
		 crosshaircheckbox.on('change', {context: this, raw: raw}, function(evt) {
		     evt.data.raw.crosshair = !(evt.data.raw.crosshair);
		     if (evt.data.raw.crosshair)
			 evt.data.raw.setCursor('crosshair');
		     else
			 evt.data.raw.setCursor('none');
		 });
		 //raw.setCursor(); does not work
	     },
	    loadFrames: function (arr, opts) {
		var coeffRGB = [0.2126 , 0.7152, 0.0722]; 
		var _this=opts.context;
		var coeff = coeffRGB[_this.framesloaded];
		_this.frames[_this.framesloaded] = arr;
		if (_this.framesloaded < 3)
		    for (var i= 0; i < opts.height; i++)
			for (var j= 0; j < opts.width; j++)
			    _this.composite[i * opts.width +j] +=  (coeff * arr[i * opts.width +j]);
		_this.framesloaded += 1;
		if (_this.framesloaded == opts.nframes)
		    opts.callback.call(_this, _this.composite, opts.callbackopts);
		    //_this.invoke(opts.callback,  _this.composite, opts.callbackopts);
		
	    },
	    buildfitsdataelt: function (index, hdu) {

		if (hdu.header.getDataType() == 'Image')
		    return (this.buildfitsimageelt(index, hdu));
		else
		    return this.defaultdataelt;
	    },
	    buildimageelt: function() {
		var elt = $('<div></div>',{
		    css : {border: '1px solid'}
		});
		var controlelt = $('<div></div>',{
		    //css : {border: '1px solid'}
		});		
		var visuelt = $('<div></div>',{
		    //css : {border: '1px solid'}
		});
		var stretchselect = $('<select></select>');
		var colormapselect = $('<select></select>');
		var flipXcheckbox = $('<label>FlipH:<input type="checkbox" title="Flip horizontally"></input></label>',
				     {css : {border: '1px solid', 'margin-left': '3px', 'font-size': 'smaller'}});
		var flipYcheckbox = $('<label>FlipV:<input type="checkbox" title="Flip vertically"></input></label>',
				     {css : {border: '1px solid', 'margin-left': '3px', 'font-size': 'smaller'}});
		var crosshaircheckbox = $('<label>Crosshair:<input type="checkbox" title="Show crosshair"></input></label>',
				     {css : {border: '1px solid', 'margin-left': '3px', 'font-size': 'smaller'}});
		
		var statselt = $('<div></div>',{
		    //css : {display: 'inline-block'}
		});
		this.hfrelt = $('<span></span>', {css : {'margin-left': '5px'}});
		this.xoffsetelt = $('<span></span>', {css : {'margin-left': '5px'}});
		this.yoffsetelt = $('<span></span>', {css : {'margin-left': '5px'}});
		this.valueelt = $('<span></span>', {css : {'margin-left': '5px'}});
		
		

		statselt.append(this.hfrelt, this.xoffsetelt, this.yoffsetelt, this.valueelt);
		controlelt.append(stretchselect, colormapselect, flipXcheckbox, flipYcheckbox, crosshaircheckbox);
		elt.append(controlelt, visuelt, statselt);
		return {
		    elt: elt, 
		    visuelt: visuelt,
		    ctrlelts:  {
			stretchselect: stretchselect,
			colormapselect: colormapselect,
			flipXcheckbox: flipXcheckbox,
			flipYcheckbox: flipYcheckbox,
			crosshaircheckbox: crosshaircheckbox
		    }
		};
	    },
	    buildfitsimageelt: function (index, hdu) {
		var elts = this.buildimageelt();
		var elt=elts.elt; 
		var visuelt=elts.visuelt;
		var dataunit=hdu.data;
		// Set options to pass to the next callback
		var opts = {
		    context: this,
		    width: dataunit.width, 
		    height:dataunit.height,
		    el: visuelt[0],
		    ctrlelts: elts.ctrlelts
		};
		if ((dataunit.naxis.length == 3) && (dataunit.depth > 1)) {
		    this.composite = new Array(dataunit.width * dataunit.height);
		    for (var i = 0; i < dataunit.width * dataunit.height; i++)
			this.composite[i] = 0;
		    this.frames = new Array(dataunit.depth);
		    this.framesloaded = 0;
		    dataunit.getFrames(0, dataunit.depth, this.loadFrames, 
				       { context: this, width: dataunit.width, height:dataunit.height, nframes: dataunit.depth, 
					 callback: this.createVisualization,  callbackopts: opts}
				      );
		} else {
		    this.frames = new Array();
		    // Get pixels representing the image and pass callback with options
		    dataunit.getFrame(0, this.createVisualization, opts);
		}
		elt.hide();
		return elt;
	    },
	    buildjpegimageelt: function (image) {
		var elts = this.buildimageelt();
		var elt=elts.elt; 
		var visuelt=elts.visuelt;
		var coeffRGB = [0.2126 , 0.7152, 0.0722]; 
		var frameR=new Array(image.width*image.height);
		var frameG=new Array(image.width*image.height);
		var frameB=new Array(image.width*image.height);
		this.frames=[frameR, frameG, frameB];
		this.composite = new Array(image.width*image.height);		    
		var coeffR=coeffRGB[0]; 
		var coeffG=coeffRGB[1]; 
		var coeffB=coeffRGB[2]; 
		var canvas = document.createElement('canvas');
		var context = canvas.getContext('2d');
		canvas.width=image.width;
		canvas.height=image.height;
		context.drawImage(image, 0, 0 );
		var imagedata = context.getImageData(0, 0, canvas.width, canvas.height);

		var index = 0;
		var indexsrc = 0;
		for (var i= 0; i < image.height; i++) {
		    for (var j= 0; j < image.width; j++) {
			frameR[index]=imagedata.data[indexsrc];
			this.composite[index] =  (coeffR * imagedata.data[indexsrc]);
			frameG[index]=imagedata.data[indexsrc+1];
			this.composite[index] +=  (coeffG * imagedata.data[indexsrc+1]);
			frameB[index]=imagedata.data[indexsrc+2];
			this.composite[index] +=  (coeffB * imagedata.data[indexsrc+2]);
			index+=1;
			indexsrc+=4;
		    }
		}
		var opts = {
		    context: this,
		    width: image.width, 
		    height: image.height,
		    el: visuelt[0],
		    ctrlelts: elts.ctrlelts
		};
		this.createVisualization(this.composite, opts);
		elt.hide();
		return elt;
	    },
	    //reload: function () {
	    //this.fits=null;
	    //this.blobblob=null;
	    //this.blobblob = new Blob([Indi.util.str2ab(this.iblob.blob)], {type: 'application/octet-binary'});
	    //this.fits=new astro.FITS( this.blobblob, this.refresh, {context: this});
	    //if (!this.fits) alert ('glviewer: can not load fits');
	    //},
	    reload: function (format, data) {
		this.format=format;
		this.fits=null;
		this.jpeg=null;
		if (this.format == 'fits') {
		    data=data.substring(data.indexOf('base64,') + 7);
		    this.blobblob = new Blob([Indi.util.str2ab(Indi.util.b64decode(data))], {type: 'application/octet-binary'});
		    this.fits=new astro.FITS( this.blobblob, this.refresh, {context: this});
		    if (!this.fits) alert ('glviewer: can not load fits');
		}
		if ((this.format == 'jpg') || (this.format == 'jpeg') || (this.format == 'gif') || (this.format == 'tiff') || (this.format == 'png')) {
		    var _this=this;
		    this.jpeg=new Image();
		    this.jpeg.src=data;
		    this.jpeg.onload = function(e) {_this.refresh(); };
		}
	    },
	    refresh : function () {
		var hdu = null;
		if (this.hdus) {
		    hdu=this.hdus.pop();
		    while (hdu) {
			if (hdu.fitsheaderelt) hdu.fitsheaderelt.remove();
			if (hdu.fitsdataelt) hdu.fitsdataelt.remove();
			hdu.elt.remove();
			hdu=this.hdus.pop();
		    } 
		}
		if (this.format == 'fits') {
		    if (!this.fits) alert ('glviewer: can not load fits');
		    for (var index=0; index < this.fits.hdus.length; index++) {
			var h = this.fits.hdus[index];
			var e=this.buildhduelt(index, h);
			var he=this.buildfitsheaderelt(index,h);
			var ie=this.buildfitsdataelt(index,h);
			//this.hduslist.after(e);
			this.hduselected.before(e);
			this.hdus.push({elt: e, fitsheaderelt: he, fitsdataelt: ie});
			
		    }
		    this.setcurrenthdu(0);
		    //this.fits.hdus.length
		}
		if ((this.format == 'jpg') || (this.format == 'jpeg') || (this.format == 'gif') || (this.format == 'tiff') || (this.format == 'png')) {
		    var e = this.buildjpegimageelt(this.jpeg);
		    // TO BE REWRITTEN 
		    this.hdus.push({elt: e, fitsheaderelt: e, fitsdataelt: e});
		    this.setcurrenthdu(0);
		}
	    },
	    setcurrenthdu: function(index) {
		if (this.current) this.current.elt.css('background-color', '');
		this.selected=index;
		this.current=this.hdus[this.selected];
		this.current.elt.css('background-color', '#E0E0E0');
		this.divelt.empty();		
		this.hduselected.empty();
		this.hduselected.append('<th colspan="4">HDU'+this.selected+'</th>');
		this.resetselectview();
		if (this.current.fitsheaderelt) {
		    this.divelt.append(this.current.fitsheaderelt);		
		    this.enableselectview('header');
		    this.setselectedview('header');
		    this.setview('header');
		}
		if (this.current.fitsdataelt) {
		    this.divelt.append(this.current.fitsdataelt);		
		    this.enableselectview('data');
		    this.setselectedview('data');
		    this.setview('data');
		}
	    },
	    resetselectview: function() {
		for (var v in viewOptions)
		    viewOptions[v].optelt.attr('disabled', 'disabled');
	    },
	    enableselectview: function(value) {
		viewOptions[value].optelt.removeAttr('disabled');
	    },
	    setselectedview: function(value) {
		for (var v  in viewOptions)
		    viewOptions[v].optelt.removeAttr('selected');
		viewOptions[value].optelt.attr('selected', 'selected');
	    },
	    setview:  function(value) {
		if (this.currentview) this.currentview.hide();
		if (this.current) {
		    switch (value) {
		    case 'header': 
			if (this.current.fitsheaderelt) 
			    this.currentview = this.current.fitsheaderelt;
			break;
		    case 'data': 
			if (this.current.fitsdataelt)
			    this.currentview = this.current.fitsdataelt;
			break;
		    }
		}
		if (this.currentview) this.currentview.show();
	    },
	    controls: function () {
		return this.controlsdiv;
	    }
	};
	
	return glviewer;
    }(jQuery)),

};
