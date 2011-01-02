/*
 * Copyright 2010 Leo Sutic <leo.sutic@gmail.com>
 *  
 * Licensed under the Apache License, Version 2.0 (the "License"); 
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at 
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0 
 *     
 * Unless required by applicable law or agreed to in writing, software 
 * distributed under the License is distributed on an "AS IS" BASIS, 
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
 * See the License for the specific language governing permissions and 
 * limitations under the License. 
 */
/**
 * Creates a new cache instance.
 *
 * @class Tile cache for a {@link bigshot.VRFace}.
 * @constructor
 */
bigshot.TileTextureCache = function (onLoaded, parameters, _webGl) {
    this.webGl = _webGl;
    
    /**
     * Reduced-resolution preview of the full image.
     * Loaded from the "poster" image created by 
     * MakeImagePyramid
     *
     * @private
     * @type HTMLImageElement
     */
    this.fullImage = document.createElement ("img");
    this.fullImage.src = parameters.fileSystem.getFilename ("poster" + parameters.suffix);
    
    /**
     * Maximum number of tiles in the cache.
     * @private
     * @type int
     */
    this.maxCacheSize = 512;
    this.cachedTextures = {};
    this.requestedImages = {};
    this.lastOnLoadFiredAt = 0;
    this.imageRequests = 0;
    this.partialImageSize = parameters.tileSize / 8;
    this.lruMap = new bigshot.LRUMap ();
    this.onLoaded = onLoaded;
    this.browser = new bigshot.Browser ();
    
    this.getPartialTexture = function (tileX, tileY, zoomLevel) {
        if (this.fullImage.complete) {
            var canvas = document.createElement ("canvas");
            if (!canvas["width"]) {
                return null;
            }
            canvas.width = this.partialImageSize;
            canvas.height = this.partialImageSize;
            var ctx = canvas.getContext('2d'); 
            
            var posterScale = parameters.posterSize / Math.max (parameters.width, parameters.height);
            
            var posterWidth = Math.floor (posterScale * parameters.width);
            var posterHeight = Math.floor (posterScale * parameters.height);
            
            var tileSizeAtZoom = posterScale * (parameters.tileSize - parameters.overlap) / Math.pow (2, zoomLevel);    
            var sx = Math.floor (tileSizeAtZoom * tileX);
            var sy = Math.floor (tileSizeAtZoom * tileY);
            var sw = Math.floor (tileSizeAtZoom);
            var sh = Math.floor (tileSizeAtZoom);
            var dw = this.partialImageSize + 2;
            var dh = this.partialImageSize + 2;
            
            if (sx + sw > posterWidth) {
                sw = posterWidth - sx;
                dw = this.partialImageSize * (sw / Math.floor (tileSizeAtZoom));
            }
            if (sy + sh > posterHeight) {
                sh = posterHeight - sy;
                dh = this.partialImageSize * (sh / Math.floor (tileSizeAtZoom));
            }
            
            ctx.drawImage (this.fullImage, sx, sy, sw, sh, -1, -1, dw, dh);
            
            return this.webGl.createImageTextureFromImage (canvas);
        } else {
            return null;
        }
    };
    
    
    this.getTexture = function (tileX, tileY, zoomLevel) {
        var key = this.getImageKey (tileX, tileY, zoomLevel);
        this.lruMap.access (key);
        
        if (this.cachedTextures[key]) {
            return this.cachedTextures[key];
        } else {
            this.requestImage (tileX, tileY, zoomLevel);
            var partial = this.getPartialTexture (tileX, tileY, zoomLevel);
            if (partial) {
                this.cachedTextures[key] = partial;
            }
            return partial;
        }
    };
    
    this.requestImage = function (tileX, tileY, zoomLevel) {
        var key = this.getImageKey (tileX, tileY, zoomLevel);
        if (!this.requestedImages[key]) {
            this.imageRequests++;
            var tile = document.createElement ("img");
            var that = this;
            this.browser.registerListener (tile, "load", function () {                        
                    if (that.cachedTextures[key]) {
                        that.webGl.gl.deleteTexture (that.cachedTextures[key]);
                    }
                    that.cachedTextures[key] = that.webGl.createImageTextureFromImage (tile);
                    delete that.requestedImages[key];
                    that.imageRequests--;
                    var now = new Date();
                    if (that.imageRequests == 0 || now.getTime () > (that.lastOnLoadFiredAt + 50)) {
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
                this.webGl.deleteTexture (this.cachedTextures[leastUsed]);
                delete this.cachedTextures[leastUsed];
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

/**
 * Creates a new VR cube face.
 *
 * @class VRFace a VR cube face. The {@link bigshot.VRPanorama} instance holds
 * six of these.
 */
bigshot.VRFace = function (owner, key, topLeft_, width_, u, v) {
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
    this.maxDivisions = Math.floor (fullZoom - singleTile);
    
    this.generateFace = function (scene, topLeft, width, u, v, key, tx, ty, divisions) {
        width *= this.tileSize / (this.tileSize - this.overlap);
        var texture = this.tileCache.getTexture (tx, ty, -this.maxDivisions + divisions);
        scene.addQuad (new bigshot.WebGLTexturedQuad (
                topLeft,
                this.pt3dMult (u, width),
                this.pt3dMult (v, width),
                texture
            )
        );
    }
    
    this.isBehind = function (p) {
        var result = this.owner.webGl.transformToWorld ([p.x, p.y, p.z]);
        return result.e(3) > 0;
    }
    
    this.generateSubdivisionFace = function (scene, topLeft, width, u, v, key, divisions, tx, ty) {
        var bottomLeft = this.pt3dMultAdd (v, width, topLeft);
        var topRight = this.pt3dMultAdd (u, width, topLeft);
        var bottomRight = this.pt3dMultAdd (u, width, bottomLeft);
        
        var numBehind = 0;
        if (this.isBehind (topLeft)) {
            numBehind++;
        }
        if (this.isBehind (bottomLeft)) {
            numBehind++;
        }
        if (this.isBehind (topRight)) {
            numBehind++;
        }
        if (this.isBehind (bottomRight)) {
            numBehind++;
        }
        
        if (numBehind == 4) {
            return;
        }
        var straddles = numBehind > 0;
        
        var dmax = this.screenDistanceMax (topLeft, topRight).d;
        dmax = Math.max (this.screenDistanceMax (topRight, bottomRight).d, dmax);
        dmax = Math.max (this.screenDistanceMax (bottomRight, bottomLeft).d, dmax);
        dmax = Math.max (this.screenDistanceMax (bottomLeft, topLeft).d, dmax);
        
        if (divisions < this.minDivisions || ((dmax > (this.tileSize - this.overlap) || straddles) && divisions < this.maxDivisions)) {
            var center = this.pt3dMultAdd ({x: u.x + v.x, y: u.y + v.y, z: u.z + v.z }, width / 2, topLeft);
            var midTop = this.pt3dMultAdd (u, width / 2, topLeft);
            var midLeft = this.pt3dMultAdd (v, width / 2, topLeft);
            this.generateSubdivisionFace (scene, topLeft, width / 2, u, v, key, divisions + 1, tx * 2, ty * 2);
            this.generateSubdivisionFace (scene, midTop, width / 2, u, v, key, divisions + 1, tx * 2 + 1, ty * 2);
            this.generateSubdivisionFace (scene, midLeft, width / 2, u, v, key, divisions + 1, tx * 2, ty * 2 + 1);
            this.generateSubdivisionFace (scene, center, width / 2, u, v, key, divisions + 1, tx * 2 + 1, ty * 2 + 1);
        } else {
            this.generateFace (scene, topLeft, width, u, v, key, tx, ty, divisions);
        }
    }
    
    this.isUpdated = function () {
        return this.updated;
    };
    
    this.render = function (scene) {
        this.updated = false;
        this.generateSubdivisionFace (scene, this.topLeft, this.width, this.u, this.v, this.key, 0, 0, 0);
        this.tileCache.purgeCache ();
    }
    
    
    this.projectPointToCanvas = function (p) {
        return this.owner.webGl.transformToScreen ([p.x, p.y, p.z]);
    }
    
    this.screenDistance = function (p0, p1) {
        var p0t = this.projectPointToCanvas (p0);
        var p1t = this.projectPointToCanvas (p1);
        
        if (p0t == null || p1t == null) {
            return null;
        }
        
        var r = {
            x : p0t.x - p1t.x,
            y : p0t.y - p1t.y
        };
        return r;
    }
    
    this.screenDistanceHyp = function (p0, p1) {
        var r = this.screenDistance (p0, p1);
        if (r == null) {
            return {x: 0, y:0, d: 100000};
        }
        
        r.d = Math.sqrt (r.x * r.x + r.y * r.y);
        return r;
    }
    
    this.screenDistanceMax = function (p0, p1) {
        var r = this.screenDistance (p0, p1);
        
        if (r == null) {
            return {x: 0, y:0, d: 100000};
        }
        
        var ax = Math.abs (r.x);
        var ay = Math.abs (r.y);
        r.d = ax > ay ? ax : ay;
        return r;
    }
}

/**
 * Creates a new VR panorama in a canvas.
 * 
 * @class VRPanorama A cube-map VR panorama.
 *
 * @param {bigshot.ImageParameters} parameters the image parameters.
 * @example
 * var bvr = new bigshot.VRPanorama (
 *     new bigshot.ImageParameters ({
 *         basePath : "/bigshot.php?file=myvr.bigshot",
 *         fileSystemType : "archive",
 *         container : document.getElementById ("bigshot_canvas")
 *         }));
 * @see bigshot.ImageParameters
 */
bigshot.VRPanorama = function (parameters) {
    var that = this;
    
    this.parameters = parameters;
    this.container = parameters.container;
    this.browser = new bigshot.Browser ();
    this.dragStart = null;
    
    /**
     * Current camera state.
     * @private
     */
    this.state = {
        /**
         * Pitch in degrees.
         */
        p : 0.0,
        
        /**
         * Yaw in degrees.
         */
        y : 0.0,
        
        /**
         * Field of view (horizontal) in degrees.
         */
        fov : 60
    };
    
    /**
     * WebGL wrapper.
     */
    this.webGl = new bigshot.WebGL (this.container);
    this.webGl.initShaders();
    this.webGl.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.webGl.gl.blendFunc (this.webGl.gl.ONE, this.webGl.gl.ZERO);
    this.webGl.gl.enable (this.webGl.gl.BLEND);
    this.webGl.gl.disable(this.webGl.gl.DEPTH_TEST);
    
    
    this.webGl.gl.clearDepth(1.0);
    
    this.getParameters = function () {
        return this.parameters;
    }
    
    this.setFov = function (fov) {
        fov = Math.min (90, fov);
        fov = Math.max (2, fov);
        this.state.fov = fov;
    }
    
    this.getFov = function () {
        return this.state.fov;
    }
    
    this.setPitch = function (p) {
        p = Math.min (90, p);
        p = Math.max (-90, p);
        this.state.p = p;
    }
    
    this.setYaw = function (y) {
        y %= 360;
        if (y < 0) {
            y += 360;
        }
        this.state.y = y;
    }
    
    this.getYaw = function () {
        return this.state.y;
    }
    
    this.getPitch = function () {
        return this.state.p;
    }
    
    /**
     * Sets up transformation matrices etc.
     */
    this.beginRender = function () {
        this.webGl.gl.viewport (0, 0, this.webGl.gl.viewportWidth, this.webGl.gl.viewportHeight);
        
        this.webGl.perspective (this.state.fov, this.webGl.gl.viewportWidth / this.webGl.gl.viewportHeight, 0.1, 100.0);
        this.webGl.mvReset ();
        
        this.webGl.mvTranslate ([0.0, 0.0, 0.0]);
        
        this.webGl.mvRotate (this.state.p, [1, 0, 0]);
        this.webGl.mvRotate (this.state.y, [0, 1, 0]);
    }
    
    /**
     * Performs per-render cleanup.
     */
    this.endRender = function () {
    }
    
    /**
     * Renders the VR cube.
     */
    this.render = function () {
        this.beginRender ();
        
        var scene = new bigshot.WebGLTexturedQuadScene (this.webGl);
        
        for (var f in this.vrFaces) {
            this.vrFaces[f].render (scene);
        }
        
        scene.render (this.webGl);
        
        this.endRender ();
    }
    
    /**
     * Render updated faces. Called as tiles are loaded from the server.
     */
    this.renderUpdated = function () {
        this.beginRender ();
        
        var scene = new bigshot.WebGLTexturedQuadScene (this.webGl);
        
        for (var f in this.vrFaces) {
            if (this.vrFaces[f].isUpdated ()) {
                this.vrFaces[f].render (scene);
            }
        }
        
        scene.render (this.webGl);
        
        this.endRender ();
    };
    
    this.DRAG_GRAB = "grab";
    this.DRAG_PAN = "pan";
    
    this.dragMode = this.DRAG_GRAB;
    
    this.setDragMode = function (mode) {
        this.dragMode = mode;
    }
    
    this.dragMouseDown = function (e) {
        this.dragStart = e;
    }
    
    this.dragMouseUp = function (e) {
        this.dragStart = null;
        this.smoothRotate ();
    }
    
    this.dragMouseMove = function (e) {
        if (this.dragStart != null) {
            if (this.dragMode == this.DRAG_GRAB) {
                this.smoothRotate ();
                var scale = this.state.fov / this.container.width;
                var dx = e.clientX - this.dragStart.clientX;
                var dy = e.clientY - this.dragStart.clientY;
                this.state.y -= dx * scale;
                this.state.p -= dy * scale;
                this.render ();
                this.dragStart = e;
            } else {
                var scale = 0.2 * this.state.fov / this.container.width;
                var dx = e.clientX - this.dragStart.clientX;
                var dy = e.clientY - this.dragStart.clientY;
                this.smoothRotate (
                    function () {
                        return dy * scale;
                    }, function () {
                        return dx * scale;
                    });
            }
        }
    }
    
    this.ease = function (current, target, speed) {
        var easingFrom = speed * 10;
        var snapFrom = speed / 20;
        var ignoreFrom = speed / 1000;
        
        var distance = current - target;
        if (distance > easingFrom) {
            distance = -speed;
        } else if (distance < -easingFrom) {
            distance = speed;
        } else if (Math.abs (distance) < snapFrom) {
            distance = -distance;
        } else if (Math.abs (distance) < ignoreFrom) {
            distance = 0;
        } else {
            distance = -distance * speed * (Math.abs (distance) / easingFrom);
        }
        return distance;
    }
    
    this.idleCounter = 0;
    this.maxIdleCounter = -1;
    
    this.resetIdle = function () {
        this.idleCounter = 0;
    }
    
    this.idleTick = function () {
        if (this.maxIdleCounter < 0) {
            return;
        }
        ++this.idleCounter;
        if (this.idleCounter == this.maxIdleCounter) {
            this.autoRotate ();
        }
        var that = this;
        setTimeout (function () {
                that.idleTick ();
            }, 1000);
    }
    
    this.autoRotateWhenIdle = function (delay) {
        this.maxIdleCounter = delay;
        this.idleCounter = 0;
        if (delay < 0) {
            return;
        } else if (this.maxIdleCounter > 0) {            
            var that = this;
            setTimeout (function () {
                    that.idleTick ();
                }, 1000);
        }
    }
    
    this.autoRotate = function () {
        var that = this;
        var scale = this.state.fov / this.container.width;
        
        var speed = scale;
        this.smoothRotate (
            function () {
                return that.ease (that.getPitch (), 0.0, speed);
            }, function () {
                return speed;
            }, function () {
                return that.ease (that.getFov (), 60.0, 0.1);
            });
    }
    
    /**
     * Integer acting as a "permit". When the smoothRotate function
     * is called, the current value is incremented and saved. If the number changes
     * that particular call to smoothRotate stops. This way we avoid
     * having multiple smoothRotate rotations going in parallel.
     */
    this.smoothrotatePermit = 0;
    
    /**
     * Smoothly rotates the camera. If any of the dp or dy functions are null, stops
     * any smooth rotation.
     *
     * @param {function()} dp function giving the pitch increment for the next frame
     * @param {function()} dy function giving the yaw increment for the next frame
     * @param {function()} [df] function giving the field of view (degrees) increment for the next frame
     */
    this.smoothRotate = function (dp, dy, df) {
        ++this.smoothrotatePermit;
        var savedPermit = this.smoothrotatePermit;
        if (!dp || !dy) {            
            return;
        }
        
        var that = this;
        var stepper = function () {
            if (that.smoothrotatePermit == savedPermit) {
                that.setYaw (that.getYaw () + dy());
                that.setPitch (that.getPitch () + dp());
                if (df) {
                    that.setFov (that.getFov () + df());
                }
                that.render ();
                window.setTimeout (stepper, 5);
            }
        };
        stepper ();
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
    
    /**
    * Translates mouse wheel events.
    * @private
    */
    this.mouseWheel = function (event){
        var delta = 0;
        if (!event) /* For IE. */
            event = window.event;
        if (event.wheelDelta) { /* IE/Opera. */
            delta = event.wheelDelta / 120;
            /*
                * In Opera 9, delta differs in sign as compared to IE.
                */
            if (window.opera)
                delta = -delta;
        } else if (event.detail) { /* Mozilla case. */
            /*
             * In Mozilla, sign of delta is different than in IE.
             * Also, delta is multiple of 3.
             */
            delta = -event.detail;
        }
        
        /*
         * If delta is nonzero, handle it.
         * Basically, delta is now positive if wheel was scrolled up,
         * and negative, if wheel was scrolled down.
         */
        if (delta) {
            this.mouseWheelHandler (delta);
        }
        
        /*
         * Prevent default actions caused by mouse wheel.
         * That might be ugly, but we handle scrolls somehow
         * anyway, so don't bother here..
         */
        if (event.preventDefault) {
            event.preventDefault ();
        }
        event.returnValue = false;
    };
    
    this.mouseWheelHandler = function (delta) {
        var that = this;
        var target = null;
        if (delta > 0) {
            if (this.getFov () > 5) {
                target = this.getFov () * 0.9;
            }
        }
        if (delta < 0) {
            if (this.getFov () < 90) {
                target = this.getFov () / 0.9;
            }
        }
        if (target != null) {
            this.smoothRotate (
                function () {
                    return 0;
                }, function () {
                    return 0;
                }, function () {
                    return target - that.getFov ();
                });        
        }
    };
    
    /**
     * Flag that indicates whether we are in full screen mode.
     *
     * @private
     */
    this.isFullScreen = false;
    
    /**
    * Maximizes the image to cover the browser viewport.
    * The container div is removed from its parent node upon entering 
    * full screen mode. When leaving full screen mode, the container
    * is appended to its old parent node. To avoid rearranging the
    * nodes, wrap the container in an extra div.
    *
    * <p>For unknown reasons (probably security), browsers will
    * not let you open a window that covers the entire screen.
    * Even when specifying "fullscreen=yes", all you get is a window
    * that has a title bar and only covers the desktop (not any task
    * bars or the like). For now, this is the best that I can do,
    * but should the situation change I'll update this to be
    * full-screen<i>-ier</i>.
    * @public
    */
    this.fullScreen = function (onClose) {
        if (this.isFullScreen) {
            return;
        }
        this.isFullScreen = true;
        
        var div = document.createElement ("div");
        div.style.position = "fixed";
        div.style.top = "0px";
        div.style.left = "0px";
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.zIndex = "9998";
        
        var savedParent = this.container.parentNode;
        var savedSize = {
            width : this.container.style.width,
            height : this.container.style.height
        };
        this.container.style.width = "100%";
        this.container.style.height = "100%";
        savedParent.removeChild (this.container);
        div.appendChild (this.container);
        
        var message = document.createElement ("div");
        message.style.position = "absolute";
        message.style.fontSize = "16pt";
        message.style.top = "128px";
        message.style.width = "100%";
        message.style.color = "white";
        message.style.padding = "16px";
        message.style.zIndex = "9999";
        message.style.textAlign = "center";
        message.style.opacity = "0.75";
        message.innerHTML = "<span style='border-radius: 16px; -moz-border-radius: 16px; padding: 16px; padding-left: 32px; padding-right: 32px; background:black'>Press Esc to exit full screen mode.</span>";
        
        div.appendChild (message);
        document.body.appendChild (div);
        
        var that = this;
        this.exitFullScreenHandler = function () {
            if (message.parentNode) {
                try {
                    div.removeChild (message);
                } catch (x) {
                }
            }
            that.browser.unregisterListener (document, "keydown", escHandler);
            if (!that.sizeContainer) {
                that.container.style.width = savedSize.width;
                that.container.style.height = savedSize.height;
            }
            savedParent.appendChild (that.container);
            document.body.removeChild (div);
            that.isFullScreen = false;
            that.onresize ();
            if (onClose) {
                onClose ();
            }
        };
        
        var escHandler = function (e) {
            if (e.keyCode == 27) {
                that.exitFullScreenHandler ();
            }
        };
        this.browser.registerListener (document, "keydown", escHandler, false);
        
        setTimeout (function () {
                var opacity = 0.75;
                var iter = function () {
                    opacity -= 0.02;
                    if (message.parentNode) {
                        if (opacity <= 0) {
                            try {
                                div.removeChild (message);
                            } catch (x) {}
                        } else {
                            message.style.opacity = opacity;
                            setTimeout (iter, 20);
                        }
                    }
                };
                setTimeout (iter, 20);
            }, 3500);
        
        this.onresize ();
    };
    
    /**
     * Right-sizes the canvas container.
     */
    this.onresize = function () {
        if (!this.isFullScreen) {
            if (this.sizeContainer) {
                var s = this.browser.getElementSize (this.sizeContainer);
                this.container.width = s.w;
                this.container.height = s.h;
            }
        } else {
            var s = this.browser.getElementSize (this.container);
            this.container.width = s.w;
            this.container.height = s.h;
        }
        this.webGl.onresize ();
        this.renderAsap ();            
    };
    
    /**
     * Posts a render() call via a timeout. Use when the render call must be
     * done as soon as possible, but can't be done in the current call context.
     */
    this.renderAsap = function () {
        var that = this;
        setTimeout (function () {
                that.render ();
            }, 1);
    }
    
    /**
     * An element to use as reference when resizing the canvas element.
     * If non-null, any onresize() calls will result in the canvas being
     * resized to the size of this element.
     */
    this.sizeContainer = null;
    
    /**
     * Automatically resizes the canvas element to the size of the 
     * given element on resize.
     *
     * @param {HTMLElement} sizeContainer the element to use. Set to {@code null}
     * to disable.
     */
    this.autoResizeContainer = function (sizeContainer) {
        this.sizeContainer = sizeContainer;
    }
    
    this.vrFaces = new Array ();
    this.vrFaces[0] = new bigshot.VRFace (this, "f", {x:-1, y:1, z:-1}, 2.0, {x:1, y:0, z:0}, {x:0, y:-1, z:0});
    this.vrFaces[1] = new bigshot.VRFace (this, "b", {x:1, y:1, z:1}, 2.0, {x:-1, y:0, z:0}, {x:0, y:-1, z:0});
    this.vrFaces[2] = new bigshot.VRFace (this, "l", {x:-1, y:1, z:1}, 2.0, {x:0, y:0, z:-1}, {x:0, y:-1, z:0});
    this.vrFaces[3] = new bigshot.VRFace (this, "r", {x:1, y:1, z:-1}, 2.0, {x:0, y:0, z:1}, {x:0, y:-1, z:0});
    this.vrFaces[4] = new bigshot.VRFace (this, "u", {x:-1, y:1, z:1}, 2.0, {x:1, y:0, z:0}, {x:0, y:0, z:-1});
    this.vrFaces[5] = new bigshot.VRFace (this, "d", {x:-1, y:-1, z:-1}, 2.0, {x:1, y:0, z:0}, {x:0, y:0, z:1});
    
    this.browser.registerListener (this.container, "mousedown", function (e) {
            that.resetIdle ();
            that.dragMouseDown (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (this.container, "mouseup", function (e) {
            that.resetIdle ();
            that.dragMouseUp (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (this.container, 'mousemove', function (e) {
            that.resetIdle ();
            that.dragMouseMove (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, "DOMMouseScroll", function (e) {
            that.resetIdle ();
            that.mouseWheel (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, "mousewheel", function (e) {
            that.resetIdle ();
            that.mouseWheel (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (window, 'resize', function (e) {
            that.onresize ();
        }, false);
}


