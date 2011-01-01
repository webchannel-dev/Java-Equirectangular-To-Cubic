/**
 * Creates a new cache instance.
 *
 * @class Tile cache for the {@link bigshot.TileLayer}.
 * @constructor
 */
bigshot.TileTextureCache = function (onLoaded, parameters, _webGl) {
    this.webGl = _webGl;
    
    
    /**
        * Maximum number of tiles in the cache.
        * @private
        * @type int
        */
    this.maxCacheSize = 512;
    this.cachedImages = {};
    this.requestedImages = {};
    this.lastOnLoadFiredAt = 0;
    this.imageRequests = 0;
    this.lruMap = new bigshot.LRUMap ();
    this.onLoaded = onLoaded;
    this.browser = new bigshot.Browser ();
    
    this.getTexture = function (tileX, tileY, zoomLevel) {
        var key = this.getImageKey (tileX, tileY, zoomLevel);
        this.lruMap.access (key);
        
        if (this.cachedImages[key]) {
            return this.cachedImages[key];
        } else {
            this.requestImage (tileX, tileY, zoomLevel);
            return null;
        }
    };
    
    this.requestImage = function (tileX, tileY, zoomLevel) {
        var key = this.getImageKey (tileX, tileY, zoomLevel);
        if (!this.requestedImages[key]) {
            this.imageRequests++;
            var tile = document.createElement ("img");
            var that = this;
            this.browser.registerListener (tile, "load", function () {                        
                    that.cachedImages[key] = that.webGl.createImageTextureFromImage (tile);
                    delete that.requestedImages[key];
                    that.imageRequests--;
                    var now = new Date();
                    if (that.imageRequests == 0 || now.getTime () > (that.lastOnLoadFiredAt + 50)) {
                        that.purgeCache ();
                        that.lastOnLoadFiredAt = now.getTime ();
                        that.onLoaded ();
                    }
                }, false);
            this.requestedImages[key] = tile;
            tile.src = this.getImageFilename (tileX, tileY, zoomLevel);                    
        }            
    };
    
    this.purgeCache = function () {
        for (var i = 0; i < 4; ++i) {
            if (this.lruMap.getSize () > this.maxCacheSize) {
                var leastUsed = this.lruMap.leastUsed ();
                this.lruMap.remove (leastUsed);
                this.webGl.deleteTexture (this.cachedImages[leastUsed]);
                delete this.cachedImages[leastUsed];
            }
        }
    };
    
    this.getImageKey = function (tileX, tileY, zoomLevel) {
        return "I" + tileX + "_" + tileY + "_" + zoomLevel;
    };
    
    this.getImageFilename = function (tileX, tileY, zoomLevel) {
        var f = parameters.fileSystem.getImageFilename (tileX, tileY, zoomLevel);
        return f;
    };
    
    return this;
};


function VRFace (owner, key, topLeft_, width_, u, v) {
    var that = this;
    this.owner = owner;
    this.key = key;
    this.topLeft = topLeft_;
    this.width = width_;
    this.u = u;
    this.v = v;
    this.updated = false;
    this.parameters = new Object ();
    
    for (var k in this.owner.getParameters ()) {
        this.parameters[k] = this.owner.getParameters ()[k];
    }
    
    bigshot.setupFileSystem (this.parameters);
    this.parameters.fileSystem.setPrefix ("face_" + key + "/");
    
    this.browser = new bigshot.Browser ();
    var req = this.browser.createXMLHttpRequest ();
    
    req.open("GET", this.parameters.fileSystem.getFilename ("descriptor"), false);   
    req.send(null);  
    if(req.status == 200) {
        var substrings = req.responseText.split (":");
        for (var i = 0; i < substrings.length; i += 2) {
            if (!this.parameters[substrings[i]]) {
                if (substrings[i] == "suffix") {
                    this.parameters[substrings[i]] = substrings[i + 1];
                } else {
                    this.parameters[substrings[i]] = parseInt (substrings[i + 1]);
                }
            }
        }
    }
    
        
    this.pt3dMultAdd = function (p, m, a) {
        return {
            x : p.x * m + a.x,
            y : p.y * m + a.y,
            z : p.z * m + a.z
        };
    };
    
    this.pt3dMult = function (p, m) {
        return {
            x : p.x * m,
            y : p.y * m,
            z : p.z * m
        };
    };
    
    this.tileCache = new bigshot.TileTextureCache (function () { 
            that.updated = true;
            owner.renderUpdated ();
        }, this.parameters, this.owner.webGl);
    this.tileCache.maxCacheSize = 4096;
    
    this.fullSize = this.parameters.width;
    
    this.overlap = this.parameters.overlap;
    this.tileSize = this.parameters.tileSize;
    
    this.minDivisions = 0;
    var fullZoom = Math.log (this.fullSize - this.overlap) / Math.LN2;
    var singleTile = Math.log (this.tileSize - this.overlap) / Math.LN2;
    this.maxDivisions = fullZoom - singleTile;
    
    this.minDivisions = 2;
    this.maxDivisions = 3;
    
    this.generateFace = function (scene, topLeft, width, u, v, key, tx, ty, divisions) {
        width *= 1 + this.overlap / this.tileSize;
        
        var texture = this.tileCache.getTexture (tx, ty, -this.maxDivisions + divisions);
        scene.addQuad (new bigshot.WebGLTexturedQuad (
                topLeft,
                this.pt3dMult (u, width),
                this.pt3dMult (v, width),
                texture
            )
        );
    }
    
    this.isBehind = function (renderer, p) {
        return false;
        /* FIXME
        var tp = renderer.transform.transformPoint (p);
        return tp.z > -0.1;
        */
    }
    
    this.generateSubdivisionFace = function (renderer, scene, topLeft, width, u, v, key, divisions, tx, ty) {
        var bottomLeft = this.pt3dMultAdd (v, width, topLeft);
        var topRight = this.pt3dMultAdd (u, width, topLeft);
        var bottomRight = this.pt3dMultAdd (u, width, bottomLeft);
        
        var numBehind = 0;
        if (this.isBehind (renderer, topLeft)) {
            numBehind++;
        }
        if (this.isBehind (renderer, bottomLeft)) {
            numBehind++;
        }
        if (this.isBehind (renderer, topRight)) {
            numBehind++;
        }
        if (this.isBehind (renderer, bottomRight)) {
            numBehind++;
        }
        
        if (numBehind == 4) {
            return;
        }
        var straddles = numBehind > 0;
        
        var dmax = this.screenDistanceMax (renderer, topLeft, topRight).d;
        dmax = Math.max (this.screenDistanceMax (renderer, topRight, bottomRight).d, dmax);
        dmax = Math.max (this.screenDistanceMax (renderer, bottomRight, bottomLeft).d, dmax);
        dmax = Math.max (this.screenDistanceMax (renderer, bottomLeft, topLeft).d, dmax);
        
        if (divisions < this.minDivisions || ((dmax > (this.tileSize - this.overlap) || straddles) && divisions < this.maxDivisions)) {
            var center = this.pt3dMultAdd ({x: u.x + v.x, y: u.y + v.y, z: u.z + v.z }, width / 2, topLeft);
            var midTop = this.pt3dMultAdd (u, width / 2, topLeft);
            var midLeft = this.pt3dMultAdd (v, width / 2, topLeft);
            this.generateSubdivisionFace (renderer, scene, topLeft, width / 2, u, v, key, divisions + 1, tx * 2, ty * 2);
            this.generateSubdivisionFace (renderer, scene, midTop, width / 2, u, v, key, divisions + 1, tx * 2 + 1, ty * 2);
            this.generateSubdivisionFace (renderer, scene, midLeft, width / 2, u, v, key, divisions + 1, tx * 2, ty * 2 + 1);
            this.generateSubdivisionFace (renderer, scene, center, width / 2, u, v, key, divisions + 1, tx * 2 + 1, ty * 2 + 1);
        } else {
            this.generateFace (scene, topLeft, width, u, v, key, tx, ty, divisions);
        }
    }
    
    this.isUpdated = function () {
        return this.updated;
    };
    
    this.render = function (renderer, scene) {
        this.updated = false;
        this.generateSubdivisionFace (renderer, scene, this.topLeft, this.width, this.u, this.v, this.key, 0, 0, 0);
    }
    
    
    this.projectPointToCanvas = function (renderer, p) {
        var tp = renderer.transform.transformPoint (p);
        if (tp.z > -0.01) {
            tp.z = -0.01;
        }
        return renderer.projectPointToCanvas (tp);
    }
    
    this.screenDistance = function (renderer, p0, p1) {
        var r = {
            x : 64,
            y : 64
        };
        return r;
        /* FIXME
        
        var p0t = this.projectPointToCanvas (renderer, p0);
        var p1t = this.projectPointToCanvas (renderer, p1);
        
        var r = {
            x : p0t.x - p1t.x,
            y : p0t.y - p1t.y
        };
        return r;
        */
    }
    
    this.screenDistanceHyp = function (renderer, p0, p1) {
        var r = this.screenDistance (renderer, p0, p1);
        r.d = Math.sqrt (r.x * r.x + r.y * r.y);
        return r;
    }
    
    this.screenDistanceMax = function (renderer, p0, p1) {
        var r = this.screenDistance (renderer, p0, p1);
        var ax = Math.abs (r.x);
        var ay = Math.abs (r.y);
        r.d = ax > ay ? ax : ay;
        return r;
    }
}

bigshot.VRPanorama = function (parameters) {
    var that = this;
    
    this.parameters = parameters;
    this.container = parameters.container;
    this.browser = new bigshot.Browser ();
    this.dragStart = null;
    
    this.state = {
        p : 0.0,
        y : 0.0,
        fov : 60
    };
    
    this.webGl = new bigshot.WebGL (this.container);
    this.webGl.initShaders();
    this.webGl.gl.clearColor(0.0, 1.0, 0.0, 1.0);
    this.webGl.gl.clearDepth(1.0);
    
    this.getParameters = function () {
        return this.parameters;
    }
    
    this.setFov = function (fov) {
        this.state.fov = fov;
    }
    
    this.getFov = function () {
        return this.state.fov;
    }
    
    this.setPitch = function (p) {
        this.state.p = p;
    }
    
    this.setYaw = function (y) {
        this.state.y = y;
    }
    
    this.setYaw = function (y) {
        this.state.y = y;
    }
    
    this.getYaw = function () {
        return this.state.y;
    }
    
    this.getPitch = function () {
        return this.state.p;
    }
    
    this.beginRender = function () {
        this.webGl.gl.viewport (0, 0, this.webGl.gl.viewportWidth, this.webGl.gl.viewportHeight);
        
        this.webGl.perspective (this.state.fov, this.webGl.gl.viewportWidth / this.webGl.gl.viewportHeight, 0.1, 100.0);
        this.webGl.mvReset ();
        
        this.webGl.mvTranslate ([0.0, 0.0, 0.0]);
        
        this.webGl.mvRotate (this.state.p, [1, 0, 0]);
        this.webGl.mvRotate (this.state.y, [0, 1, 0]);
    }
    
    this.endRender = function () {
    }
    
    this.render = function () {
        this.beginRender ();
        
        var scene = new bigshot.WebGLTexturedQuadScene (this.webGl);
        
        for (var f in this.vrFaces) {
            this.vrFaces[f].render (this.renderer, scene);
        }
        
        scene.render (this.webGl);
        
        // White background.
        /*renderer.ctx.setFillColor(1, 1, 1, 1);
        renderer.drawBackground();
        */
        this.endRender ();
    }
    
    this.renderUpdated = function () {
        this.beginRender ();
        
        var scene = new bigshot.WebGLTexturedQuadScene (this.webGl);
        
        for (var f in this.vrFaces) {
            if (this.vrFaces[f].isUpdated ()) {
                this.vrFaces[f].render (this.renderer, scene);
            }
        }
        
        scene.render (this.webGl);
        
        this.endRender ();
    };
    
    
    this.dragMouseDown = function (e) {
        this.dragStart = e;
    }
    
    this.dragMouseUp = function (e) {
        this.dragStart = null;
    }
    
    this.dragMouseMove = function (e) {
        if (this.dragStart != null) {
            var scale = this.state.fov / this.container.width;
            var dx = e.clientX - this.dragStart.clientX;
            var dy = e.clientY - this.dragStart.clientY;
            this.state.y -= dx * scale;
            this.state.p -= dy * scale;
            this.render ();
            this.dragStart = e;
        }
    }    
    
    /**
     * Helper function to consume events.
     * @private
     */
    var consumeEvent = function (event) {
        if (event.preventDefault) {
            event.preventDefault ();
        }
        return false;
    };
    
    this.vrFaces = new Array ();
    this.vrFaces[0] = new VRFace (this, "f", {x:-1, y:1, z:-1}, 2.0, {x:1, y:0, z:0}, {x:0, y:-1, z:0});
    this.vrFaces[1] = new VRFace (this, "b", {x:1, y:1, z:1}, 2.0, {x:-1, y:0, z:0}, {x:0, y:-1, z:0});
    this.vrFaces[2] = new VRFace (this, "l", {x:-1, y:1, z:1}, 2.0, {x:0, y:0, z:-1}, {x:0, y:-1, z:0});
    this.vrFaces[3] = new VRFace (this, "r", {x:1, y:1, z:-1}, 2.0, {x:0, y:0, z:1}, {x:0, y:-1, z:0});
    this.vrFaces[4] = new VRFace (this, "u", {x:-1, y:1, z:1}, 2.0, {x:1, y:0, z:0}, {x:0, y:0, z:-1});
    this.vrFaces[5] = new VRFace (this, "d", {x:-1, y:-1, z:-1}, 2.0, {x:1, y:0, z:0}, {x:0, y:0, z:1});
    
    
    this.browser.registerListener (this.container, "mousedown", function (e) {
            that.dragMouseDown (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (this.container, "mouseup", function (e) {
            that.dragMouseUp (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (this.container, 'mousemove', function (e) {
            that.dragMouseMove (e);
            return consumeEvent (e);
        }, false);
}


