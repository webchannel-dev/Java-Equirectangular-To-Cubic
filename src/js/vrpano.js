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

function VRTextureInfo (divisions, tx, ty, face, textureImage) {
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

function VRFace (key, topLeft, width, u, v) {
    this.key = key;
    this.topLeft = pt3dMult (topLeft, 10);
    this.width = width * 10;
    this.u = u;
    this.v = v;
    
    this.afs = new bigshot.ArchiveFileSystem ({
            basePath : "../../temp/vr.bigshot",
            suffix : ".jpg"
        });
    this.afs.setPrefix ("face_" + key + "/");
    
    this.tc = new bigshot.ImageTileCache (function () { 
        }, {
            fileSystem : this.afs,
            suffix : ".jpg",
            tileSize : 257,
            width : 2049,
            height : 2049
        });
    this.tc.setMaxTiles (10, 10);
    
    this.fullSize = 2049;
    
    this.overlap = 1;
    this.tileSize = 257;
    
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
        
        
        var textureImage = this.tc.getImage (tx, ty, -this.maxDivisions + divisions);
        
        {
            var qf = new Pre3d.QuadFace (startIndex, startIndex + 1, startIndex + 2, null);
            qf.textureInfo = new VRTextureInfo (divisions, tx, ty, 0, textureImage);
            shape.quads.push (qf);
        }
        
        {
            var qf = new Pre3d.QuadFace (startIndex, startIndex + 2, startIndex + 3, null);
            qf.textureInfo = new VRTextureInfo (divisions, tx, ty, 1, textureImage);
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
        
        var dmax = screenDistanceMax (renderer, topLeft, topRight).d;
        dmax = Math.max (screenDistanceMax (renderer, topRight, bottomRight).d, dmax);
        dmax = Math.max (screenDistanceMax (renderer, bottomRight, bottomLeft).d, dmax);
        dmax = Math.max (screenDistanceMax (renderer, bottomLeft, topLeft).d, dmax);
        
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
    
    this.render = function (renderer) {
        var face = new Pre3d.Shape ();
        this.generateSubdivisionFace (renderer, face, topLeft, width, u, v, this.key, 0, 0, 0);
        Pre3d.ShapeUtils.rebuildMeta (face);
        renderer.bufferShape(face);
    }
}

var drawer = null;

var state = {
    cube_rotate_y_rad: 0.0,
    cube_rotate_x_rad: 0.0,
    cube_x: 0,
    cube_y: 0
};

function vrpano () {
    var screen_canvas = document.getElementById('canvas');
    var renderer = new Pre3d.Renderer(screen_canvas);
    renderer.perform_z_sorting = false;
    
    var w = 257;
    var h = 257;
    
    function selectTexture(quad_face, quad_index, shape) {
        var ti = quad_face.textureInfo;
        
        var texinfo1 = new Pre3d.TextureInfo();
        texinfo1.image = null;
        texinfo1.u0 = 0;
        texinfo1.v0 = 0;
        texinfo1.u1 = 0;
        texinfo1.v1 = h;
        texinfo1.u2 = w;
        texinfo1.v2 = h;
        
        var texinfo2 = new Pre3d.TextureInfo();
        texinfo2.image = null;
        texinfo2.u0 = 0;
        texinfo2.v0 = 0;
        texinfo2.u1 = w;
        texinfo2.v1 = h;
        texinfo2.u2 = w;
        texinfo2.v2 = 0;
        
        var baseTi = ti.face == 0 ? texinfo1 : texinfo2;
        baseTi.image = ti.textureImage;
        renderer.texture = baseTi;
        return false;
    }
    
    renderer.quad_callback = selectTexture;
    
    // We don't want to fill, it will show at the edges (and waste cpu).
    renderer.fill_rgba = null;
    
    var vrFaces = new Array ();
    vrFaces[0] = new VRFace ("f", {x:-1, y:1, z:-1}, 2.0, {x:1, y:0, z:0}, {x:0, y:-1, z:0});
    vrFaces[1] = new VRFace ("b", {x:1, y:1, z:1}, 2.0, {x:-1, y:0, z:0}, {x:0, y:-1, z:0});
    vrFaces[2] = new VRFace ("l", {x:-1, y:1, z:1}, 2.0, {x:0, y:0, z:-1}, {x:0, y:-1, z:0});
    vrFaces[3] = new VRFace ("r", {x:1, y:1, z:-1}, 2.0, {x:0, y:0, z:1}, {x:0, y:-1, z:0});
    vrFaces[4] = new VRFace ("u", {x:-1, y:1, z:1}, 2.0, {x:1, y:0, z:0}, {x:0, y:0, z:-1});
    vrFaces[5] = new VRFace ("d", {x:-1, y:-1, z:-1}, 2.0, {x:1, y:0, z:0}, {x:0, y:0, z:1});
    
    function draw() {
        renderer.transform.reset();
        renderer.transform.rotateX(state.cube_rotate_x_rad);
        renderer.transform.rotateY(state.cube_rotate_y_rad);
        renderer.transform.translate(state.cube_x, state.cube_y, -1.0);
        
        
        for (var f in vrFaces) {
            vrFaces[f].render (renderer);
        }
        
        // White background.
        renderer.ctx.setFillColor(1, 1, 1, 1);
        renderer.drawBackground();
        
        renderer.drawBuffer();
        renderer.emptyBuffer();
    }
    
    renderer.camera.focal_length = 2.0;
    
    
    drawer = draw;
    drawer ();
}

var frame = 0;

function redraw () {
    drawer ();
    state.cube_rotate_y_rad = frame * 0.02;
    ++frame;
    if (frame < 800) {
        setTimeout (redraw, 50);
    }
}

function projectPointToCanvas (renderer, p) {
    var tp = renderer.transform.transformPoint (p);
    if (tp.z > -0.01) {
        tp.z = -0.01;
    }
    return renderer.projectPointToCanvas (tp);
}

function screenDistance (renderer, p0, p1) {
    var p0t = projectPointToCanvas (renderer, p0);
    var p1t = projectPointToCanvas (renderer, p1);
    
    var r = {
        x : p0t.x - p1t.x,
        y : p0t.y - p1t.y
    };
    return r;
}

function screenDistanceHyp (renderer, p0, p1) {
    var r = screenDistance (renderer, p0, p1);
    r.d = Math.sqrt (r.x * r.x + r.y * r.y);
    return r;
}

function screenDistanceMax (renderer, p0, p1) {
    var r = screenDistance (renderer, p0, p1);
    var ax = Math.abs (r.x);
    var ay = Math.abs (r.y);
    r.d = ax > ay ? ax : ay;
    return r;
}
