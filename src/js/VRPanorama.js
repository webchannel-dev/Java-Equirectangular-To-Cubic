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
 * Creates a new VR panorama in a canvas. <b>Requires WebGL support.</b>
 * (Note: See {@link bigshot.VRPanorama#dispose} for important information.)
 * 
 * <h3 id="creating-a-cubemap">Creating a Cube Map</h3>
 *
 * <p>The panorama consists of six image pyramids, one for each face of the VR cube.
 * Due to restrictions in WebGL, each texture tile must have a power-of-two (POT) size -
 * that is, 2, 4, ..., 128, 256, etc. Furthermore, due to the way the faces are tesselated
 * the largest image must consist of POT x POT tiles. The final restriction is that the 
 * tiles must overlap for good seamless results.
 *
 * <p>The MakeImagePyramid has some sensible defaults built-in. If you just use the
 * command line:
 *
 * <code><pre>
 * java -jar bigshot.jar input.jpg temp/dzi \
 *     --preset dzi-cubemap \ 
 *     --format folders
 * </pre></code>
 * 
 * <p>You will get 2034 pixels per face, and a tile size of 256 pixels with 2 pixels
 * overlap. If you don't like that, you can use the <code>overlap</code>, <code>face-size</code>
 * and <code>tile-size</code> parameters. Let's take these one by one:
 *
 * <ul>
 * <li><p><code>overlap</code>: Overlap defines how much tiles should overlap, just to avoid
 * seams in the rendered results caused by finite numeric precision. The default is <b>2</b>, which
 * I've found works great for me.</p></li>
 * <li><p><code>tile-size</code>: First you need to decide what POT size the output should be.
 * Then subtract the overlap value. For example, if you set overlap to 1, <code>tile-size</code>
 * could be 127, 255, 511, or any 2<sup>n</sup>-1 value.</p></li>
 * <li><p><code>face-size</code>: Finally, we decide on a size for the full cube face. This should be
 * tile-size * 2<sup>n</sup>. Let's say we set n=3, which makes each face 8x8 tiles at the most zoomed-in
 * level. For a tile-size of 255, then, face-size is 255*2<sup>3</sup> = 255*8 = <b>2040</b>.</p></li>
 * </ul>
 * 
 * <p>A command line for the hypothetical scenario above would be:
 * 
 * <code><pre>
 * java -jar bigshot.jar input.jpg temp/dzi \
 *     --preset dzi-cubemap \ 
 *     --overlap 1 \
 *     --tile-size 255 \
 *     --face-size 2040 \
 *     --format folders
 * </pre></code>
 *
 * <p>If your tile size numbers don't add up, you'll get a warning like:
 *
 * <code><pre>
 * WARNING: Resulting image tile size (tile-size + overlap) is not a power of two: 255
 * </pre></code>
 *
 * <p>If your face size don't add up, you'll get another warning:
 *
 * <code><pre>
 * WARNING: face-size is not an even multiple of tile-size: 2040 % 254 != 0
 * </pre></code>
 *
 * <h3 id="integration-with-saladoplayer">Integration With SaladoPlayer</h3>
 *
 * <p><a href="http://panozona.com/wiki/">SaladoPlayer</a> is a cool
 * Flash-based VR panorama viewer that can display Deep Zoom Images.
 * It can be used as a fallback for Bigshot for browsers that don't
 * support WebGL.
 *
 * <p>Since Bigshot can use a Deep Zoom Image (DZI) via a {@link bigshot.DeepZoomImageFileSystem}
 * adapter, the common file format is DZI. There are two cases: The first is
 * when the DZI is served up as a folder structure, the second when
 * we pack the DZI into a Bigshot archive and serve it using bigshot.php.
 *
 * <h4>Serving DZI as Folders</h4>
 *
 * <p>This is an easy one. First, we generate the required DZIs:
 *
 * <code><pre>
 * java -jar bigshot.jar input.jpg temp/dzi \
 *     --preset dzi-cubemap \ 
 *     --format folders
 * </pre></code>
 * 
 * <p>We'll assume that we have the six DZI folders in "temp/dzi", and that
 * they have "face_" as a common prefix (which is what Bigshot's MakeImagePyramid
 * outputs). So we have, for example, "temp/dzi/face_f.xml" and the tiles for face_f
 * in "temp/dzi/face_f/". Set up Bigshot like this:
 *
 * <code><pre>
 * bvr = new bigshot.VRPanorama (
 *     new bigshot.VRPanoramaParameters ({
 *             container : document.getElementById ("canvas"),
 *             basePath : "temp/dzi",
 *             fileSystemType : "dzi"
 *         }));
 * </pre></code>
 * 
 * <p>SaladoPlayer uses an XML config file, which in this case will
 * look something like this:
 * 
 * <code><pre>
 * &lt;SaladoPlayer>
 *     &lt;global debug="false" firstPanorama="pano"/>
 *     &lt;panoramas>
 *         &lt;panorama id="pano" path="temp/dzi/face_f.xml"/>
 *     &lt;/panoramas>
 * &lt;/SaladoPlayer>
 * </pre></code>
 *
 * <h4>Serving DZI as Archive</h4>
 *
 * <p>This one is a bit more difficult. First we create a DZI as a bigshot archive:
 *
 * <code><pre>
 * java -jar bigshot.jar input.jpg temp/dzi.bigshot \
 *     --preset dzi-cubemap \ 
 *     --format archive
 * </pre></code>
 *
 * <p>We'll assume that we have our Bigshot archive at
 * "temp/dzi.bigshot". For this we will use the "entry" parameter of bigshot.php
 * to serve up the right files:
 *
 * <code><pre>
 * bvr = new bigshot.VRPanorama (
 *     new bigshot.VRPanoramaParameters ({
 *             container : document.getElementById ("canvas"),
 *             basePath : "/bigshot.php?file=temp/dzi.bigshot&entry=",
 *             fileSystemType : "dzi"
 *         }));
 * </pre></code>
 * 
 * <p>SaladoPlayer uses an XML config file, which in this case will
 * look something like this:
 * 
 * <code><pre>
 * &lt;SaladoPlayer>
 *     &lt;global debug="false" firstPanorama="pano"/>
 *     &lt;panoramas>
 *         &lt;panorama id="pano" path="/bigshot.php?file=dzi.bigshot&amp;amp;entry=face_f.xml"/>
 *     &lt;/panoramas>
 * &lt;/SaladoPlayer>
 * </pre></code>
 *
 * <h3>Usage example:</h3>
 * @example
 * var bvr = new bigshot.VRPanorama (
 *     new bigshot.VRPanoramaParameters ({
 *             basePath : "/bigshot.php?file=myvr.bigshot",
 *             fileSystemType : "archive",
 *             container : document.getElementById ("bigshot_canvas")
 *         }));
 * @class A cube-map VR panorama.
 *
 * @param {bigshot.VRPanoramaParameters} parameters the panorama parameters.
 *
 * @see bigshot.VRPanoramaParameters
 */
bigshot.VRPanorama = function (parameters) {
    var that = this;
    
    this.parameters = parameters;
    this.maxTextureMagnification = parameters.maxTextureMagnification;
    this.container = parameters.container;
    this.browser = new bigshot.Browser ();
    this.dragStart = null;
    this.dragDistance = 0;
    this.hotspots = [];
    
    this.transformOffsets = {
        yaw : parameters.yawOffset,
        pitch : parameters.pitchOffset,
        roll : parameters.rollOffset
    };
    
    /**
     * Current camera state.
     * @private
     */
    this.state = {
        /**
         * Pitch in degrees.
         * @private
         */
        p : 0.0,
        
        /**
         * Yaw in degrees.
         * @private
         */
        y : 0.0,
        
        /**
         * Field of view (vertical) in degrees.
         * @private
         */
        fov : 45,
        
        tx : 0.0,
        
        ty : 0.0,
        
        tz : 0.0
    };
    
    /**
     * Renderer wrapper.
     * @private
     * @type bigshot.VRRenderer
     */
    this.renderer = null;
    if (this.parameters.renderer) {
        if (this.parameters.renderer == "css") {
            this.renderer = new bigshot.CSS3DVRRenderer (this.container);
        } else if (this.parameters.renderer == "webgl") {
            this.renderer = new bigshot.WebGLVRRenderer (this.container)
        } else {
            throw new Error ("Unknown renderer: " + this.parameters.renderer);
        }
    } else {
        this.renderer = 
            bigshot.webglutil.isWebGLSupported () ? 
        new bigshot.WebGLVRRenderer (this.container)
        :
        new bigshot.CSS3DVRRenderer (this.container);
    }
    
    /**
     * Adds a hotstpot.
     *
     * @param {bigshot.VRHotspot} hs the hotspot to add
     */
    this.addHotspot = function (hs) {
        this.hotspots.push (hs);
    }
    
    /**
     * Returns the {@link bigshot.VRPanoramaParameters} object used by this instance.
     *
     * @type bigshot.VRPanoramaParameters
     */
    this.getParameters = function () {
        return this.parameters;
    }
    
    this.setTranslation = function (x, y, z) {
        this.state.tx = x;
        this.state.ty = y;
        this.state.tz = z;
    }
    
    this.getTranslation = function () {
        return {
            x : this.state.tx,
            y : this.state.ty,
            z : this.state.tz
        };
    }
    
    /**
     * Sets the field of view.
     *
     * @param {number} fov the vertical field of view, in degrees
     */
    this.setFov = function (fov) {
        fov = Math.min (this.parameters.maxFov, fov);
        fov = Math.max (this.parameters.minFov, fov);
        this.state.fov = fov;
    }
    
    /**
     * Gets the field of view.
     *
     * @return {number} the vertical field of view, in degrees
     */
    this.getFov = function () {
        return this.state.fov;
    }
    
    this.snapPitch = function (p) {
        p = Math.min (this.parameters.maxPitch, p);
        p = Math.max (this.parameters.minPitch, p);
        return p;
    }
    
    /**
     * Sets the current camera pitch.
     *
     * @param {number} p the pitch, in degrees
     */
    this.setPitch = function (p) {
        this.state.p = this.snapPitch (p);
    }
    
    /**
     * Subtraction mod 360, sort of...
     * @returns the angular distance with smallest magnitude to add to p0 to get to p1 % 360
     */
    this.circleDistance = function (p0, p1) {
        if (p1 > p0) {
            // p1 is somewhere clockwise to p0
            var d1 = (p1 - p0); // move clockwise
            var d2 = ((p1 - 360) - p0); // move counterclockwise, first -p0 to get to 0, then p1 - 360.
            return Math.abs (d1) < Math.abs (d2) ? d1 : d2;
        } else {
            // p1 is somewhere counterclockwise to p0
            var d1 = (p1 - p0); // move counterclockwise
            var d2 = (360 - p0) + p1; // move clockwise, first (360-p= to get to 0, then another p1 degrees
            return Math.abs (d1) < Math.abs (d2) ? d1 : d2;
        }
    };
    
    /**
     * Subtraction mod 360, sort of...
     * @private
     */
    var circleSnapTo = function (p, p1, p2) {
        var d1 = this.circleDistance (p, p1);
        var d2 = this.circleDistance (p, p2);
        return Math.abs (d1) < Math.abs (d2) ? p1 : p2;
    };
    
    this.snapYaw = function (y) {
        y %= 360;
        if (y < 0) {
            y += 360;
        }
        if (this.parameters.minYaw < this.parameters.maxYaw) {
            if (y > this.parameters.maxYaw || y < this.parameters.minYaw) {
                y = circleSnapTo (y, this.parameters.minYaw, this.parameters.maxYaw);
            }
        } else {
            // The only time when minYaw > maxYaw is when the interval
            // contains the 0 angle.
            if (y > this.parameters.minYaw) {
                // ok, we're somewhere between minYaw and 0.0
            } else if (y > this.parameters.maxYaw) {
                // we're somewhere between maxYaw and minYaw 
                // (but on the wrong side).
                // figure out the nearest point and snap to it
                y = circleSnapTo (y, this.parameters.minYaw, this.parameters.maxYaw);
            } else {
                // ok, we're somewhere between 0.0 and maxYaw
            }
        }
        return y;
    }
    
    /**
     * Sets the current camera yaw. The yaw is normalized between
     * 0 <= y < 360.
     *
     * @param {number} y the yaw, in degrees
     */
    this.setYaw = function (y) {
        this.state.y = this.snapYaw (y);
    }
    
    /**
     * Gets the current camera yaw.
     *
     * @return {number} the yaw, in degrees
     */
    this.getYaw = function () {
        return this.state.y;
    }
    
    /**
     * Gets the current camera pitch.
     *
     * @return {number} the pitch, in degrees
     */
    this.getPitch = function () {
        return this.state.p;
    }
    
    /**
     * Unregisters event handlers and other page-level hooks. The client need not call this
     * method unless bigshot images are created and removed from the page
     * dynamically. In that case, this method must be called when the client wishes to
     * free the resources allocated by the image. Otherwise the browser will garbage-collect
     * all resources automatically.
     * @public
     */
    this.dispose = function () {
        this.browser.unregisterListener (window, "resize", this.onresizeHandler, false);
    };
    
    /**
     * Sets up transformation matrices etc.
     */
    this.beginRender = function (cause, data) {
        this.onrender (this.ONRENDER_BEGIN, cause, data);
        this.renderer.beginRender (this.state.y, this.state.p, this.state.fov, this.state.tx, this.state.ty, this.state.tz, this.transformOffsets.yaw, this.transformOffsets.pitch, this.transformOffsets.roll);
    }
    
    this.renderListeners = new Array ();
    
    /**
     * Add a function that will be called at the end of every render.
     *
     * @param {function(state)} listener
     */
    this.registerRenderListener = function (listener) {
        var rl = new Array ();
        rl.concat (this.renderListeners);
        rl.push (listener);
        this.renderListeners = rl;
    };
    
    /**
     * Removes a function that will be called at the end of every render.
     *
     * @param {function()} listener
     */
    this.unregisterRenderListener = function (listener) {
        var rl = new Array ();
        rl.concat (this.renderListeners);
        for (var i = 0; i < rl.length; ++i) {
            if (rl[i] == listener) {
                rl = rl.splice (i, 1);
                break;
            }
        }
        this.renderListeners = rl;
    };
    
    this.ONRENDER_BEGIN = 0;
    this.ONRENDER_END = 1;
    this.ONRENDER_TEXTURE_UPDATE = 0;
    
    /**
     * Called at the start and end of every render.
     *
     * @event
     * @private
     * @type function()
     */
    this.onrender = function (state, cause, data) {
        var rl = this.renderListeners;
        for (var i = 0; i < rl.length; ++i) {
            rl[i](state, cause, data);
        }
    };
    
    /**
     * Performs per-render cleanup.
     */
    this.endRender = function (cause, data) {
        for (var f in this.vrFaces) {
            this.vrFaces[f].endRender ();
        }
        this.renderer.endRender ();
        this.onrender (this.ONRENDER_END, cause, data);
    }
    
    /**
     * Renders the VR cube.
     */
    this.render = function (cause, data) {
        this.beginRender (cause, data);
        
        var scene = this.renderer.createTexturedQuadScene ();
        
        for (var f in this.vrFaces) {
            this.vrFaces[f].render (scene);
        }
        
        scene.render ();
        
        for (var i = 0; i < this.hotspots.length; ++i) {
            this.hotspots[i].layout ();
        }
        
        this.endRender (cause, data);
    };
    
    /**
     * Render updated faces. Called as tiles are loaded from the server.
     */
    this.renderUpdated = function (cause, data) {
        if (this.renderer.supportsUpdate ()) {
            this.beginRender (cause, data);
            
            var scene = this.renderer.createTexturedQuadScene ();
            
            for (var f in this.vrFaces) {
                if (this.vrFaces[f].isUpdated ()) {
                    this.vrFaces[f].render (scene);
                }
            }
            
            scene.render ();
            
            for (var i = 0; i < this.hotspots.length; ++i) {
                this.hotspots[i].layout ();
            }
            
            this.endRender (cause, data);
        } else {
            this.render (cause, data);
        }
    };
    
    /**
     * When the mouse is pressed and dragged, the camera rotates
     * proportionally to the length of the dragging.
     */
    this.DRAG_GRAB = "grab";
    
    /**
     * When the mouse is pressed and dragged, the camera continuously
     * rotates with a speed that is proportional to the length of the 
     * dragging.
     */
    this.DRAG_PAN = "pan";
    
    /**
     * The current drag mode.
     * @private
     */
    this.dragMode = this.DRAG_GRAB;
    
    /**
     * Sets the mouse dragging mode.
     *
     * @param mode one of DRAG_GRAB or DRAG_PAN.
     */
    this.setDragMode = function (mode) {
        this.dragMode = mode;
    }
    
    this.dragMouseDown = function (e) {
        this.dragStart = e;
        this.dragDistance = 0;
    }
    
    this.dragMouseUp = function (e) {
        this.dragStart = null;
        this.smoothRotate ();
    }
    
    this.dragMouseMove = function (e) {
        if (this.dragStart != null && this.currentGesture == null) {
            if (this.dragMode == this.DRAG_GRAB) {
                this.smoothRotate ();
                var scale = this.state.fov / this.renderer.getViewportHeight ();
                var dx = e.clientX - this.dragStart.clientX;
                var dy = e.clientY - this.dragStart.clientY;
                this.dragDistance += dx + dy;
                this.setYaw (this.getYaw () - dx * scale);
                this.setPitch (this.getPitch () - dy * scale);
                this.renderAsap ();
                this.dragStart = e;
            } else {
                var scale = 0.1 * this.state.fov / this.renderer.getViewportHeight ();
                var dx = e.clientX - this.dragStart.clientX;
                var dy = e.clientY - this.dragStart.clientY;
                this.dragDistance = dx + dy;
                this.smoothRotate (
                    function () {
                        return dx * scale;
                    },
                    function () {
                        return dy * scale;
                    });
            }
        }
    }
    
    this.onMouseDoubleClick = function (e, x, y) {
        this.smoothRotateToXY (x, y);
    }
    
    this.mouseDoubleClick = function (e) {
        var pos = this.browser.getElementPosition (this.container);
        this.onMouseDoubleClick (e, e.clientX - pos.x, e.clientY - pos.y);
    }
    
    /**
     * Begins a potential drag event.
     *
     * @private
     */
    this.gestureStart = function (event) {
        this.currentGesture = {
            startFov : this.getFov (),
            scale : event.scale
        };            
    };
    
    /**
     * Begins a potential drag event.
     *
     * @private
     */
    this.gestureEnd = function (event) {
        this.currentGesture = null;
    };
    
    /**
     * Begins a potential drag event.
     *
     * @private
     */
    this.gestureChange = function (event) {
        if (this.currentGesture) {
            var newFov = this.currentGesture.startFov / event.scale;
            this.setFov (newFov);
            this.renderAsap ();
        }
    };
    
    this.setMaxTextureMagnification = function (v) {
        this.maxTextureMagnification = v;
    };
    
    this.getMaxTextureMagnification = function () {
        return this.maxTextureMagnification;
    };
    
    /**
     * Computes the minimum field of view where the resulting image will not
     * have to stretch the textures more than given by the
     * {@link bigshot.VRPanoramaParameters#maxTextureMagnification} parameter.
     *
     * @type number
     * @return the minimum FOV, below which it is necessary to stretch the 
     * vr cube texture more than the given {@link bigshot.VRPanoramaParameters#maxTextureMagnification}
     */
    this.getMinFovFromViewportAndImage = function () {
        var halfHeight = this.renderer.getViewportHeight () / 2;
        
        var minFaceHeight = this.vrFaces[0].parameters.height;
        for (var i in this.vrFaces) {
            minFaceHeight = Math.min (minFaceHeight, this.vrFaces[i].parameters.height);
        }
        
        var edgeSizeY = this.maxTextureMagnification * minFaceHeight / 2;
        
        var wy = halfHeight / edgeSizeY;
        
        var mz = Math.atan (wy) * 180 / Math.PI;
        
        return mz * 2;
    }
    
    this.screenToRay = function (x, y) {
        var dray = this.screenToRayDelta (x, y);
        var ray = this.renderer.transformToWorld ([dray.x, dray.y, dray.z]);
        ray = Matrix.RotationY (-this.transformOffsets.yaw * Math.PI / 180.0).ensure4x4 ().x (ray);
        ray = Matrix.RotationX (-this.transformOffsets.pitch * Math.PI / 180.0).ensure4x4 ().x (ray);
        ray = Matrix.RotationZ (-this.transformOffsets.roll * Math.PI / 180.0).ensure4x4 ().x (ray);
        return {
            x : ray.e(1),
            y : ray.e(2),
            z : ray.e(3)
        };
    }
    
    this.screenToRayDelta = function (x, y) {
        var halfHeight = this.renderer.getViewportHeight () / 2;
        var halfWidth = this.renderer.getViewportWidth () / 2;
        var x = (x - halfWidth);
        var y = (y - halfHeight);
        
        var edgeSizeY = Math.tan ((this.state.fov / 2) * Math.PI / 180);
        var edgeSizeX = edgeSizeY * this.renderer.getViewportWidth () / this.renderer.getViewportHeight ();
        
        var wx = x * edgeSizeX / halfWidth;
        var wy = y * edgeSizeY / halfHeight;
        var wz = -1.0;
        
        return {
            x : wx,
            y : wy,
            z : wz
        };
    }
    
    /**
     * Smoothly rotates the panorama so that the 
     * point given by x and y, in pixels relative to the top left corner
     * of the panorama, ends up in the center of the viewport.
     *
     * @param {int} x the x-coordinate, in pixels from the left edge
     * @param {int} y the y-coordinate, in pixels from the top edge
     */
    this.smoothRotateToXY = function (x, y) {
        var ray = this.screenToRayDelta (x, y);
        
        var dpitch = Math.atan (ray.y) * 180 / Math.PI;
        var dyaw = Math.atan (ray.x) * 180 / Math.PI;
        
        this.smoothRotateTo (this.snapYaw (this.getYaw () + dyaw), this.snapPitch (this.getPitch () + dpitch), this.getFov (), this.state.fov / 200);
    }
    
    /**
     * Gives the step to take to slowly approach the 
     * target value.
     *
     * @example
     * current = current + this.ease (current, target, 1.0);
     * @private
     */
    this.ease = function (current, target, speed, snapFrom) {
        var easingFrom = speed * 40;
        if (!snapFrom) {
            snapFrom = speed / 5;
        }
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
            distance = - (speed * distance) / (easingFrom);
        }
        return distance;
    }
    
    /**
     * Current value of the idle counter.
     */
    this.idleCounter = 0;
    
    /**
     * Maximum value of the idle counter before any idle events start,
     * such as autorotation.
     */
    this.maxIdleCounter = -1;
    
    /**
     * Resets the "idle" clock.
     * @private
     */
    this.resetIdle = function () {
        this.idleCounter = 0;
    }
    
    /**
     * Idle clock.
     * @private
     */
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
    
    /**
     * Sets the panorama to auto-rotate after a certain time has
     * elapsed with no user interaction. Default is disabled.
     * 
     * @param {int} delay the delay in seconds. Set to < 0 to disable
     * auto-rotation when idle
     */
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
    
    /**
     * Starts auto-rotation of the camera. If the yaw is constrained,
     * will pan back and forth between the yaw endpoints. Call
     * {@link #smoothRotate}() to stop the rotation.
     */
    this.autoRotate = function () {
        var that = this;
        var scale = this.state.fov / 400;
        
        var speed = scale;
        var dy = speed;
        this.smoothRotate (
            function () {
                var nextPos = that.getYaw () + dy;
                if (that.parameters.minYaw < that.parameters.maxYaw) {
                    if (nextPos > that.parameters.maxYaw || nextPos < that.parameters.minYaw) {
                        dy = -dy;
                    }
                } else {
                    // The only time when minYaw > maxYaw is when the interval
                    // contains the 0 angle.
                    if (nextPos > that.parameters.minYaw) {
                        // ok, we're somewhere between minYaw and 0.0
                    } else if (nextPos > that.parameters.maxYaw) {
                        dy = -dy;
                    } else {
                        // ok, we're somewhere between 0.0 and maxYaw
                    }
                }
                return dy;
            }, function () {
                return that.ease (that.getPitch (), 0.0, speed);
            }, function () {
                return that.ease (that.getFov (), 45.0, 0.1);
            });
    }
    
    /**
     * Smoothly rotates the panorama to the given state.
     *
     * @param {number} yaw the target yaw
     * @param {number} pitch the target pitch
     * @param {number} fov the target vertical field of view
     * @param {number} the speed to rotate with
     */
    this.smoothRotateTo = function (yaw, pitch, fov, speed) {
        var that = this;
        this.smoothRotate (
            function () {
                var distance = that.circleDistance (yaw, that.getYaw ());
                return -that.ease (0, distance, speed);
            }, function () {
                return that.ease (that.getPitch (), pitch, speed);
            }, function () {
                return that.ease (that.getFov (), fov, speed);
            }
        );
    }
    
    /**
     * Integer acting as a "permit". When the smoothRotate function
     * is called, the current value is incremented and saved. If the number changes
     * that particular call to smoothRotate stops. This way we avoid
     * having multiple smoothRotate rotations going in parallel.
     * @private
     * @type int
     */
    this.smoothrotatePermit = 0;
    
    /**
     * Smoothly rotates the camera. If all of the dp, dy and df functions are null, stops
     * any smooth rotation.
     *
     * @param {function()} [dy] function giving the yaw increment for the next frame
     * @param {function()} [dp] function giving the pitch increment for the next frame
     * @param {function()} [df] function giving the field of view (degrees) increment for the next frame
     */
    this.smoothRotate = function (dy, dp, df) {
        ++this.smoothrotatePermit;
        var savedPermit = this.smoothrotatePermit;
        if (!dp && !dy && !df) {
            return;
        }
        
        var that = this;
        var stepper = function () {
            if (that.smoothrotatePermit == savedPermit) {
                if (dy) {
                    that.setYaw (that.getYaw () + dy());
                }
                
                if (dp) {
                    that.setPitch (that.getPitch () + dp());
                }
                
                if (df) {
                    that.setFov (that.getFov () + df());
                }
                that.render ();
                window.setTimeout (stepper, 1);
            }
        };
        stepper ();
    }
    
    /**
     * Stub function to call onresize on this instance.
     *
     * @private
     */
    this.onresizeHandler = function (e) {
        that.onresize ();
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
    
    /**
     * Utility function to interpret mouse wheel events.
     * @private
     */
    this.mouseWheelHandler = function (delta) {
        var that = this;
        var target = null;
        if (delta > 0) {
            if (this.getFov () > this.parameters.minFov) {
                target = this.getFov () * 0.9;
            }
        }
        if (delta < 0) {
            if (this.getFov () < this.parameters.maxFov) {
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
                    return (target - that.getFov ()) / 1.5;
                });        
        }
    };
    
    /**
     * Full screen handler.
     *
     * @private
     */
    this.fullScreenHandler = null;
    
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
     *
     * @param {function()} [onClose] function that is called when the user 
     * exits full-screen mode
     * @public
     */
    this.fullScreen = function (onClose) {
        if (this.fullScreenHandler) {
            return;
        }
        
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
        
        var that = this;
        
        this.fullScreenHandler = new bigshot.FullScreen (this.container);
        this.fullScreenHandler.restoreSize = this.sizeContainer == null;
        
        this.fullScreenHandler.addOnResize (function () {
                that.onresize ();
            });
        
        this.fullScreenHandler.addOnClose (function () {
                if (message.parentNode) {
                    try {
                        div.removeChild (message);
                    } catch (x) {
                    }
                }
                that.fullScreenHandler = null;
            });
        
        if (onClose) {
            this.fullScreenHandler.addOnClose (function () {
                    onClose ();
                });
        }
        
        this.fullScreenHandler.open ();
        this.fullScreenHandler.getRootElement ().appendChild (message);
        
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
        
        return function () {
            that.fullScreenHandler.close ();
        };
    };
    
    /**
     * Right-sizes the canvas container.
     * @private
     */
    this.onresize = function () {
        if (this.fullScreenHandler == null || !this.fullScreenHandler.isFullScreen) {
            if (this.sizeContainer) {
                var s = this.browser.getElementSize (this.sizeContainer);
                this.renderer.resize (s.w, s.h);
            }
        } else {
            this.container.style.width = window.innerWidth + "px";
            this.container.style.height = window.innerHeight + "px";            
            var s = this.browser.getElementSize (this.container);
            this.renderer.resize (s.w, s.h);
        }
        this.renderer.onresize ();
        this.renderAsap ();            
    };
    
    this.renderAsapPermitTaken = false;
    
    /**
     * Posts a render() call via a timeout. Use when the render call must be
     * done as soon as possible, but can't be done in the current call context.
     */
    this.renderAsap = function () {
        if (!this.renderAsapPermitTaken) {
            this.renderAsapPermitTaken = true;
            var that = this;
            setTimeout (function () {
                    that.renderAsapPermitTaken = false;
                    that.render ();                    
                }, 1);
        }
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
     * @param {HTMLElement} sizeContainer the element to use. Set to <code>null</code>
     * to disable.
     */
    this.autoResizeContainer = function (sizeContainer) {
        this.sizeContainer = sizeContainer;
    }
        
    /**
     * The six cube faces.
     *
     * @type bigshot.VRFace[]
     * @private
     */
    var facesInit = {
        facesLeft : 6,
        faceLoaded : function () {
            this.facesLeft--;
            if (this.facesLeft == 0) {
               if (that.parameters.onload) {
                    that.parameters.onload ();
                }
            }
        }
    };
    var onFaceLoad = function () { 
        facesInit.faceLoaded () 
    };
    
    this.vrFaces = new Array ();
    this.vrFaces[0] = new bigshot.VRFace (this, "f", {x:-1, y:1, z:-1}, 2.0, {x:1, y:0, z:0}, {x:0, y:-1, z:0}, onFaceLoad);
    this.vrFaces[1] = new bigshot.VRFace (this, "b", {x:1, y:1, z:1}, 2.0, {x:-1, y:0, z:0}, {x:0, y:-1, z:0}, onFaceLoad);
    this.vrFaces[2] = new bigshot.VRFace (this, "l", {x:-1, y:1, z:1}, 2.0, {x:0, y:0, z:-1}, {x:0, y:-1, z:0}, onFaceLoad);
    this.vrFaces[3] = new bigshot.VRFace (this, "r", {x:1, y:1, z:-1}, 2.0, {x:0, y:0, z:1}, {x:0, y:-1, z:0}, onFaceLoad);
    this.vrFaces[4] = new bigshot.VRFace (this, "u", {x:-1, y:1, z:1}, 2.0, {x:1, y:0, z:0}, {x:0, y:0, z:-1}, onFaceLoad);
    this.vrFaces[5] = new bigshot.VRFace (this, "d", {x:-1, y:-1, z:-1}, 2.0, {x:1, y:0, z:0}, {x:0, y:0, z:1}, onFaceLoad);
    
    /**
     * Helper function to translate touch events to mouse-like events.
     * @private
     */
    var translateEvent = function (event) {
        if (event.clientX) {
            return event;
        } else {
            return {
                clientX : event.changedTouches[0].clientX,
                clientY : event.changedTouches[0].clientY
            };
        };
    };
    
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
    this.browser.registerListener (parameters.container, "gesturestart", function (e) {
            that.gestureStart (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, "gesturechange", function (e) {
            that.gestureChange (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, "gestureend", function (e) {
            that.gestureEnd (e);
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
    this.browser.registerListener (parameters.container, "dblclick", function (e) {
            that.mouseDoubleClick (e);
            return consumeEvent (e);
        }, false);
    
    this.lastTouchStartAt = -1;
    
    this.browser.registerListener (parameters.container, "touchstart", function (e) {
            that.lastTouchStartAt = new Date ().getTime ();
            that.resetIdle ();
            that.dragMouseDown (translateEvent (e));
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, "touchend", function (e) {
            that.resetIdle ();
            that.dragMouseUp (translateEvent (e));
            if (that.lastTouchStartAt > new Date().getTime() - 350) {
                that.mouseDoubleClick (translateEvent (e));
            }
            that.lastTouchStartAt = -1;
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, 'touchmove', function (e) {
            if (that.dragDistance > 24) {                
                that.lastTouchStartAt = -1;
            }
            that.resetIdle ();
            that.dragMouseMove (translateEvent (e));
            return consumeEvent (e);
        }, false);
    
    this.browser.registerListener (window, 'resize', this.onresizeHandler, false);
    
    this.setPitch (0.0);
    this.setYaw (0.0);
    this.setFov (45.0);
}
