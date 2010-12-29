function pt3dMultAdd (p, m, a) {
    return {
        x : p.x * m + a.x,
        y : p.y * m + a.y,
        z : p.z * m + a.z
    };
}

function pt3dMult (p, m) {
    return {
        x : p.x * m,
        y : p.y * m,
        z : p.z * m
    };
}

function pt3dAdd (p, a) {
    return {
        x : p.x + a.x,
        y : p.y + a.y,
        z : p.z + a.z
    };
}

bigshot.VRTextureInfo = function (divisions, tx, ty, face, textureImage) {
    this.divisions = divisions;
    this.tx = tx;
    this.ty = ty;
    this.face = face;
    this.textureImage = textureImage;
}


function alertObject (o) {
    var b = "";
    for (var k in o) {
        b += k + ": " + o[k] + "\n";
    }
    alert (b);
}

function VRFace (owner, key, topLeft_, width_, u, v) {
    var that = this;
    this.owner = owner;
    this.key = key;
    this.topLeft = pt3dMult (topLeft_, 1);
    this.width = width_ * 1;
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
    
    this.tileCache = new bigshot.ImageTileCache (function () { 
            that.updated = true;
            owner.renderUpdated ();
        }, this.parameters);
    this.tileCache.setMaxTiles (this.parameters.width, this.parameters.width);
    
    this.fullSize = this.parameters.width;
    
    this.overlap = this.parameters.overlap;
    this.tileSize = this.parameters.tileSize;
    
    this.minDivisions = 0;
    var fullZoom = Math.log (this.fullSize - this.overlap) / Math.LN2;
    var singleTile = Math.log (this.tileSize - this.overlap) / Math.LN2;
    this.maxDivisions = fullZoom - singleTile;
    
    this.generateFace = function (shape, topLeft, width, u, v, key, tx, ty, divisions) {
        var startIndex = shape.vertices.length;
        
        width *= 1 + this.overlap / this.tileSize;
        
        var p = topLeft;
        shape.vertices.push (p);
        p = pt3dMultAdd (v, width, topLeft);
        shape.vertices.push (p);
        p = pt3dMultAdd (u, width, p);
        shape.vertices.push (p);
        p = pt3dMultAdd (u, width, topLeft);
        shape.vertices.push (p);
        
        
        var textureImage = this.tileCache.getImage (tx, ty, -this.maxDivisions + divisions);
        
        {
            var qf = new Pre3d.QuadFace (startIndex, startIndex + 1, startIndex + 2, null);
            qf.textureInfo = new bigshot.VRTextureInfo (divisions, tx, ty, 0, textureImage);
            shape.quads.push (qf);
        }
        
        {
            var qf = new Pre3d.QuadFace (startIndex, startIndex + 2, startIndex + 3, null);
            qf.textureInfo = new bigshot.VRTextureInfo (divisions, tx, ty, 1, textureImage);
            shape.quads.push (qf);
        }        
    }
    
    this.isBehind = function (renderer, p) {
        var tp = renderer.transform.transformPoint (p);
        return tp.z > -0.1;
    }
    
    this.generateSubdivisionFace = function (renderer, shape, topLeft, width, u, v, key, divisions, tx, ty) {
        var bottomLeft = pt3dMultAdd (v, width, topLeft);
        var topRight = pt3dMultAdd (u, width, topLeft);
        var bottomRight = pt3dMultAdd (u, width, bottomLeft);
        
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
            var center = pt3dMultAdd ({x: u.x + v.x, y: u.y + v.y, z: u.z + v.z }, width / 2, topLeft);
            var midTop = pt3dMultAdd (u, width / 2, topLeft);
            var midLeft = pt3dMultAdd (v, width / 2, topLeft);
            this.generateSubdivisionFace (renderer, shape, topLeft, width / 2, u, v, key, divisions + 1, tx * 2, ty * 2);
            this.generateSubdivisionFace (renderer, shape, midTop, width / 2, u, v, key, divisions + 1, tx * 2 + 1, ty * 2);
            this.generateSubdivisionFace (renderer, shape, midLeft, width / 2, u, v, key, divisions + 1, tx * 2, ty * 2 + 1);
            this.generateSubdivisionFace (renderer, shape, center, width / 2, u, v, key, divisions + 1, tx * 2 + 1, ty * 2 + 1);
        } else {
            this.generateFace (shape, topLeft, width, u, v, key, tx, ty, divisions);
        }
    }
    
    this.isUpdated = function () {
        return this.updated;
    };
    
    this.render = function (renderer) {
        this.updated = false;
        this.tileCache.resetUsed ();
        var face = new Pre3d.Shape ();
        this.generateSubdivisionFace (renderer, face, this.topLeft, this.width, this.u, this.v, this.key, 0, 0, 0);
        Pre3d.ShapeUtils.rebuildMeta (face);
        renderer.bufferShape(face);
    }
    
    
    this.projectPointToCanvas = function (renderer, p) {
        var tp = renderer.transform.transformPoint (p);
        if (tp.z > -0.01) {
            tp.z = -0.01;
        }
        return renderer.projectPointToCanvas (tp);
    }
    
    this.screenDistance = function (renderer, p0, p1) {
        var p0t = this.projectPointToCanvas (renderer, p0);
        var p1t = this.projectPointToCanvas (renderer, p1);
        
        var r = {
            x : p0t.x - p1t.x,
            y : p0t.y - p1t.y
        };
        return r;
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

bigshot.VRPano = function (parameters) {
    var that = this;
    
    this.parameters = parameters;
    this.container = parameters.container;
    this.browser = new bigshot.Browser ();
    this.dragStart = null;
    
    this.state = {
        p : 0.0,
        y : 0.0
    };
    
    this.renderer = new Pre3d.Renderer (this.container);
    this.renderer.perform_z_sorting = false;
    this.renderer.draw_overdraw = false;
    this.renderer.fill_rgba = null;
    this.renderer.camera.focal_length = 3;
    
    function selectTexture (quad_face, quad_index, shape) {
        var ti = quad_face.textureInfo;
        var w = ti.textureImage.width;
        var h = ti.textureImage.height;
        var texinfo = new Pre3d.TextureInfo();
        texinfo.image = ti.textureImage;
        if (ti.face == 0) {
            texinfo.u0 = 0;
            texinfo.v0 = 0;
            texinfo.u1 = 0;
            texinfo.v1 = h;
            texinfo.u2 = w;
            texinfo.v2 = h;
        } else {
            texinfo.u0 = 0;
            texinfo.v0 = 0;
            texinfo.u1 = w;
            texinfo.v1 = h;
            texinfo.u2 = w;
            texinfo.v2 = 0;
        }
        
        that.renderer.texture = texinfo;
        return false;
    }
    this.renderer.quad_callback = selectTexture;
    
    this.getParameters = function () {
        return this.parameters;
    }
    
    this.beginRender = function () {
        this.renderer.transform.reset ();
        this.renderer.transform.rotateY (this.state.y);
        this.renderer.transform.rotateX (this.state.p);
        this.renderer.transform.translate (0, 0, -1.0);
    }
    
    this.endRender = function () {
        this.renderer.drawBuffer();
        this.renderer.emptyBuffer();
    }
    
    this.render = function () {
        this.beginRender ();
        
        for (var f in this.vrFaces) {
            this.vrFaces[f].render (this.renderer);
        }
        
        // White background.
        /*renderer.ctx.setFillColor(1, 1, 1, 1);
        renderer.drawBackground();
        */
        this.endRender ();
    }
    
    this.renderUpdated = function () {
        this.beginRender ();
        
        for (var f in this.vrFaces) {
            if (this.vrFaces[f].isUpdated ()) {
                this.vrFaces[f].render (this.renderer);
            }
        }
        
        // White background.
        /*renderer.ctx.setFillColor(1, 1, 1, 1);
        renderer.drawBackground();
        */
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
            var dx = e.clientX - this.dragStart.clientX;
            var dy = e.clientY - this.dragStart.clientY;
            this.state.y -= dx / 100.0;
            this.state.p -= dy / 100.0 ;
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

var bvr = null;

function vrpano () {
    bvr = new bigshot.VRPano ({
            container : document.getElementById ("canvas"),
            basePath : "../../temp/vr.bigshot",
            fileSystemType : "archive"
        });
    bvr.render ();
}

var frame = 0;

function redraw () {
    bvr.render ();
    //state.cube_rotate_x_rad = frame * 0.01;
    ++frame;
    if (frame < 100) {
    }
}

