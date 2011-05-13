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
 * Creates a new tiled image viewer. (Note: See {@link bigshot.Image#dispose} for important information.)
 *
 * @example
 * var bsi = new bigshot.Image (
 *     new bigshot.ImageParameters ({
 *         basePath : "/bigshot.php?file=myshot.bigshot",
 *         fileSystemType : "archive",
 *         container : document.getElementById ("bigshot_div")
 *     }));
 *
 * @param {bigshot.ImageParameters} parameters the image parameters. Required fields are: <code>basePath</code> and <code>container</code>.
 * If you intend to use the archive filesystem, you need to set the <code>fileSystemType</code> to <code>"archive"</code>
 * as well.
 * @see bigshot.Image#dispose
 * @class A tiled, zoomable image viewer.
 * @constructor
 */     
bigshot.Image = function (parameters) {
    bigshot.setupFileSystem (parameters);
    
    var browser = new bigshot.Browser ();
    var req = browser.createXMLHttpRequest ();
    
    parameters.merge (parameters.fileSystem.getDescriptor (), false);
    
    this.flying = 0;
    this.container = parameters.container;
    this.x = parameters.width / 2.0;
    this.y = parameters.height / 2.0;
    this.zoom = 0.0;
    this.width = parameters.width;
    this.height = parameters.height;
    this.minZoom = parameters.minZoom;
    this.maxZoom = 2.0;
    this.tileSize = parameters.tileSize;
    this.overlap = 0;
    this.browser = new bigshot.Browser ();
    this.imageTileCache = null;
    
    this.dragStart = null;
    this.dragged = false;
    
    this.layers = new Array ();
    
    /**
     * Lays out all layers according to the current 
     * x, y and zoom values.
     *
     * @public
     */
    this.layout = function () {
        var zoomLevel = Math.min (0, Math.ceil (this.zoom));
        var zoomFactor = Math.pow (2, zoomLevel);
        var tileWidthInRealPixels = this.tileSize / zoomFactor;
        
        var fractionalZoomFactor = Math.pow (2, this.zoom - zoomLevel);
        var tileDisplayWidth = this.tileSize * fractionalZoomFactor;
        
        var widthInTiles = this.width / tileWidthInRealPixels;
        var heightInTiles = this.height / tileWidthInRealPixels;
        var centerInTilesX = this.x / tileWidthInRealPixels;
        var centerInTilesY = this.y / tileWidthInRealPixels;
        
        var viewportWidth = this.container.clientWidth;
        var viewportHeight = this.container.clientHeight;
        
        var topLeftInTilesX = centerInTilesX - (viewportWidth / 2) / tileDisplayWidth;
        var topLeftInTilesY = centerInTilesY - (viewportHeight / 2) / tileDisplayWidth;
        
        var topLeftTileX = Math.floor (topLeftInTilesX);
        var topLeftTileY = Math.floor (topLeftInTilesY);
        var topLeftTileXoffset = Math.round ((topLeftInTilesX - topLeftTileX) * tileDisplayWidth);
        var topLeftTileYoffset = Math.round ((topLeftInTilesY - topLeftTileY) * tileDisplayWidth);
        
        for (var i = 0; i < this.layers.length; ++i) {
            this.layers[i].layout (
                this.zoom, 
                -topLeftTileXoffset - tileDisplayWidth, -topLeftTileYoffset - tileDisplayWidth, 
                topLeftTileX - 1, topLeftTileY - 1, 
                Math.ceil (tileDisplayWidth), Math.ceil (tileDisplayWidth), 
                1.0);
        }
    };
    
    /**
     * Resizes the layers of this image.
     *
     * @public
     */
    this.resize = function () {
        var tilesW = Math.ceil (2 * this.container.clientWidth / this.tileSize) + 2;
        var tilesH = Math.ceil (2 * this.container.clientHeight / this.tileSize) + 2;
        for (var i = 0; i < this.layers.length; ++i) {
            this.layers[i].resize (tilesW, tilesH);
        }
    };
    
    /**
     * Creates a HTML div container for a layer. This method
     * is called by the layer's constructor to obtain a 
     * container.
     *
     * @public
     * @type HTMLDivElement
     */
    this.createLayerContainer = function () {
        var layerContainer = document.createElement ("div");
        layerContainer.style.position = "absolute";
        layerContainer.style.overflow = "hidden";
        return layerContainer;
    };
    
    /**
     * Returns the div element used as viewport.
     *
     * @public
     * @type HTMLDivElement
     */
    this.getContainer = function () {
        return this.container;
    };
    
    /**
     * Adds a new layer to the image.
     *
     * @public
     * @see bigshot.HotspotLayer for usage example
     * @param {bigshot.Layer} layer the layer to add.
     */
    this.addLayer = function (layer) {
        this.container.appendChild (layer.getContainer ());
        this.layers.push (layer);
    };
    
    /**
     * Sets the current zoom value.
     *
     * @private
     * @param {number} zoom the zoom value.
     * @param {boolean} layout trigger a viewport update after setting. Defaults to <code>true</code>.
     */
    this.setZoom = function (zoom, updateViewport) {
        this.zoom = Math.min (this.maxZoom, Math.max (zoom, this.minZoom));
        var zoomLevel = Math.ceil (this.zoom);
        var zoomFactor = Math.pow (2, zoomLevel);
        var maxTileX = Math.ceil (zoomFactor * this.width / this.tileSize);
        var maxTileY = Math.ceil (zoomFactor * this.height / this.tileSize);
        for (var i = 0; i < this.layers.length; ++i) {
            this.layers[i].setMaxTiles (maxTileX, maxTileY);
        }
    };
    
    /**
     * Sets the maximum zoom value. The maximum magnification (of the full-size image)
     * is 2<sup>maxZoom</sup>. Set to 0.0 to avoid pixelation.
     *
     * @public
     * @param {number} maxZoom the maximum zoom value
     */
    this.setMaxZoom = function (maxZoom) {
        this.maxZoom = maxZoom;
    };
    
    /**
     * Gets the maximum zoom value. The maximum magnification (of the full-size image)
     * is 2<sup>maxZoom</sup>.
     * 
     * @public
     * @type number
     */
    this.getMaxZoom = function () {
        return this.maxZoom;
    };
    
    /**
     * Sets the minimum zoom value. The minimum magnification (of the full-size image)
     * is 2<sup>minZoom</sup>, so a minZoom of <code>-3</code> means that the smallest
     * image shown will be one-eighth of the full-size image.
     *
     * @public
     * @param {number} minZoom the minimum zoom value for this image
     */
    this.setMinZoom = function (minZoom) {
        this.minZoom = minZoom;
    };
    
    /**
     * Gets the minimum zoom value. The minimum magnification (of the full-size image)
     * is 2<sup>minZoom</sup>, so a minZoom of <code>-3</code> means that the smallest
     * image shown will be one-eighth of the full-size image.
     * 
     * @public
     * @type number
     */
    this.getMinZoom = function () {
        return this.minZoom;
    };
    
    this.currentGesture = null;
    
    /**
     * Begins a potential drag event.
     *
     * @private
     */
    this.gestureStart = function (event) {
        this.currentGesture = {
            startZoom : this.zoom,
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
            var newZoom = this.currentGesture.startZoom + Math.log (event.scale) / Math.log (2);
            this.setZoom (newZoom);
            this.layout ();
        }
    };
    
    /**
     * Begins a potential drag event.
     *
     * @private
     */
    this.dragMouseDown = function (event) {
        this.dragStart = {
            x : event.clientX,
            y : event.clientY
        };
        this.dragged = false;
    };
    
    /**
     * Handles a mouse drag event by panning the image.
     * Also sets the dragged flag to indicate that the
     * following <code>click</code> event should be ignored.
     * @private
     */
    this.dragMouseMove = function (event) {
        if (this.currentGesture == null && this.dragStart != null) {
            var delta = {
                x : event.clientX - this.dragStart.x,
                y : event.clientY - this.dragStart.y
            };
            if (delta.x != 0 || delta.y != 0) {
                this.dragged = true;
            }
            var zoomFactor = Math.pow (2, this.zoom);
            var realX = delta.x / zoomFactor;
            var realY = delta.y / zoomFactor;
            this.moveTo (this.x - realX, this.y - realY);
            this.dragStart = {
                x : event.clientX,
                y : event.clientY
            };
        }
    };
    
    /**
     * Ends a drag event by freeing the associated structures.
     * @private
     */
    this.dragMouseUp = function (event) {
        if (this.dragStart != null) {
            this.dragStart = null;
            if (!this.dragged && parameters.touchUI) {
                this.mouseClick (event);
            }
        }
    };
    
    /**
     * Mouse double-click handler. Pans to the clicked point and
     * zooms in half a zoom level (approx 40%).
     * @private
     */
    this.mouseDoubleClick = function (event) {
        var elementPos = this.browser.getElementPosition (this.container);
        var clickPos = {
            x : event.clientX - elementPos.x - this.container.clientWidth / 2,
            y : event.clientY - elementPos.y - this.container.clientHeight / 2
        };
        var scale = Math.pow (2, this.zoom);
        clickPos.x /= scale;
        clickPos.y /= scale;
        this.flyTo (this.x + clickPos.x, this.y + clickPos.y, this.zoom + 0.5);
    };
    
    /**
     * Returns the current zoom level.
     *
     * @public
     * @type number
     */
    this.getZoom = function () {
        return this.zoom;
    };
    
    /**
     * Stops any current flyTo operation and sets the current position.
     *
     * @param [x] the new x-coordinate
     * @param [y] the new y-coordinate
     * @param [zoom] the new zoom level
     * @param [updateViewport] if the viewport should be updated, defaults to <code>true</code>
     * @public
     */
    this.moveTo = function (x, y, zoom) {
        this.stopFlying ();
        if (x != null || y != null) {
            this.setPosition (x, y, false);
        }
        if (zoom != null) {
            this.setZoom (zoom, false);
        }
        this.layout ();
    }
    
    /**
     * Sets the current position.
     *
     * @param [x] the new x-coordinate
     * @param [y] the new y-coordinate
     * @param [updateViewport] if the viewport should be updated, defaults to <code>true</code>
     * @private
     */
    this.setPosition = function (x, y, updateViewport) {
        if (x != null) {
            if (parameters.wrapX) {
                if (x < 0 || x >= this.width) {
                    x = (x + this.width) % this.width;
                }
            }
            this.x = Math.max (0, Math.min (this.width, x));
        }
        
        if (y != null) {
            if (parameters.wrapY) {
                if (y < 0 || y >= this.height) {
                    y = (y + this.height) % this.height;
                }
            }
            this.y = Math.max (0, Math.min (this.height, y));
        }
        
        if (updateViewport != false) {
            this.layout ();
        }
    };
    
    /**
     * Helper function for calculating zoom levels.
     *
     * @public
     * @returns the zoom level at which the given number of full-image pixels
     * occupy the given number of screen pixels.
     * @param {number} imageDimension the image dimension in full-image pixels
     * @param {number} containerDimension the container dimension in screen pixels
     */
    this.fitZoom = function (imageDimension, containerDimension) {
        var scale = containerDimension / imageDimension;
        return Math.log (scale) / Math.LN2;
    };
    
    /**
     * Returns the maximum zoom level at which the full image
     * is visible in the viewport.
     * @public
     */
    this.getZoomToFitValue = function () {
        return Math.min (
            this.fitZoom (parameters.width, this.container.clientWidth),
            this.fitZoom (parameters.height, this.container.clientHeight));
    };
    
    /**
     * Adjust the zoom level to fit the image in the viewport.
     * @public
     */
    this.zoomToFit = function () {
        this.moveTo (null, null, this.getZoomToFitValue ());
    };
    
    /**
     * Adjust the zoom level to fit the 
     * image height in the viewport.
     * @public
     */
    this.zoomToFitHeight = function () {
        this.moveTo (null, null, this.fitZoom (parameters.height, this.container.clientHeight));
    };
    
    /**
     * Adjust the zoom level to fit the 
     * image width in the viewport.
     * @public
     */
    this.zoomToFitWidth = function () {
        this.moveTo (null, null, this.fitZoom (parameters.width, this.container.clientWidth));
    };
    
    /**
     * Smoothly adjust the zoom level to fit the 
     * image height in the viewport.
     * @public
     */
    this.flyZoomToFitHeight = function () {
        this.flyTo (null, parameters.height / 2, this.fitZoom (parameters.height, this.container.clientHeight));
    };
    
    /**
     * Smoothly adjust the zoom level to fit the 
     * image width in the viewport.
     * @public
     */
    this.flyZoomToFitWidth = function () {
        this.flyTo (parameters.width / 2, null, this.fitZoom (parameters.width, this.container.clientWidth));
    };
    
    /**
     * Smoothly adjust the zoom level to fit the 
     * full image in the viewport.
     * @public
     */
    this.flyZoomToFit = function () {
        this.flyTo (parameters.width / 2, parameters.height / 2, this.getZoomToFitValue ());
    };
    
    /**
     * Handles mouse wheel actions.
     * @private
     */
    this.mouseWheelHandler = function (delta) {
        if (delta > 0) {
            this.flyTo (this.x, this.y, this.getZoom () + 0.5);
        } else if (delta < 0) {
            this.flyTo (this.x, this.y, this.getZoom () - 0.5);
        }
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
     * Triggers a right-sizing of all layers.
     * Called on window resize via the {@link bigshot.Image#onresizeHandler} stub.
     * @public
     */
    this.onresize = function () {
        this.resize ();
        this.layout ();
    };
    
    /**
     * Returns the current x-coordinate, which is the full-image x coordinate
     * in the center of the viewport.
     * @public
     * @type number
     */
    this.getX = function () {
        return this.x;
    };
    
    /**
     * Returns the current y-coordinate, which is the full-image x coordinate
     * in the center of the viewport.
     * @public
     * @type number
     */
    this.getY = function () {
        return this.y;
    };
    
    /**
     * Interrupts the current {@link #flyTo}, if one is active.
     * @public
     */
    this.stopFlying = function () {
        this.flying++;
    };
    
    /**
     * Smoothly flies to the specified position.
     *
     * @public
     * @param {number} [x] the new x-coordinate
     * @param {number} [y] the new y-coordinate
     * @param {number} [zoom] the new zoom level
     */
    this.flyTo = function (x, y, zoom) {
        var that = this;
        
        x = x != null ? x : this.x;
        y = y != null ? y : this.y;
        zoom = zoom != null ? zoom : this.zoom;
        
        var targetX = Math.max (0, Math.min (this.width, x));
        var targetY = Math.max (0, Math.min (this.height, y));
        
        var targetZoom = Math.min (this.maxZoom, Math.max (zoom, this.minZoom));
        
        this.flying++;
        var flyingAtStart = this.flying;
        
        var approach = function (current, target, step) {
            return current + (target - current) * step;
        };
        
        var iter = function () {
            if (that.flying == flyingAtStart) {
                var nx = approach (that.x, targetX, 0.5);
                var ny = approach (that.y, targetY, 0.5);
                var nz = approach (that.zoom, targetZoom, 0.5);
                var done = true;
                if (Math.abs (that.x - targetX) < 1.0) {
                    nx = targetX;
                } else {
                    done = false;
                }
                if (Math.abs (that.y - targetY) < 1.0) {
                    ny = targetY;
                } else {
                    done = false;
                }
                if (Math.abs (that.zoom - targetZoom) < 0.02) {
                    nz = targetZoom;
                } else {
                    done = false;
                }
                that.setPosition (nx, ny, false);
                that.setZoom (nz, false);
                that.layout ();
                if (!done) {
                    setTimeout (iter, 20);
                }
            };
        }
        setTimeout (iter, 20);
    };
    
    /**
     * Returns the maximum zoom level at which a rectangle with the given dimensions
     * fit into the viewport.
     *
     * @public
     * @param {number} w the width of the rectangle, given in full-image pixels
     * @param {number} h the height of the rectangle, given in full-image pixels
     */        
    this.rectVisibleAtZoomLevel = function (w, h) {
        return Math.min (
            this.fitZoom (w, this.container.clientWidth),
            this.fitZoom (h, this.container.clientHeight));
    };
    
    /**
     * Returns the base size in screen pixels of the two zoom touch areas.
     * The zoom out border will be getTouchAreaBaseSize() pixels wide,
     * and the center zoom in hotspot will be 2*getTouchAreaBaseSize() pixels wide
     * and tall.
     * @type number
     * @public
     */
    this.getTouchAreaBaseSize = function () {
        var averageSize = ((this.container.clientWidth + this.container.clientHeight) / 2) * 0.2;
        return Math.min (averageSize, Math.min (this.container.clientWidth, this.container.clientHeight) / 6);
    };
    
    /**
     * Handles mouse click events. If the touch UI is active,
     * we'll pan and/or zoom, as appropriate. If not, we just ignore
     * the event.
     * @private
     */
    this.mouseClick = function (event) {
        if (!parameters.touchUI) {
            return;
        }
        if (this.dragged) {
            return;
        }
        var elementPos = this.browser.getElementPosition (this.container);
        var clickPos = {
            x : event.clientX - elementPos.x - this.container.clientWidth / 2,
            y : event.clientY - elementPos.y - this.container.clientHeight / 2
        };
        
        var zoomOutBorderSize = this.getTouchAreaBaseSize ();
        var zoomInHotspotSize = this.getTouchAreaBaseSize ();
        
        if (Math.abs (clickPos.x) > (this.container.clientWidth / 2 - zoomOutBorderSize) || Math.abs (clickPos.y) > (this.container.clientHeight / 2 - zoomOutBorderSize)) {
            this.flyTo (this.x, this.y, this.zoom - 0.5);
        } else {
            var newZoom = this.zoom;
            if (Math.abs (clickPos.x) < zoomInHotspotSize && Math.abs (clickPos.y) < zoomInHotspotSize) {
                newZoom += 0.5;
            }
            var scale = Math.pow (2, this.zoom);
            clickPos.x /= scale;
            clickPos.y /= scale;
            this.flyTo (this.x + clickPos.x, this.y + clickPos.y, newZoom);
        }
    };
    
    /**
     * Briefly shows the touch ui zones. See the {@link bigshot.ImageParameters#touchUI}
     * documentation for an explanation of the touch ui.
     * 
     * @public
     * @see bigshot.ImageParameters#touchUI
     * @param {int} [delay] milliseconds before fading out
     * @param {int} [fadeOut] milliseconds to fade out the zone overlays in
     */
    this.showTouchUI = function (delay, fadeOut) {
        if (!delay) {
            delay = 2500;
        }
        if (!fadeOut) {
            fadeOut = 1000;
        }
        
        var zoomOutBorderSize = this.getTouchAreaBaseSize ();
        var zoomInHotspotSize = this.getTouchAreaBaseSize ();
        var centerX = this.container.clientWidth / 2;
        var centerY = this.container.clientHeight / 2;
        
        var frameDiv = document.createElement ("div");
        frameDiv.style.position = "absolute";
        frameDiv.style.zIndex = "9999";
        frameDiv.style.opacity = 0.9;
        frameDiv.style.width = this.container.clientWidth + "px";
        frameDiv.style.height = this.container.clientHeight + "px";
        
        var centerSpotAnchor = document.createElement ("div");
        centerSpotAnchor.style.position = "absolute";
        
        var centerSpot = document.createElement ("div");
        centerSpot.style.position = "relative";
        centerSpot.style.background = "black";
        centerSpot.style.textAlign = "center";
        centerSpot.style.top = (centerY - zoomInHotspotSize) + "px";
        centerSpot.style.left = (centerX - zoomInHotspotSize) + "px";
        centerSpot.style.width = (2 * zoomInHotspotSize) + "px";
        centerSpot.style.height = (2 * zoomInHotspotSize) + "px";
        
        frameDiv.appendChild (centerSpotAnchor);
        centerSpotAnchor.appendChild (centerSpot);
        centerSpot.innerHTML = "<span style='display:inline-box; position:relative; vertical-align:middle; font-size: 20pt; top: 10pt; color:white'>ZOOM IN</span>";
        
        var zoomOutBorderAnchor = document.createElement ("div");
        zoomOutBorderAnchor.style.position = "absolute";
        
        var zoomOutBorder = document.createElement ("div");
        zoomOutBorder.style.position = "relative";
        zoomOutBorder.style.border = zoomOutBorderSize + "px solid black";
        zoomOutBorder.style.top = "0px";
        zoomOutBorder.style.left = "0px";
        zoomOutBorder.style.textAlign = "center";
        zoomOutBorder.style.width = this.container.clientWidth + "px";
        zoomOutBorder.style.height = this.container.clientHeight + "px";
        zoomOutBorder.style.MozBoxSizing = 
            zoomOutBorder.style.boxSizing = 
            zoomOutBorder.style.WebkitBoxSizing = 
            "border-box";
        
        zoomOutBorder.innerHTML = "<span style='position:relative; font-size: 20pt; top: -25pt; color:white'>ZOOM OUT</span>";
        
        zoomOutBorderAnchor.appendChild (zoomOutBorder);
        frameDiv.appendChild (zoomOutBorderAnchor);
        
        this.container.appendChild (frameDiv);
        
        var that = this;
        var opacity = 0.9;
        var fadeOutSteps = fadeOut / 50;
        if (fadeOutSteps < 1) {
            fadeOutSteps = 1;
        }
        var iter = function () {
            opacity = opacity - (0.9 / fadeOutSteps);
            if (opacity < 0.0) {
                that.container.removeChild (frameDiv);
            } else {
                frameDiv.style.opacity = opacity;
                setTimeout (iter, 50);
            }
        };
        setTimeout (iter, delay);
    };
    
    this.fullScreenHandler = null;
    
    /**
     * Forces exit from full screen mode, if we're there.
     * @public
     */
    this.exitFullScreen = function () {
        if (this.fullScreenHandler) {
            this.fullScreenHandler.close ();
            this.fullScreenHandler = null;
            return;
        }
    };
    
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
        this.fullScreenHandler.restoreSize = true;
        
        this.fullScreenHandler.addOnResize (function () {
                if (that.fullScreenHandler && that.fullScreenHandler.isFullScreen) {
                    that.container.style.width = window.innerWidth + "px";
                    that.container.style.height = window.innerHeight + "px";                
                }
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
        /*
        
        if (this.isFullScreen) {
            return;
        }
        this.isFullScreen = true;
        
        var div = document.createElement ("div");
        div.style.position = "fixed";
        div.style.width = Math.min (window.innerWidth, document.documentElement.clientWidth) + "px";
        div.style.height = Math.min (window.innerHeight, document.documentElement.clientHeight) + "px";
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
            that.container.style.width = savedSize.width;
            that.container.style.height = savedSize.height;
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
        
        return this.exitFullScreenHandler;
        */
    };
    
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
    
    var that = this;
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
    
    this.thisTileCache = new bigshot.ImageTileCache (function () {
            that.layout ();     
        }, parameters);
    
    this.addLayer (
        new bigshot.TileLayer (this, parameters, 0, 0, this.thisTileCache)
    );
    this.resize ();
    
    this.browser.registerListener (parameters.container, "DOMMouseScroll", function (e) {
            that.mouseWheel (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, "mousewheel", function (e) {
            that.mouseWheel (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, "dblclick", function (e) {
            that.mouseDoubleClick (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, "mousedown", function (e) {
            that.dragMouseDown (e);
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
    this.browser.registerListener (parameters.container, "touchstart", function (e) {
            that.dragMouseDown (translateEvent (e));
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, "mouseup", function (e) {
            that.dragMouseUp (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, "touchend", function (e) {
            that.dragMouseUp (translateEvent (e));
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, 'mousemove', function (e) {
            that.dragMouseMove (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, 'mouseout', function (e) {
            //that.dragMouseUp (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (parameters.container, 'touchmove', function (e) {
            that.dragMouseMove (translateEvent (e));
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (window, 'resize', that.onresizeHandler, false);
    this.zoomToFit ();
    return this;
};
