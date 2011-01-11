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
if (!self["bigshot"]) {
    /**
     * @namespace Bigshot namespace.
     *
     * Bigshot is a toolkit for zoomable images and VR panoramas.
     * 
     * <h3>Zoomable Images</h3>
     *
     * <p>The two classes that are needed for zoomable images are:
     *
     * <ul>
     * <li>{@link bigshot.Image}: The main class for making zoomable images. See the class docs
     *     for a tutorial.
     * <li>{@link bigshot.ImageParameters}: Parameters for zoomable images.
     * </ul>
     *
     * For hotspots, see:
     *
     * <ul>
     * <li>{@link bigshot.HotspotLayer}
     * <li>{@link bigshot.Hotspot}
     * <li>{@link bigshot.LabeledHotspot}
     * <li>{@link bigshot.LinkHotspot}
     * </ul>
     *
     * <h3>VR Panoramas</h3>
     *
     * <p>The two classes that are needed for zoomable VR panoramas (requires WebGL) are:
     *
     * <ul>
     * <li>{@link bigshot.VRPanorama}: The main class for making VR panoramas. See the class docs
     *     for a tutorial.
     * <li>{@link bigshot.ImageParameters}: Parameters for zoomable images. 
     * </ul>
     */
    bigshot = {};
    
    /**
     * Creates a new instance.
     * 
     * @class Browser compatibility layer and utility functions.
     *
     * @constructor
     */
    bigshot.Browser = function () {
        /**
         * Removes all children from an element.
         * 
         * @public
         * @param {HTMLElement} element the element whose children are to be removed.
         */
        this.removeAllChildren = function (element) {
            if (element.children.length > 0) {
                for (var i = element.children.length - 1; i >= 0; --i) {
                    element.removeChild (element.children[i]);
                }
            }
        };
        
        /**
         * Thunk to implement a faked "mouseenter" event.
         * @private
         */
        this.mouseEnter = function (_fn) {
            var isAChildOf = this.isAChildOf;
            return function(_evt)
            {
                var relTarget = _evt.relatedTarget;
                if (this === relTarget || isAChildOf (this, relTarget))
                { return; }
                
                _fn.call (this, _evt);
            }
        };
        
        this.isAChildOf = function (_parent, _child) {
            if (_parent === _child) { return false; }
            while (_child && _child !== _parent)
            { _child = _child.parentNode; }
            
            return _child === _parent;
        };
        
        /**
         * Unregisters a listener from an element.
         *
         * @param {HTMLElement} elem the element
         * @param {String} eventName the event name ("click", "mouseover", etc.)
         * @param {function(e)} fn the callback function to detach
         * @param {boolean} useCapture specifies if we should unregister a listener from the capture chain.
         */
        this.unregisterListener = function (elem, eventName, fn, useCapture) {
            if (typeof (elem.removeEventListener) != 'undefined') {
                elem.removeEventListener (eventName, fn, useCapture);
            } else if (typeof (elem.detachEvent) != 'undefined') {
                elem.detachEvent('on' + eventName, fn);
            }
        };
        
        /**
         * Registers a listener to an element.
         *
         * @param {HTMLElement} elem the element
         * @param {String} eventName the event name ("click", "mouseover", etc.)
         * @param {function(e)} fn the callback function to attach
         * @param {boolean} useCapture specifies if we want to initiate capture.
         * See <a href="https://developer.mozilla.org/en/DOM/element.addEventListener">element.addEventListener</a>
         * on MDN for an explanation.
         */
        this.registerListener = function (_elem, _evtName, _fn, _useCapture) {
            if (typeof _elem.addEventListener != 'undefined')
            {
                if (_evtName === 'mouseenter')
                { _elem.addEventListener('mouseover', this.mouseEnter(_fn), _useCapture); }
                else if (_evtName === 'mouseleave')
                { _elem.addEventListener('mouseout', this.mouseEnter(_fn), _useCapture); }
                else
                { _elem.addEventListener(_evtName, _fn, _useCapture); }
            }
            else if (typeof _elem.attachEvent != 'undefined')
            {
                _elem.attachEvent('on' + _evtName, _fn);
            }
            else
            {
                _elem['on' + _evtName] = _fn;
            }
        };
        
        /**
         * Stops an event from bubbling.
         *
         * @param {Event} eventObject the event object
         */
        this.stopEventBubbling = function (eventObject) {
            if (eventObject) {
                if (eventObject.stopPropagation) {
                    eventObject.stopPropagation ();
                } else { 
                    eventObject.cancelBubble = true; 
                }
            }
        };
        
        /**
         * Creates a callback function that simply stops the event from bubbling.
         *
         * @example
         * var browser = new bigshot.Browser ();
         * browser.registerListener (element, 
         *     "mousedown", 
         *     browser.stopEventBubblingHandler (), 
         *     false);
         * @type function(event)
         * @return a new function that can be used to stop an event from bubbling
         */
        this.stopEventBubblingHandler = function () {
            var that = this;
            return function (event) {
                that.stopEventBubbling (event);
                return false;
            };
        }
        
        /**
         * Stops bubbling for all mouse events on the element.
         *
         * @param {HTMLElement} element the element
         */
        this.stopMouseEventBubbling = function (element) {
            this.registerListener (element, "mousedown", this.stopEventBubblingHandler (), false);
            this.registerListener (element, "mouseup", this.stopEventBubblingHandler (), false);
            this.registerListener (element, "mousemove", this.stopEventBubblingHandler (), false);
        };
        
        /**
         * Returns the size in pixels of the element
         *
         * @param {HTMLElement} obj the element
         * @return a size object with two integer members, w and h, for width and height respectively.
         */
        this.getElementSize = function (obj) {
            var size = new Object();
            if (obj.clientWidth) {
                size.w = obj.clientWidth;
            }
            if (obj.clientHeight) {
                size.h = obj.clientHeight;
            }
            return size;
        };
        
        /**
         * Returns the position in pixels of the element relative
         * to the top left corner of the document.
         *
         * @param {HTMLElement} obj the element
         * @return a position object with two integer members, x and y.
         */
        this.getElementPosition = function (obj) {
            var position = new Object();
            position.x = 0;
            position.y = 0;
            
            var o = obj;
            while (o) {
                position.x += o.offsetLeft;
                position.y += o.offsetTop;
                if (o.clientLeft) {
                    position.x += o.clientLeft;
                }
                if (o.clientTop) {
                    position.y += o.clientTop;
                }
                
                if (o.x) {
                    position.x += o.x;
                }
                if (o.y) {
                    position.y += o.y;
                }
                o = o.offsetParent;
            }
            return position;
        };
        
        /**
         * Creates an XMLHttpRequest object.
         *
         * @type XMLHttpRequest
         * @return a XMLHttpRequest object.
         */
        this.createXMLHttpRequest = function  () {
            try { 
                return new ActiveXObject("Msxml2.XMLHTTP"); 
            } catch (e) {
            }
            
            try { 
                return new ActiveXObject("Microsoft.XMLHTTP"); 
            } catch (e) {
            }
            
            try { 
                return new XMLHttpRequest(); 
            } catch(e) {
            }
            
            alert("XMLHttpRequest not supported");
            
            return null;
        };
        return this;
    };
    
    /**
     * @class Object-oriented support functions, used to make JavaScript
     * a bit more palatable to a Java-head.
     */
    bigshot.object = {
        /**
         * Performs an inheritance operation with a base-class instance 
         * and a derived instance. Each method that exists in the base class
         * but not in the derived instance is copied across. Every method in the
         * base-class instance is thunked and put in a field named <code>_super</code>
         * in the derived instance. The thunk takes care of making sure the
         * <code>this</code> reference points where you'd expect it.
         * Methods in the derived class can refer to <code>_super.<i>methodName</i></code>
         * to get the method as defined by the base class.
         * Fields not of <code>function</code> type are copied across if they do not
         * exist in the derived class.
         *
         * @param {Object} base the base-class instance
         * @param {Object} derived the derived-class instance
         */
        extend : function (base, derived) {
            var _super = {};
            
            for (var k in derived) {
                if (typeof (derived[k]) == "function") {
                    derived[k] = this.makeThunk (derived[k], derived, _super);
                }
            }
            
            for (var k in base) {
                if (typeof (base[k]) == "function") {
                    var fn = base[k];
                    var usesSuper = (fn.usesSuper ? fn.usesSuper : null);
                    var fn = (fn.isThunkFor ? fn.isThunkFor : fn);
                    _super[k] = this.makeThunk (fn, derived, usesSuper);
                    if (!derived[k]) {
                        derived[k] = _super[k];
                    }
                } else if (!derived[k]) {
                    derived[k] = base[k];
                }
            }
            return derived;
        },
        
        /**
         * Creates a function thunk that resets the <code>this</code>
         * reference and the object's <code>_super</code> reference.
         * The returned function has three properties that can be used
         * to examine it:
         *
         * <ul>
         * <li><code>thunksTo</code>: Set to <code>_this</code>
         * <li><code>isThunkFor</code>: Set to <code>fn</code>
         * <li><code>usesSuper</code>: Set to <code>_super</code>
         * </ul>
         * 
         * @param {function} fn the function to thunk
         * @param {Object} _this the new <code>this</code> reference.
         * @param {Object} _super the new <code>_super</code> reference.
         */
        makeThunk : function (fn, _this, _super) {
            var f = function () {
                _this._super = _super;
                return fn.apply (_this, arguments);
            };
            f.thunksTo = _this;
            f.isThunkFor = fn;
            f.usesSuper = _super;
            return f;
        },
        
        /**
         * Utility function to show an object's fields in a message box.
         *
         * @param {Object} o the object
         */
        alertr : function (o) {
            var sb = "";
            for (var k in o) {
                sb += k + ":" + o[k] + "\n";
            }
            alert (sb);
        },
        
        /**
         * Utility function to show an object's fields in the console log.
         *
         * @param {Object} o the object
         */
        logr : function (o) {
            var sb = "";
            for (var k in o) {
                sb += k + ":" + o[k] + "\n";
            }
            if (console) {
                console.log (sb);
            }
        }
    };
    
    /**
     * Creates a new hotspot instance.
     *
     * @class Base class for hotspots in a {@link bigshot.HotspotLayer}. See {@link bigshot.HotspotLayer} for 
     * examples.
     *
     * @param {number} x x-coordinate of the top-left corner, given in full image pixels
     * @param {number} y y-coordinate of the top-left corner, given in full image pixels
     * @param {number} w width of the hotspot, given in full image pixels
     * @param {number} h height of the hotspot, given in full image pixels
     * @see bigshot.HotspotLayer
     * @see bigshot.LabeledHotspot
     * @see bigshot.LinkHotspot
     * @constructor
     */
    bigshot.Hotspot = function (x, y, w, h) {
        var element = document.createElement ("div");
        element.style.position = "relative";
        element.style.overflow = "visible";
        
        this.browser = new bigshot.Browser ();
        this.element = element;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        
        /**
         * Lays out the hotspot in the viewport.
         *
         * @name bigshot.Hotspot#layout
         * @param x0 x-coordinate of top-left corner of the full image in css pixels
         * @param y0 y-coordinate of top-left corner of the full image in css pixels
         * @param zoomFactor the zoom factor.
         * @function
         */
        this.layout = function (x0, y0, zoomFactor) {
            var sx = this.x * zoomFactor + x0;
            var sy = this.y * zoomFactor + y0;
            var sw = this.w * zoomFactor;
            var sh = this.h * zoomFactor;
            this.element.style.top = sy + "px";
            this.element.style.left = sx + "px";
            this.element.style.width = sw + "px";
            this.element.style.height = sh + "px";
        };
        
        /**
         * Returns the HTMLDivElement used to show the hotspot.
         * Clients can access this element in order to style it.
         *
         * @type HTMLDivElement
         */
        this.getElement = function () {
            return this.element;
        };
        
        return this;
    };
    
    /**
     * Creates a new labeled hotspot instance.
     *
     * @class A hotspot with a label under it. The label element can be accessed using
     * the getLabel method and styled as any HTMLElement. See {@link bigshot.HotspotLayer} for 
     * examples.
     *
     * @see bigshot.HotspotLayer
     * @param {number} x x-coordinate of the top-left corner, given in full image pixels
     * @param {number} y y-coordinate of the top-left corner, given in full image pixels
     * @param {number} w width of the hotspot, given in full image pixels
     * @param {number} h height of the hotspot, given in full image pixels
     * @param {String} labelText text of the label
     * @augments bigshot.Hotspot
     * @constructor
     */
    bigshot.LabeledHotspot = function (x, y, w, h, labelText) {
        var hs = new bigshot.Hotspot (x, y, w, h);
        
        /**
         * Returns the label element.
         *
         * @type HTMLDivElement
         */
        this.getLabel = function () {
            return this.label;
        };
        
        this.layout = function (x0, y0, zoomFactor) {
            this._super.layout (x0, y0, zoomFactor);
            var labelSize = this.browser.getElementSize (this.label);
            var sw = this.w * zoomFactor;
            var sh = this.h * zoomFactor;
            this.label.style.top = (sh + 4) + "px";
            this.label.style.left = ((sw - labelSize.w) / 2) + "px";
        };
        
        this.label = document.createElement ("div");
        this.label.style.position = "relative";
        this.label.style.display = "inline-block";
        
        hs.getElement ().appendChild (this.label);
        this.label.innerHTML = labelText;
        
        return bigshot.object.extend (hs, this);
    };
    
    /**
     * Creates a new link-hotspot instance.
     *
     * @class A labeled hotspot that takes the user to another
     * location when it is clicked on. See {@link bigshot.HotspotLayer} for 
     * examples.
     *
     * @see bigshot.HotspotLayer
     * @param {number} x x-coordinate of the top-left corner, given in full image pixels
     * @param {number} y y-coordinate of the top-left corner, given in full image pixels
     * @param {number} w width of the hotspot, given in full image pixels
     * @param {number} h height of the hotspot, given in full image pixels
     * @param {String} labelText text of the label
     * @param {String} url url to go to on click
     * @augments bigshot.LabeledHotspot
     * @constructor
     */
    bigshot.LinkHotspot = function (x, y, w, h, labelText, url) {
        var hs = new bigshot.LabeledHotspot (x, y, w, h, labelText);
        hs.browser.registerListener (hs.getElement (), "click", function () {
                document.location.href = url;
            });
        
        return bigshot.object.extend (hs, this);
    };
    
    
    /**
     * Creates a new hotspot layer. The layer must be added to the image using
     * {@link bigshot.Image#addLayer}.
     *
     * @class A hotspot layer.
     * @example
     * var image = new bigshot.Image (...);
     * var hotspotLayer = new bigshot.HotspotLayer (image);
     * var hotspot = new bigshot.LinkHotspot (100, 100, 200, 100, 
     *    "Bigshot on Google Code", 
     *    "http://code.google.com/p/bigshot/");
     *
     * // Style the hotspot a bit
     * hotspot.getElement ().className = "hotspot"; 
     * hotspot.getLabel ().className = "label";
     *
     * hotspotLayer.addHotspot (hotspot);
     *
     * image.addLayer (hotspotLayer);
     * 
     * @param {bigshot.Image} image the image this hotspot layer will be part of
     * @augments bigshot.Layer
     * @constructor
     */
    bigshot.HotspotLayer = function (image) {
        this.hotspots = new Array ();
        this.browser = new bigshot.Browser ();
        this.container = image.createLayerContainer ();
        this.parentContainer = image.getContainer ();
        
        this.getContainer = function () {
            return this.container;
        };
        
        this.resize = function (w, h) {
            this.container.style.width = this.parentContainer.clientWidth + "px";
            this.container.style.height = this.parentContainer.clientHeight + "px";
        };
        
        this.layout = function (zoom, x0, y0, tx0, ty0, size, stride, opacity) {
            var zoomFactor = Math.pow (2, zoom);
            x0 -= stride * tx0;
            y0 -= stride * ty0;
            for (var i = 0; i < this.hotspots.length; ++i) {
                this.hotspots[i].layout (x0, y0, zoomFactor);
            }            
        };
        
        this.setMaxTiles = function (mtx, mty) {
        };
        
        /**
         * Adds a hotspot to the layer. 
         *
         * @param {bigshot.Hotspot} hotspot the hotspot to add.
         */
        this.addHotspot = function (hotspot) {
            this.container.appendChild (hotspot.getElement ());
            this.hotspots.push (hotspot);
        };
        
        this.resize (0, 0);
        return bigshot.object.extend (new bigshot.Layer (), this);
    }
    
    /**
     * Creates a new image layer.
     * 
     * @param {bigshot.Image} image the image that this layer is part of
     * @param {bigshot.ImageParameters} parameters the associated image parameters
     * @param {number} w the current width in css pixels of the viewport
     * @param {number} h the current height in css pixels of the viewport
     * @param {bigshot.ImageTileCache} itc the tle cache to use
     * @class A tiled, zoomable image layer.
     * @constructor
     */
    bigshot.TileLayer = function (image, parameters, w, h, itc) {
        this.rows = new Array ();
        this.browser = new bigshot.Browser ();
        this.container = image.createLayerContainer ();
        this.parentContainer = image.getContainer ();
        this.parameters = parameters;
        this.w = w;
        this.h = h;
        this.imageTileCache = itc;
        
        this.getContainer = function () {
            return this.container;
        };
        
        this.resize = function (w, h) {
            this.container.style.width = this.parentContainer.clientWidth + "px";
            this.container.style.height = this.parentContainer.clientHeight + "px";
            
            this.w = w;
            this.h = h;
            this.rows = new Array ();
            this.browser.removeAllChildren (this.container);
            for (var r = 0; r < h; ++r) {
                var row = new Array ();
                for (var c = 0; c < w; ++c) {
                    var tileAnchor = document.createElement ("div");
                    tileAnchor.style.position = "absolute";
                    tileAnchor.style.overflow = "hidden";
                    tileAnchor.style.width = this.container.clientWidth + "px";
                    tileAnchor.style.height = this.container.clientHeight + "px";
                    
                    var tile = document.createElement ("div");
                    tile.style.position = "relative";
                    tile.style.visibility = "hidden";
                    tile.style.border = "hidden";
                    row.push (tile);
                    this.container.appendChild (tileAnchor);
                    tileAnchor.appendChild (tile);
                }
                this.rows.push (row);
            }
        };
        
        this.layout = function (zoom, x0, y0, tx0, ty0, size, stride, opacity) {
            zoom = Math.min (0, Math.ceil (zoom));
            this.imageTileCache.resetUsed ();
            var y = y0;
            for (var r = 0; r < this.h; ++r) {
                var x = x0;
                for (var c = 0; c < this.w; ++c) {
                    var tile = this.rows[r][c];
                    tile.style.left = x + "px";
                    tile.style.top = y + "px";
                    tile.style.visibility = "";
                    tile.style.width = size + "px";
                    tile.style.height = size + "px";
                    tile.style.opacity = opacity;
                    this.browser.removeAllChildren (tile);
                    var tx = c + tx0;
                    var ty = r + ty0;
                    if (this.parameters.wrapX) {
                        if (tx < 0 || tx >= this.imageTileCache.maxTileX) {
                            tx = (tx + this.imageTileCache.maxTileX) % this.imageTileCache.maxTileX;
                        }
                    }
                    
                    if (this.parameters.wrapY) {
                        if (ty < 0 || ty >= this.imageTileCache.maxTileY) {
                            ty = (ty + this.imageTileCache.maxTileY) % this.imageTileCache.maxTileY;
                        }
                    }
                    var image = this.imageTileCache.getImage (tx, ty, zoom);
                    image.style.width = size + "px";
                    image.style.height = size + "px";
                    tile.appendChild (image);
                    x += stride;
                }
                y += stride;
            }
        };
        
        this.setMaxTiles = function (mtx, mty) {
            this.imageTileCache.setMaxTiles (mtx, mty);
        };
        this.resize (w, h);
        return this;
    };
    
    /**
     * Creates a new, empty, LRUMap instance.
     * 
     * @class Implementation of a Least-Recently-Used cache map.
     * Used by the ImageTileCache to keep track of cache entries.
     * @constructor
     */
    bigshot.LRUMap = function () {
        /** 
         * Key to last-accessed time mapping.
         *
         * @type Object
         */
        this.keyToTime = {};
        
        /**
         * Current time counter. Incremented for each access of
         * a key in the map.
         * @type int
         */
        this.counter = 0;
        
        /** 
         * Current size of the map.
         * @type int
         */
        this.size = 0;
        
        /**
         * Marks access to an item, represented by its key in the map. 
         * The key's last-accessed time is updated to the current time
         * and the current time is incremented by one step.
         *
         * @param {String} key the key associated with the accessed item
         */
        this.access = function (key) {
            this.remove (key);
            this.keyToTime[key] = this.counter;
            ++this.counter;
            ++this.size;
        };
        
        /**
         * Removes a key from the map.
         *
         * @param {String} key the key to remove
         * @returns true iff the key existed in the map.
         * @type boolean
         */
        this.remove = function (key) {
            if (this.keyToTime[key]) {
                delete this.keyToTime[key];
                --this.size;
                return true;
            } else {
                return false;
            }
        };
        
        /**
         * Returns the current number of keys in the map.
         * @type int
         */
        this.getSize = function () {
            return this.size;
        };
        
        /**
         * Returns the key in the map with the lowest
         * last-accessed time. This is done as a linear
         * search through the map. It could be done much 
         * faster with a sorted map, but unless this becomes
         * a bottleneck it is just not worth the effort.
         * @type String
         */
        this.leastUsed = function () {
            var least = this.counter + 1;
            var leastKey = null;
            for (var k in this.keyToTime) {
                if (this.keyToTime[k] < least) {
                    least = this.keyToTime[k];
                    leastKey = k;
                }
            }
            return leastKey;
        };
    };
    
    /**
     * Creates a new cache instance.
     *
     * @class Tile cache for the {@link bigshot.TileLayer}.
     * @constructor
     */
    bigshot.ImageTileCache = function (onLoaded, parameters) {
        /**
          * Reduced-resolution preview of the full image.
          * Loaded from the "poster" image created by 
          * MakeImagePyramid
          *
          * @private
          * @type HTMLImageElement
          */
        this.fullImage = document.createElement ("img");
        this.fullImage.src = parameters.fileSystem.getPosterFilename ();
        
        /**
         * Maximum number of tiles in the cache.
         * @private
         * @type int
         */
        this.maxCacheSize = 512;
        this.maxTileX = 0;
        this.maxTileY = 0;
        this.cachedImages = {};
        this.requestedImages = {};
        this.usedImages = {};
        this.lastOnLoadFiredAt = 0;
        this.imageRequests = 0;
        this.lruMap = new bigshot.LRUMap ();
        this.onLoaded = onLoaded;
        this.browser = new bigshot.Browser ();
        this.partialImageSize = parameters.tileSize / 8;
        
        this.resetUsed = function () {
            this.usedImages = {};
        };
        
        this.setMaxTiles = function (mtx, mty) {
            this.maxTileX = mtx;
            this.maxTileY = mty;
        };
        
        this.getPartialImage = function (tileX, tileY, zoomLevel) {
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
                
                var tileSizeAtZoom = posterScale * parameters.tileSize / Math.pow (2, zoomLevel);    
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
                var tile = document.createElement ("img");
                tile.src = canvas.toDataURL ();
                return tile;
            } else {
                return null;
            }
        };
        
        this.getEmptyImage = function () {
            var tile = document.createElement ("img");
            if (parameters.emptyImage) {
                tile.src = parameters.emptyImage;
            } else {
                tile.src = "data:image/gif,GIF89a%01%00%01%00%80%00%00%00%00%00%FF%FF%FF!%F9%04%00%00%00%00%00%2C%00%00%00%00%01%00%01%00%00%02%02D%01%00%3B";
            }
            return tile;
        };
        
        this.getImage = function (tileX, tileY, zoomLevel) {
            if (tileX < 0 || tileY < 0 || tileX >= this.maxTileX || tileY >= this.maxTileY) {
                return this.getEmptyImage ();
            }
            
            var key = this.getImageKey (tileX, tileY, zoomLevel);
            this.lruMap.access (key);
            
            if (this.cachedImages[key]) {
                if (this.usedImages[key]) {
                    var tile = document.createElement ("img");
                    tile.src = this.getImageFilename (tileX, tileY, zoomLevel);
                    return tile;
                } else {
                    this.usedImages[key] = true;
                    return this.cachedImages[key];
                }
            } else {
                var img = this.getPartialImage (tileX, tileY, zoomLevel);
                if (img != null) {
                    this.cachedImages[key] = img;
                } else {
                    img = this.getEmptyImage ();
                }
                this.requestImage (tileX, tileY, zoomLevel);
                return img;
            }
        };
        
        this.requestImage = function (tileX, tileY, zoomLevel) {
            var key = this.getImageKey (tileX, tileY, zoomLevel);
            if (!this.requestedImages[key]) {
                this.imageRequests++;
                var tile = document.createElement ("img");
                var that = this;
                this.browser.registerListener (tile, "load", function () {                        
                        that.cachedImages[key] = tile;
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
        
        /**
         * Removes the least-recently used objects from the cache,
         * if the size of the cache exceeds the maximum cache size.
         * A maximum of four objects will be removed per call.
         *
         * @private
         */
        this.purgeCache = function () {
            for (var i = 0; i < 4; ++i) {
                if (this.lruMap.getSize () > this.maxCacheSize) {
                    var leastUsed = this.lruMap.leastUsed ();
                    this.lruMap.remove (leastUsed);
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
    
    /**
     * Abstract interface description for a Layer.
     *
     * @class Abstract interface description for a layer.
     * @constructor
     */
    bigshot.Layer = function () {
        /**
         * Returns the layer container.
         *
         * @type HTMLDivElement
         */
        this.getContainer = function () {};
        
        /**
         * Sets the maximum number of image tiles that will be visible in the image.
         *
         * @param {int} x the number of tiles horizontally
         * @param {int} y the number of tiles vertically
         */
        this.setMaxTiles = function (x, y) {};
        
        /**
         * Called when the image's viewport is resized.
         *
         * @param {int} w the new width of the viewport, in css pixels
         * @param {int} h the new height of the viewport, in css pixels
         */
        this.resize = function (w, h) {};
        
        /**
         * Lays out the layer.
         *
         * @param {number} zoom the zoom level
         * @param {number} x0 the x-coordinate of the top-left corner of the top-left tile
         * @param {number} y0 the y-coordinate of the top-left corner of the top-left tile
         * @param {number} tx0 column number (starting at zero) of the top-left tile
         * @param {number} ty0 row number (starting at zero) of the top-left tile
         * @param {number} size tileSize
         * @param {number} stride offset (vertical and horizontal) from the top-left corner
         *                 of a tile to the next tile's top-left corner.
         * @param {number} opacity the opacity of the layer.
         */
        this.layout = function (zoom, x0, y0, tx0, ty0, size, stride, opacity) {};
        
        return this;
    };
    
    /**
     * Creates a new image parameter object and populates it with default values for
     * all values not explicitly given.
     *
     * @class ImageParameters parameter object.
     * You need not set any fields that can be read from the image descriptor that 
     * MakeImagePyramid creates. See the {@link bigshot.Image} and {@link bigshot.VRPanorama}
     * documentation for required parameters.
     *
     * <p>Usage:
     *
     * @example
     * var bsi = new bigshot.Image (
     *     new bigshot.ImageParameters ({
     *         basePath : "/bigshot.php?file=myshot.bigshot",
     *         fileSystemType : "archive",
     *         container : document.getElementById ("bigshot_div")
     *         }));
     * 
     * var bvr = new bigshot.VRPanorama (
     *     new bigshot.ImageParameters ({
     *         basePath : "/bigshot.php?file=myvr.bigshot",
     *         fileSystemType : "archive",
     *         container : document.getElementById ("bigshot_canvas")
     *         }));
     * @param values named parameter map, see the fields below for parameter names and types.
     * @see bigshot.Image
     * @see bigshot.VRPanorama
     */
    bigshot.ImageParameters = function (values) {
        /**
         * Size of low resolution preview image along the longest image
         * dimension. The preview is assumed to have the same aspect
         * ratio as the full image (specified by width and height).
         *
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         * @type int
         * @public
         */
        this.posterSize = 0;
        
        /**
         * Url for the image tile to show while the tile is loading and no 
         * low-resolution preview is available.
         *
         * @default <code>null</code>, which results in an all-black image
         * @type String
         * @public
         */
        this.emptyImage = null;
        
        /**
         * Suffix to append to the tile filenames. Typically <code>".jpg"</code> or 
         * <code>".png"</code>.
         *
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         * @type String
         */
        this.suffix = null;
        
        /**
         * The width of the full image; in pixels.
         *
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         * @type int
         */
        this.width = 0;
        
        /**
         * The height of the full image; in pixels.
         *
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         * @type int
         */
        this.height = 0;
        
        /**
         * For {@link bigshot.Image}, the {@code div} to use as a container for the image.
         * For {@link bigshot.VRPanorama}, the {@code canvas} to render into.
         *
         * @type HTMLDivElement or HTMLCanvasElement
         */
        this.container = null;
        
        /**
         * The minimum zoom value. Zoom values are specified as a magnification; where
         * 2<sup>n</sup> is the magnification and n is the zoom value. So a zoom value of
         * 2 means a 4x magnification of the full image. -3 means showing an image that
         * is a quarter (1/8 or 1/2<sup>3</sup>) of the full size.
         *
         * @type number
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         */
        this.minZoom = 0.0;
        
        /**
         * Size of one tile in pixels.
         *
         * @type int
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         */
        this.tileSize = 0;
        
        /**
         * Tile overlap. Not implemented.
         *
         * @type int
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         */
        this.overlap = 0;
        
        /**
         * Flag indicating that the image should wrap horizontally. The image wraps on tile
         * boundaries; so in order to get a seamless wrap at zoom level -n; the image width must
         * be evenly divisible by <code>tileSize * 2^n</code>. Set the minZoom value appropriately.
         * 
         * @type boolean
         * @default false
         */
        this.wrapX = false;
        
        /**
         * Flag indicating that the image should wrap vertically. The image wraps on tile
         * boundaries; so in order to get a seamless wrap at zoom level -n; the image height must
         * be evenly divisible by <code>tileSize * 2^n</code>. Set the minZoom value appropriately.
         *
         * @type boolean
         * @default false
         */
        this.wrapY = false;
        
        /**
         * Base path for the image. This is filesystem dependent; but for the two most common cases
         * the following should be set
         *
         * <ul>
         * <li><b>archive</b>= The basePath is <code>"&lt;path&gt;/bigshot.php?file=&lt;path-to-bigshot-archive-relative-to-bigshot.php&gt;"</code>;
         *     for example; <code>"/bigshot.php?file=images/bigshot-sample.bigshot"</code>.
         * <li><b>folder</b>= The basePath is <code>"&lt;path-to-image-folder&gt;"</code>;
         *     for example; <code>"/images/bigshot-sample"</code>.
         * </ul>
         *
         * @type String
         */
        this.basePath = null;
        
        /**
         * The file system type. Used to create a filesystem instance unless
         * the fileSystem field is set. Possible values are <code>"archive"</code>, 
         * <code>"folder"</code> or <code>"dzi"</code>.
         *
         * @type String
         * @default "folder"
         */
        this.fileSystemType = "folder";
        
        /**
         * A reference to a filesystem implementation. If set; it overrides the
         * fileSystemType field.
         *
         * @default set depending on value of bigshot.ImageParameters.fileSystemType
         * @type bigshot.FileSystem
         */
        this.fileSystem = null;
        
        /**
         * Enable the touch-friendly ui. The touch-friendly UI splits the viewport into
         * three click-sensitive regions:
         * <p style="text-align:center"><img src="../images/touch-ui.png"/></p>
         * 
         * <p>Clicking (or tapping with a finger) on the outer region causes the viewport to zoom out.
         * Clicking anywhere within the middle, "pan", region centers the image on the spot clicked.
         * Finally, clicking in the center hotspot will center the image on the spot clicked and zoom
         * in half a zoom level.
         *
         * <p>As before, you can drag to pan anywhere.
         *
         * <p>If you have navigation tools for mouse users that hover over the image container, it 
         * is recommended that any click events on them are kept from bubbling, otherwise the click 
         * will propagate to the touch ui. One way is to use the 
         * {@link bigshot.Browser#stopMouseEventBubbling} method:
         *
         * @example
         * var browser = new bigshot.Browser ();
         * browser.stopMouseEventBubbling (document.getElementById ("myBigshotControlDiv"));
         *
         * @see bigshot.Image#showTouchUI
         *
         * @type boolean
         * @default true
         */
        this.touchUI = true;
        
        if (values) {
            for (var k in values) {
                this[k] = values[k];
            }
        }
        
        this.merge = function (values, overwrite) {
            for (var k in values) {
                if (overwrite || !this[k]) {
                    this[k] = values[k];
                }
            }
        }
        return this;        
    };
    
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
        this.isFullScreen = false;
        this.exitFullScreenHandler = null;
        
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
            if (this.dragStart != null) {
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
        
        /**
         * Forces exit from full screen mode, if we're there.
         * @public
         */
        this.exitFullScreen = function () {
            if (!this.isFullScreen) {
                this.exitFullScreenHandler ();
                this.exitFullScreenHandler = null;
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
    
    /**
     * Abstract filesystem definition.
     *
     * @class Abstract filesystem definition.
     */
    bigshot.FileSystem = function () {
        /**
         * Returns the URL filename for the given filesystem entry.
         *
         * @param {String} name the entry name
         */
        this.getFilename = function (name) {};
        
        /**
         * Returns the entry filename for the given tile.
         * 
         * @param {int} tileX the column of the tile
         * @param {int} tileY the row of the tile
         * @param {int} zoomLevel the zoom level
         */
        this.getImageFilename = function (tileX, tileY, zoomLevel) {};
        
        /**
         * Sets an optional prefix that is prepended, along with a forward
         * slash ("/"), to all names.
         *
         * @param {String} prefix the prefix
         */
        this.setPrefix = function (prefix) {};
        
        /**
         * Returns an image descriptor object from the descriptor file.
         *
         * @return a descriptor object
         */
        this.getDescriptor = function () {};
        
        /**
         * Returns the poster URL filename. For Bigshot images this is
         * typically the URL corresponding to the entry "poster.jpg", 
         * but for other filesystems it can be different.
         */
        this.getPosterFilename = function () {};
    };
    
    /**
     * Creates a new instance of a folder-based filesystem adapter.
     *
     * @augments bigshot.FileSystem
     * @class Folder-based filesystem.
     * @param {bigshot.ImageParameters or bigshot.VRPanoramaParameters} parameters the associated image parameters
     * @constructor
     */
    bigshot.FolderFileSystem = function (parameters) {
        this.prefix = null;
        this.suffix = "";
        
        this.getDescriptor = function () {
            this.browser = new bigshot.Browser ();
            var req = this.browser.createXMLHttpRequest ();
            
            req.open("GET", this.getFilename ("descriptor"), false);   
            req.send(null); 
            var descriptor = {};
            if(req.status == 200) {
                var substrings = req.responseText.split (":");
                for (var i = 0; i < substrings.length; i += 2) {
                    if (substrings[i] == "suffix") {
                        descriptor[substrings[i]] = substrings[i + 1];
                    } else {
                        descriptor[substrings[i]] = parseInt (substrings[i + 1]);
                    }
                }
                this.suffix = descriptor.suffix;
                return descriptor;
            } else {
                throw new Error ("Unable to find descriptor.");
            }
        }
        
        this.getPosterFilename = function () {
            return this.getFilename ("poster" + this.suffix);
        }
        
        this.setPrefix = function (prefix) {
            this.prefix = prefix;
        }
        
        this.getPrefix = function () {
            if (this.prefix) {
                return this.prefix + "/";
            } else {
                return "";
            }
        }
        
        this.getFilename = function (name) {
            return parameters.basePath + "/" + this.getPrefix () + name;
        };
        
        this.getImageFilename = function (tileX, tileY, zoomLevel) {
            var key = (-zoomLevel) + "/" + tileX + "_" + tileY + this.suffix;
            return this.getFilename (key);
        };
    };
    
    /**
     * Creates a new instance of a Deep Zoom Image folder-based filesystem adapter.
     *
     * @augments bigshot.FileSystem
     * @class Folder-based filesystem.
     * @param {bigshot.ImageParameters or bigshot.VRPanoramaParameters} parameters the associated image parameters
     * @constructor
     */
    bigshot.DeepZoomImageFileSystem = function (parameters) {
        this.prefix = "";
        this.suffix = "";
        
        this.DZ_NAMESPACE = "http://schemas.microsoft.com/deepzoom/2009";
        this.fullZoomLevel = 0;
        this.posterName = "";
        
        this.getDescriptor = function () {
            this.browser = new bigshot.Browser ();
            var req = this.browser.createXMLHttpRequest ();
            
            req.open("GET", parameters.basePath + this.prefix + ".xml", false);   
            req.send(null); 
            var descriptor = {};
            if(req.status == 200) {
                var xml = req.responseXML;
                var image = xml.getElementsByTagName ("Image")[0];
                var size = xml.getElementsByTagName ("Size")[0];
                descriptor.width = parseInt (size.getAttribute ("Width"));
                descriptor.height = parseInt (size.getAttribute ("Height"));
                descriptor.tileSize = parseInt (image.getAttribute ("TileSize"));
                descriptor.overlap = parseInt (image.getAttribute ("Overlap"));
                descriptor.suffix = "." + image.getAttribute ("Format")
                descriptor.posterSize = descriptor.tileSize;
                
                this.suffix = descriptor.suffix;
                this.fullZoomLevel = Math.ceil (Math.log (Math.max (descriptor.width, descriptor.height)) / Math.LN2);
                
                descriptor.minZoom = -this.fullZoomLevel;
                var posterZoomLevel = Math.ceil (Math.log (descriptor.tileSize) / Math.LN2);
                this.posterName = this.getImageFilename (0, 0, posterZoomLevel - this.fullZoomLevel);
                return descriptor;
            } else {
                throw new Error ("Unable to find descriptor.");
            }
        }
        
        this.setPrefix = function (prefix) {
            this.prefix = prefix;
        };
        
        this.getPosterFilename = function () {
            return this.posterName;
        };
        
        this.getFilename = function (name) {
            return parameters.basePath + this.prefix + "/" + name;
        };
        
        this.getImageFilename = function (tileX, tileY, zoomLevel) {
            var dziZoomLevel = this.fullZoomLevel + zoomLevel;
            var key = dziZoomLevel + "/" + tileX + "_" + tileY + this.suffix;
            return this.getFilename (key);
        };
    };
    
    /**
     * Creates a new instance of a <code>.bigshot</code> archive filesystem adapter.
     * 
     * @class Bigshot archive filesystem.
     * @param {bigshot.ImageParameters or bigshot.VRPanoramaParameters} parameters the associated image parameters
     * @augments bigshot.FileSystem
     * @constructor
     */     
    bigshot.ArchiveFileSystem = function (parameters) {
        this.indexSize = 0;
        this.offset = 0;
        this.index = {};
        this.prefix = "";
        this.suffix = "";
        
        this.getDescriptor = function () {
            this.browser = new bigshot.Browser ();
            var req = this.browser.createXMLHttpRequest ();
            
            req.open("GET", this.getFilename ("descriptor"), false);   
            req.send(null); 
            var descriptor = {};
            if(req.status == 200) {
                var substrings = req.responseText.split (":");
                for (var i = 0; i < substrings.length; i += 2) {
                    if (substrings[i] == "suffix") {
                        descriptor[substrings[i]] = substrings[i + 1];
                    } else {
                        descriptor[substrings[i]] = parseInt (substrings[i + 1]);
                    }
                }
                this.suffix = descriptor.suffix;
                return descriptor;
            } else {
                throw new Error ("Unable to find descriptor.");
            }
        }
        
        this.getPosterFilename = function () {
            return this.getFilename ("poster" + this.suffix);
        }
        
        this.getFilename = function (name) {
            name = this.getPrefix () + name;
            if (!this.index[name] && console) {
                console.log ("Can't find " + name);
            }
            var f = parameters.basePath + "&start=" + this.index[name].start + "&length=" + this.index[name].length;
            if (name.substring (name.length - 4) == ".jpg") {
                f = f + "&type=image/jpeg";
            } else if (name.substring (name.length - 4) == ".png") {
                f = f + "&type=image/png";
            } else {
                f = f + "&type=text/plain";
            }
            return f;
        };
        
        this.getImageFilename = function (tileX, tileY, zoomLevel) {
            var key = (-zoomLevel) + "/" + tileX + "_" + tileY + this.suffix;
            return this.getFilename (key);
        };
        
        this.getPrefix = function () {
            if (this.prefix) {
                return this.prefix + "/";
            } else {
                return "";
            }
        }
        
        
        this.setPrefix = function (prefix) {
            this.prefix = prefix;
        }        
        
        var browser = new bigshot.Browser ();
        var req = browser.createXMLHttpRequest ();
        req.open("GET", parameters.basePath + "&start=0&length=24&type=text/plain", false);   
        req.send(null);  
        if(req.status == 200) {
            if (req.responseText.substring (0, 7) != "BIGSHOT") {
                alert ("\"" + parameters.basePath + "\" is not a valid bigshot file");
                return;
            }
            this.indexSize = parseInt (req.responseText.substring (8), 16);
            this.offset = this.indexSize + 24;
            
            req.open("GET", parameters.basePath + "&type=text/plain&start=24&length=" + this.indexSize, false);   
            req.send(null);  
            if(req.status == 200) {
                var substrings = req.responseText.split (":");
                for (var i = 0; i < substrings.length; i += 3) {
                    this.index[substrings[i]] = {
                        start : parseInt (substrings[i + 1]) + this.offset,
                        length : parseInt (substrings[i + 2])
                    };
                }
            } else {
                alert ("The index of \"" + parameters.basePath + "\" could not be loaded: " + req.status);
            }
        } else {
            alert ("The header of \"" + parameters.basePath + "\" could not be loaded: " + req.status);
        }
        return this;
    }
    
    /**
     * Sets up a filesystem instance in the given parameters object, if none exist.
     * If the {@link bigshot.ImageParameters#fileSystem} member isn't set, the 
     * {@link bigshot.ImageParameters#fileSystemType} member is used to create a new 
     * {@link bigshot.FileSystem} instance and set it.
     *
     * @param {bigshot.ImageParameters or bigshot.VRPanoramaParameters} parameters the parameters object to populate
     */
    bigshot.setupFileSystem = function (parameters) {
        if (!parameters.fileSystem) {
            if (parameters.fileSystemType == "archive") {
                parameters.fileSystem = new bigshot.ArchiveFileSystem (parameters);
            } else if (parameters.fileSystemType == "dzi") {
                parameters.fileSystem = new bigshot.DeepZoomImageFileSystem (parameters);
            } else {
                parameters.fileSystem = new bigshot.FolderFileSystem (parameters);
            }
        }
    }
    
    /**
     * Creates a new cache instance.
     *
     * @class Tile texture cache for a {@link bigshot.VRFace}.
     * @param {function()} onLoaded function that is called whenever a texture tile has been
     * loaded.
     * @param {bigshot.VRPanoramaParameters} image parameters
     * @param {bigshot.WebGL} _webGl WebGL instance to use
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
        this.fullImage.src = parameters.fileSystem.getPosterFilename ();
        
        /**
         * Maximum number of WebGL textures in the cache. This is the
         * "L1" cache.
         *
         * @private
         * @type int
         */
        this.maxTextureCacheSize = 512;
        
        /**
         * Maximum number of HTMLImageElement images in the cache. This is the
         * "L2" cache.
         *
         * @private
         * @type int
         */
        this.maxImageCacheSize = 2048;
        this.cachedTextures = {};
        this.cachedImages = {};
        this.requestedImages = {};
        this.lastOnLoadFiredAt = 0;
        this.imageRequests = 0;
        this.partialImageSize = parameters.tileSize / 8;
        this.imageLruMap = new bigshot.LRUMap ();
        this.textureLruMap = new bigshot.LRUMap ();
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
                var ctx = canvas.getContext ("2d"); 
                
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
                
                return this.webGl.createImageTextureFromImage (canvas, parameters.textureMinFilter, parameters.textureMagFilter);
            } else {
                return null;
            }
        };
        
        
        this.getTexture = function (tileX, tileY, zoomLevel) {
            var key = this.getImageKey (tileX, tileY, zoomLevel);
            this.textureLruMap.access (key);
            this.imageLruMap.access (key);
            
            if (this.cachedTextures[key]) {
                return this.cachedTextures[key];
            } else if (this.cachedImages[key]) {
                this.cachedTextures[key] = this.webGl.createImageTextureFromImage (this.cachedImages[key], parameters.textureMinFilter, parameters.textureMagFilter);
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
                        that.cachedImages[key] = tile;
                        that.cachedTextures[key] = that.webGl.createImageTextureFromImage (tile, parameters.textureMinFilter, parameters.textureMagFilter);
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
        
        this.purge = function () {
            var that = this;
            this.purgeCache (this.textureLruMap, this.cachedTextures, this.maxTextureCacheSize, function (leastUsedKey) {
                    that.webGl.gl.deleteTexture (that.cachedTextures[leastUsedKey]);
                });
            this.purgeCache (this.imageLruMap, this.cachedImages, this.maxImageCacheSize, function (leastUsedKey) {
                });
        }
        
        this.purgeCache = function (lruMap, cache, maxCacheSize, onEvict) {
            for (var i = 0; i < 64; ++i) {
                if (lruMap.getSize () > maxCacheSize) {
                    var leastUsed = lruMap.leastUsed ();
                    lruMap.remove (leastUsed);
                    if (onEvict) {
                        onEvict (leastUsed);
                    }                    
                    delete cache[leastUsed];
                } else {
                    break;
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
     * @class a VR cube face. The {@link bigshot.VRPanorama} instance holds
     * six of these.
     *
     * @param {bigshot.VRPanorama} owner the VR panorama this face is part of.
     * @param {String} key the identifier for the face. "f" is front, "b" is back, "u" is
     * up, "d" is down, "l" is left and "r" is right.
     * @param {point} topLeft_ the top-left corner of the quad.
     * @param {number} width_ the length of the sides of the face, expressed in multiples of u and v.
     * @param {vector} u basis vector going from the top left corner along the top edge of the face
     * @param {vector} v basis vector going from the top left corner along the left edge of the face
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
        this.parameters.fileSystem.setPrefix ("face_" + key);
        
        this.browser = new bigshot.Browser ();
        
        this.parameters.merge (this.parameters.fileSystem.getDescriptor (), false);
        
        /**
         * Utility function to do a multiply-and-add of a 3d point.
         *
         * @private
         * @param p {point} the point to multiply
         * @param m {number} the number to multiply the elements of p with
         * @param a {point} the point to add
         * @return p * m + a
         */
        this.pt3dMultAdd = function (p, m, a) {
            return {
                x : p.x * m + a.x,
                y : p.y * m + a.y,
                z : p.z * m + a.z
            };
        };
        
        /**
         * Utility function to do an element-wise multiply of a 3d point.
         *
         * @private
         * @param p {point} the point to multiply
         * @param m {number} the number to multiply the elements of p with
         * @return p * m
         */
        this.pt3dMult = function (p, m) {
            return {
                x : p.x * m,
                y : p.y * m,
                z : p.z * m
            };
        };
        
        /**
         * Texture cache.
         *
         * @private
         */
        this.tileCache = new bigshot.TileTextureCache (function () { 
                that.updated = true;
                owner.renderUpdated ();
            }, this.parameters, this.owner.webGl);
        
        this.fullSize = this.parameters.width;
        this.overlap = this.parameters.overlap;
        this.tileSize = this.parameters.tileSize;
        
        this.minDivisions = 0;
        var fullZoom = Math.log (this.fullSize - this.overlap) / Math.LN2;
        var singleTile = Math.log (this.tileSize - this.overlap) / Math.LN2;
        this.maxDivisions = Math.floor (fullZoom - singleTile);
        
        /**
         * Creates a textured quad.
         *
         * @private
         */
        this.generateFace = function (scene, topLeft, width, tx, ty, divisions) {
            width *= this.tileSize / (this.tileSize - this.overlap);
            var texture = this.tileCache.getTexture (tx, ty, -this.maxDivisions + divisions);
            scene.addQuad (new bigshot.WebGLTexturedQuad (
                    topLeft,
                    this.pt3dMult (this.u, width),
                    this.pt3dMult (this.v, width),
                    texture
                )
            );
        }
        
        this.VISIBLE_NONE = 0;
        this.VISIBLE_SOME = 1;
        this.VISIBLE_ALL = 2;
        
        /**
         * Tests whether the point is in the axis-aligned rectangle.
         * 
         * @private
         * @param point the point
         * @param min top left corner of the rectangle
         * @param max bottom right corner of the rectangle
         */
        this.pointInRect = function (point, min, max) {
            return (point.x >= min.x && point.y >= min.y && point.x < max.x && point.y < max.y);
        }
        
        /**
         * Intersects a quadrilateral with the view frustum.
         * The test is a simple rectangle intersection of the AABB of
         * the transformed quad with the WebGL viewport.
         *
         * @private
         * @return VISIBLE_NONE, VISIBLE_SOME or VISIBLE_ALL
         */
        this.intersectWithView = function (transformed) {
            var numNull = 0;
            for (var i = 0; i < transformed.length; ++i) {
                if (transformed[i] == null) {
                    numNull++;
                }
            }
            if (numNull == 4) {
                return this.VISIBLE_NONE;
            }
            if (numNull > 0) {
                return this.VISIBLE_SOME;
            }
            
            var min = {
                x : transformed[0].x,
                y : transformed[0].y
            };
            var max = {
                x : transformed[0].x,
                y : transformed[0].y
            };
            
            var viewMin = {
                x : 0,
                y : 0
            };
            var viewMax = {
                x : this.owner.webGl.gl.viewportWidth,
                y : this.owner.webGl.gl.viewportHeight
            };
            
            var pointsInViewport = 0;
            for (var i = 0; i < transformed.length; ++i) {
                min.x = Math.min (min.x, transformed[i].x);
                min.y = Math.min (min.y, transformed[i].y);
                
                max.x = Math.max (max.x, transformed[i].x);
                max.y = Math.max (max.y, transformed[i].y);
                
                if (this.pointInRect (transformed[i], viewMin, viewMax)) {
                    pointsInViewport++;
                }
            }
            
            if (pointsInViewport == 4) {
                return this.VISIBLE_ALL;
            }
            
            var imin = {
                x : Math.max (min.x, viewMin.x),
                y : Math.max (min.y, viewMin.y)
            };
            
            var imax = {
                x : Math.min (max.x, viewMax.x),
                y : Math.min (max.y, viewMax.y)
            };
            
            if (imin.x < imax.x && imin.y < imax.y) {
                return this.VISIBLE_SOME;
            }            
            
            return this.VISIBLE_NONE;
        }
        
        /**
         * Quick and dirty computation of the on-screen distance in pixels
         * between two 2d points. We use the max of the x and y differences.
         * In case a point is null (that is, it's not on the screen), we 
         * return an arbitrarily high number.
         *
         * @private
         */
        this.screenDistance = function (p0, p1) {
            if (p0 == null || p1 == null) {
                // arbitrarily high number, because I don't really
                // want to use Inf or NaN unless I must.
                return 1000000;
            }
            return Math.max (Math.abs (p0.x - p1.x), Math.abs (p0.y - p1.y));
        }
        
        /**
         * Optionally subdivides a quad into fourn new quads, depending on the
         * position and on-screen size of the quad.
         *
         * @private
         * @param {bigshot.WebGLTexturedQuadScene} scene the scene to add quads to
         * @param {point} topLeft the top left corner of this quad
         * @param {number} width the sides of the quad, expressed in multiples of u and v
         * @param {int} divisions the current number of divisions done (increases by one for each
         * split-in-four).
         * @param {int} tx the tile column this face is in
         * @param {int} ty the tile row this face is in 
         */
        this.generateSubdivisionFace = function (scene, topLeft, width, divisions, tx, ty) {
            var bottomLeft = this.pt3dMultAdd (this.v, width, topLeft);
            var topRight = this.pt3dMultAdd (this.u, width, topLeft);
            var bottomRight = this.pt3dMultAdd (this.u, width, bottomLeft);
            
            var transformed = [
                this.owner.webGl.transformToScreen ([topLeft.x, topLeft.y, topLeft.z]),
                this.owner.webGl.transformToScreen ([topRight.x, topRight.y, topRight.z]),
                this.owner.webGl.transformToScreen ([bottomRight.x, bottomRight.y, bottomRight.z]),
                this.owner.webGl.transformToScreen ([bottomLeft.x, bottomLeft.y, bottomLeft.z])
            ];
            
            var numVisible = this.intersectWithView (transformed);
            
            if (numVisible == this.VISIBLE_NONE) {
                return;
            }
            
            var dmax = 0;
            for (var i = 0; i < transformed.length; ++i) {
                var next = (i + 1) % 4;
                dmax = Math.max (this.screenDistance (transformed[i], transformed[next]));
            }
            
            if (divisions < this.minDivisions 
                    || 
                    (
                        (
                            dmax > this.owner.maxTextureMagnification * (this.tileSize - this.overlap) 
                        ) && divisions < this.maxDivisions
                    )
                ) {
                    var center = this.pt3dMultAdd ({x: this.u.x + this.v.x, y: this.u.y + this.v.y, z: this.u.z + this.v.z }, width / 2, topLeft);
                    var midTop = this.pt3dMultAdd (this.u, width / 2, topLeft);
                    var midLeft = this.pt3dMultAdd (this.v, width / 2, topLeft);
                    this.generateSubdivisionFace (scene, topLeft, width / 2, divisions + 1, tx * 2, ty * 2);
                    this.generateSubdivisionFace (scene, midTop, width / 2, divisions + 1, tx * 2 + 1, ty * 2);
                    this.generateSubdivisionFace (scene, midLeft, width / 2, divisions + 1, tx * 2, ty * 2 + 1);
                    this.generateSubdivisionFace (scene, center, width / 2, divisions + 1, tx * 2 + 1, ty * 2 + 1);
                } else {
                    this.generateFace (scene, topLeft, width, tx, ty, divisions);
                }
        }
        
        /**
         * Tests if the face has had any updated texture
         * notifications from the tile cache.
         *
         * @public
         */
        this.isUpdated = function () {
            return this.updated;
        };
        
        /**
         * Renders this face into a scene.
         * 
         * @public
         * @param {bigshot.WebGLTexturedQuadScene} scene the scene to render into
         */
        this.render = function (scene) {
            this.updated = false;
            this.generateSubdivisionFace (scene, this.topLeft, this.width, 0, 0, 0);
        }
        
        /**
         * Performs post-render cleanup.
         */
        this.endRender = function () {
            this.tileCache.purge ();
        }
    }
    
    /**
     * @class WebGL utility functions.
     */
    bigshot.webglutil = {
        /**
         * Flag indicating whether we want to wrap the WebGL context in a 
         * WebGLDebugUtils.makeDebugContext. Defaults to false.
         * 
         * @type boolean
         * @public
         */
        debug : false,
        
        /**
         * List of context identifiers WebGL may be accessed via.
         *
         * @type String[]
         * @private
         */
        contextNames : ["webgl", "experimental-webgl"],
        
        /**
         * Utility function for creating a context given a canvas and 
         * a context identifier.
         * @type WebGLRenderingContext
         * @private
         */
        createContext0 : function (canvas, context) {
            var gl = this.debug
                ?
                WebGLDebugUtils.makeDebugContext(canvas.getContext(context))
            :
            canvas.getContext (context);
            return gl;
        },
        
        /**
         * Creates a WebGL context for the given canvas, if possible.
         *
         * @public
         * @type WebGLRenderingContext
         * @param {HTMLCanvasElement} canvas the canvas
         * @return The WebGL context
         * @throws {Error} If WebGL isn't supported.
         */
        createContext : function (canvas) {
            for (var i = 0; i < this.contextNames.length; ++i) {
                try {
                    var gl = this.createContext0 (canvas, this.contextNames[i]);
                    if (gl) {
                        return gl;
                    }
                } catch (e) {
                }
            }
            throw new Error ("Could not initialize WebGL.");
        },
        
        /**
         * Tests whether WebGL is supported.
         *
         * @type boolean
         * @public
         * @return true If WebGL is supported, false otherwise.
         */
        isWebGLSupported : function () {
            var canvas = document.createElement ("canvas");
            if (!canvas["width"]) {
                // Not even canvas support
                return false;
            }
            
            try {
                this.createContext (canvas);
                return true;
            } catch (e) {
                // No WebGL support
                return false;
            }
        }
    }
    
    /**
     * Creates a new WebGL wrapper instance.
     *
     * @class WebGL wrapper for common {@link bigshot.VRPanorama} uses.
     * @param {HTMLCanvasElement} canvas_ the canvas
     * @see #onresize()
     */
    bigshot.WebGL = function (canvas_) {
        
        this.canvas = canvas_;
        
        this.gl = bigshot.webglutil.createContext (this.canvas); 
        
        /**
         * Must be called when the canvas element is resized.
         *
         * @public
         */
        this.onresize = function () {
            this.gl.viewportWidth = this.canvas.width;
            this.gl.viewportHeight = this.canvas.height;
        }
        
        this.onresize ();
        
        /**
         * Fragment shader. Taken from the "Learning WebGL" lessons:
         *     http://learningwebgl.com/blog/?p=571
         */
        this.fragmentShader = 
            "#ifdef GL_ES\n" + 
            "    precision highp float;\n" + 
            "#endif\n" + 
            "\n" + 
            "varying vec2 vTextureCoord;\n" + 
            "\n" + 
            "uniform sampler2D uSampler;\n" + 
            "\n" + 
            "void main(void) {\n" + 
            "    gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));\n" + 
            "}\n";
        
        /**
         * Vertex shader. Taken from the "Learning WebGL" lessons:
         *     http://learningwebgl.com/blog/?p=571
         */
        this.vertexShader = 
            "attribute vec3 aVertexPosition;\n" +
            "attribute vec2 aTextureCoord;\n" +
            "\n" +
            "uniform mat4 uMVMatrix;\n" +
            "uniform mat4 uPMatrix;\n" +
            "\n" +
            "varying vec2 vTextureCoord;\n" +
            "\n" +
            "void main(void) {\n" +
            "    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\n" +
            "    vTextureCoord = aTextureCoord;\n" +
            "}";
        
        /**
         * Creates a new shader.
         *
         * @type WebGLShader
         * @param {String} source the source code
         * @param {int} type the shader type, one of WebGLRenderingContext.FRAGMENT_SHADER or 
         * WebGLRenderingContext.VERTEX_SHADER
         */
        this.createShader = function (source, type) {
            var shader = this.gl.createShader (type);
            this.gl.shaderSource (shader, source);
            this.gl.compileShader (shader);
            
            if (!this.gl.getShaderParameter (shader, this.gl.COMPILE_STATUS)) {
                alert (this.gl.getShaderInfoLog (shader));
                return null;
            }
            
            return shader;
        };
        
        /**
         * Creates a new fragment shader.
         *
         * @type WebGLShader
         * @param {String} source the source code
         */
        this.createFragmentShader = function (source) {
            return this.createShader (source, this.gl.FRAGMENT_SHADER);
        };
        
        /**
         * Creates a new vertex shader.
         *
         * @type WebGLShader
         * @param {String} source the source code
         */
        this.createVertexShader = function (source) {
            return this.createShader (source, this.gl.VERTEX_SHADER);
        };
        
        /**
         * The current shader program.
         */
        this.shaderProgram = null;
        
        /**
         * Initializes the shaders.
         */
        this.initShaders = function () {
            this.shaderProgram = this.gl.createProgram ();
            this.gl.attachShader (this.shaderProgram, this.createVertexShader (this.vertexShader));
            this.gl.attachShader (this.shaderProgram, this.createFragmentShader (this.fragmentShader));
            this.gl.linkProgram (this.shaderProgram);
            
            if (!this.gl.getProgramParameter (this.shaderProgram, this.gl.LINK_STATUS)) {
                throw new Error ("Could not initialise shaders");
                return;
            }
            
            this.gl.useProgram (this.shaderProgram);
            
            this.shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation (this.shaderProgram, "aVertexPosition");
            this.gl.enableVertexAttribArray (this.shaderProgram.vertexPositionAttribute);
            
            this.shaderProgram.textureCoordAttribute = this.gl.getAttribLocation (this.shaderProgram, "aTextureCoord");
            this.gl.enableVertexAttribArray (this.shaderProgram.textureCoordAttribute);
            
            this.shaderProgram.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
            this.shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
            this.shaderProgram.samplerUniform = this.gl.getUniformLocation(this.shaderProgram, "uSampler");
        };
        
        /**
         * The current object-to-world transform matrix.
         *
         * @type Matrix
         */
        this.mvMatrix = null;
        
        /**
         * The object-to-world transform matrix stack.
         *
         * @type Matrix[]
         */
        this.mvMatrixStack = [];
        
        /**
         * Pushes the current world transform onto the stack
         * and returns a new, identical one.
         *
         * @return the new world transform matrix
         * @param {Matrix} [matrix] the new world transform. 
         * If omitted, the current is used
         * @type Matrix
         */
        this.mvPushMatrix = function (matrix) {
            if (matrix) {
                this.mvMatrixStack.push (matrix.dup());
                this.mvMatrix = matrix.dup();
                return mvMatrix;
            } else {
                this.mvMatrixStack.push (this.mvMatrix.dup());
                return mvMatrix;
            }
        }
        
        /**
         * Pops the last-pushed world transform off the stack, thereby restoring it.
         *
         * @type Matrix
         * @return the previously-pushed matrix
         */
        this.mvPopMatrix = function () {
            if (this.mvMatrixStack.length == 0) {
                throw new Error ("Invalid popMatrix!");
            }
            this.mvMatrix = this.mvMatrixStack.pop();
            return mvMatrix;
        }
        
        /**
         * Resets the world transform to the identity transform.
         */
        this.mvReset = function () {
            this.mvMatrix = Matrix.I(4);
        }
        
        /**
         * Multiplies the current world transform with a matrix.
         *
         * @param {Matrix} matrix the matrix to multiply with
         */
        this.mvMultiply = function (matrix) {
            this.mvMatrix = this.mvMatrix.x (matrix);
        }
        
        /**
         * Adds a translation to the world transform matrix.
         *
         * @param {number[3]} vector the translation vector
         */
        this.mvTranslate = function (vector) {
            var m = Matrix.Translation($V([vector[0], vector[1], vector[2]])).ensure4x4 ();
            this.mvMultiply (m);
        }
        
        /**
         * Adds a rotation to the world transform matrix.
         *
         * @param {number} ang the angle in degrees to rotate
         * @param {number[3]} vector the rotation vector
         */
        this.mvRotate = function (ang, vector) {
            var arad = ang * Math.PI / 180.0;
            var m = Matrix.Rotation(arad, $V([vector[0], vector[1], vector[2]])).ensure4x4 ();
            this.mvMultiply (m);
        }
        
        this.pMatrix = null;
        
        /**
         * Sets the perspective transformation matrix.
         *
         * @param {number} fovy vertical field of view
         * @param {number} aspect viewport aspect ratio
         * @param {number} znear near image plane
         * @param {number} zfar far image plane
         */
        this.perspective = function (fovy, aspect, znear, zfar) {
            this.pMatrix = makePerspective (fovy, aspect, znear, zfar);
        }
        
        /**
         * Sets the matrix parameters ("uniforms", since the variables are declared as uniform) in the shaders.
         */
        this.setMatrixUniforms = function () {
            this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, new Float32Array(this.pMatrix.flatten()));
            this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, new Float32Array(this.mvMatrix.flatten()));
        }
        
        /**
         * Creates a texture from an image.
         *
         * @param {HTMLImageElement or HTMLCanvasElement} image the image
         * @type WebGLTexture
         * @return An initialized texture
         */
        this.createImageTextureFromImage = function (image, minFilter, magFilter) {
            var texture = this.gl.createTexture();
            this.handleImageTextureLoaded (this, texture, image, minFilter, magFilter);
            return texture;
        }
        
        /**
         * Creates a texture from a source url.
         *
         * @param {String} source the URL of the image
         * @return WebGLTexture
         */
        this.createImageTextureFromSource = function (source, minFilter, magFilter) {
            var image = new Image();
            var texture = this.gl.createTexture();
            
            var that = this;
            image.onload = function () {
                that.handleImageTextureLoaded (that, texture, image, minFilter, magFilter);
            }
            
            image.src = source;
            
            return texture;
        }
        
        /**
         * Uploads the image data to the texture memory. Called when the texture image
         * has finished loading.
         *
         * @private
         */
        this.handleImageTextureLoaded = function (that, texture, image, minFilter, magFilter) {
            that.gl.bindTexture(that.gl.TEXTURE_2D, texture);        
            that.gl.texImage2D(that.gl.TEXTURE_2D, 0, that.gl.RGBA, that.gl.RGBA, that.gl.UNSIGNED_BYTE, image);
            that.gl.texParameteri(that.gl.TEXTURE_2D, that.gl.TEXTURE_MAG_FILTER, magFilter ? magFilter : that.gl.NEAREST);
            that.gl.texParameteri(that.gl.TEXTURE_2D, that.gl.TEXTURE_MIN_FILTER, minFilter ? minFilter : that.gl.NEAREST);
            that.gl.texParameteri(that.gl.TEXTURE_2D, that.gl.TEXTURE_WRAP_S, that.gl.CLAMP_TO_EDGE);
            that.gl.texParameteri(that.gl.TEXTURE_2D, that.gl.TEXTURE_WRAP_T, that.gl.CLAMP_TO_EDGE);
            if (minFilter == that.gl.NEAREST_MIPMAP_NEAREST
                    || minFilter == that.gl.LINEAR_MIPMAP_NEAREST
                        || minFilter == that.gl.NEAREST_MIPMAP_LINEAR
                        || minFilter == that.gl.LINEAR_MIPMAP_LINEAR) {
                            that.gl.generateMipmap(that.gl.TEXTURE_2D);
                        }
            
            that.gl.bindTexture(that.gl.TEXTURE_2D, null);      
        }
        
        /**
         * Transforms a vector to world coordinates.
         *
         * @param {vector} vector the vector to transform
         */
        this.transformToWorld = function (vector) {
            var sylvesterVector = $V([vector[0], vector[1], vector[2], 1.0]);
            var world = this.mvMatrix.x (sylvesterVector);
            return world;
        }
        
        /**
         * Transforms a vector to screen coordinates.
         *
         * @param {vector} vector the vector to transform
         * @return the transformed vector, or null if the vector is nearer than the near-z plane.
         */
        this.transformToScreen = function (vector) {
            var world = this.transformToWorld (vector);
            if (world.e(3) > 0) {
                return null;
            }
            
            var screen = this.pMatrix.x (world);
            if (Math.abs (screen.e(4)) < Sylvester.precision) {
                return null;
            }
            var r = {
                x: (this.gl.viewportWidth / 2) * screen.e(1) / screen.e(4) + this.gl.viewportWidth / 2, 
                y: - (this.gl.viewportHeight / 2) * screen.e(2) / screen.e(4) + this.gl.viewportHeight / 2,
                toString : function () {
                    return this.x + "," + this.y;
                }
            };
            return r;
        }
    };
    
    /**
     * Creates a textured quad object.
     *
     * @class An abstraction for textured quads. Used in the
     * {@link bigshot.WebGLTexturedQuadScene}.
     *
     * @param {point} p the top-left corner of the quad
     * @param {vector} u vector pointing from p along the top edge of the quad
     * @param {vector} v vector pointing from p along the left edge of the quad
     * @param {WebGLTexture} the texture to use.
     */
    bigshot.WebGLTexturedQuad = function (p, u, v, texture) {
        this.p = p;
        this.u = u;
        this.v = v;
        this.texture = texture;
        
        /**
         * Renders the quad using the given {@link bigshot.WebGL} instance.
         * Currently creates, fills, draws with and then deletes three buffers -
         * not very efficient, but works.
         *
         * @param {bigshot.WebGL} webGl the WebGL wrapper instance to use for rendering.
         */
        this.render = function (webGl) {
            var vertexPositionBuffer = webGl.gl.createBuffer();
            webGl.gl.bindBuffer(webGl.gl.ARRAY_BUFFER, vertexPositionBuffer);
            var vertices = [
                this.p.x, this.p.y,  this.p.z,
                this.p.x + this.u.x, this.p.y + this.u.y,  this.p.z + this.u.z,
                this.p.x + this.u.x + this.v.x, this.p.y + this.u.y + this.v.y,  this.p.z + this.u.z + this.v.z,
                this.p.x + this.v.x, this.p.y + this.v.y,  this.p.z + this.v.z
            ];
            webGl.gl.bufferData(webGl.gl.ARRAY_BUFFER, new Float32Array (vertices), webGl.gl.STATIC_DRAW);
            
            
            var textureCoordBuffer = webGl.gl.createBuffer();
            webGl.gl.bindBuffer(webGl.gl.ARRAY_BUFFER, textureCoordBuffer);
            var textureCoords = [
                // Front face
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0
            ];
            webGl.gl.bufferData(webGl.gl.ARRAY_BUFFER, new Float32Array (textureCoords), webGl.gl.STATIC_DRAW);
            
            var vertexIndexBuffer = webGl.gl.createBuffer();
            webGl.gl.bindBuffer(webGl.gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);            
            var vertexIndexes = [
                0, 2, 1,
                0, 3, 2
            ];
            webGl.gl.bufferData(webGl.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array (vertexIndexes), webGl.gl.STATIC_DRAW);
            
            webGl.gl.bindBuffer(webGl.gl.ARRAY_BUFFER, textureCoordBuffer);
            webGl.gl.vertexAttribPointer(webGl.shaderProgram.textureCoordAttribute, 2, webGl.gl.FLOAT, false, 0, 0);
            
            webGl.gl.bindBuffer(webGl.gl.ARRAY_BUFFER, vertexPositionBuffer);
            webGl.gl.vertexAttribPointer(webGl.shaderProgram.vertexPositionAttribute, 3, webGl.gl.FLOAT, false, 0, 0);
            
            webGl.gl.activeTexture(webGl.gl.TEXTURE0);
            webGl.gl.bindTexture(webGl.gl.TEXTURE_2D, this.texture);
            webGl.gl.uniform1i(webGl.shaderProgram.samplerUniform, 0);
            
            webGl.gl.bindBuffer(webGl.gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
            webGl.setMatrixUniforms();
            webGl.gl.drawElements(webGl.gl.TRIANGLES, 6, webGl.gl.UNSIGNED_SHORT, 0);
            
            webGl.gl.deleteBuffer (vertexPositionBuffer);
            webGl.gl.deleteBuffer (vertexIndexBuffer);
            webGl.gl.deleteBuffer (textureCoordBuffer);
        };
    }
    
    /**
     * Creates a textured quad scene.
     *
     * @param {bigshot.WebGL} webGl the webGl instance to use for rendering.
     *
     * @class A "scene" consisting of a number of quads, all with
     * a unique texture. Used by the {@link bigshot.VRPanorama} to render the VR cube.
     *
     * @see bigshot.WebGLTexturedQuad
     */
    bigshot.WebGLTexturedQuadScene = function (webGl) {
        this.quads = new Array ();
        this.webGl = webGl;
        
        /** 
         * Adds a new quad to the scene.
         */
        this.addQuad = function (quad) {
            this.quads.push (quad);
        }
        
        /** 
         * Renders all quads.
         */
        this.render = function () {
            for (var i = 0; i < this.quads.length; ++i) {
                this.quads[i].render (this.webGl);
            }
        };
    };
    
    /**
     * Creates a new VR panorama parameter object and populates it with default values for
     * all values not explicitly given.
     *
     * @class VRPanoramaParameters parameter object.
     * You need not set any fields that can be read from the image descriptor that 
     * MakeImagePyramid creates. See the {@link bigshot.VRPanorama}
     * documentation for required parameters.
     *
     * <p>Usage:
     *
     * @example
     * var bvr = new bigshot.VRPanorama (
     *     new bigshot.VRPanoramaParameters ({
     *         basePath : "/bigshot.php?file=myvr.bigshot",
     *         fileSystemType : "archive",
     *         container : document.getElementById ("bigshot_canvas")
     *         }));
     * @param values named parameter map, see the fields below for parameter names and types.
     * @see bigshot.VRPanorama
     */
    bigshot.VRPanoramaParameters = function (values) {
        /**
         * Size of low resolution preview image along the longest image
         * dimension. The preview is assumed to have the same aspect
         * ratio as the full image (specified by width and height).
         *
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         * @type int
         * @public
         */
        this.posterSize = 0;
        
        /**
         * Url for the image tile to show while the tile is loading and no 
         * low-resolution preview is available.
         *
         * @default <code>null</code>, which results in an all-black image
         * @type String
         * @public
         */
        this.emptyImage = null;
        
        /**
         * Suffix to append to the tile filenames. Typically <code>".jpg"</code> or 
         * <code>".png"</code>.
         *
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         * @type String
         */
        this.suffix = null;
        
        /**
         * The width of the full image; in pixels.
         *
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         * @type int
         */
        this.width = 0;
        
        /**
         * The height of the full image; in pixels.
         *
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         * @type int
         */
        this.height = 0;
        
        /**
         * For {@link bigshot.VRPanorama}, the {@code canvas} to render into.
         *
         * @type HTMLDivElement or HTMLCanvasElement
         */
        this.container = null;
        
        /**
         * The minimum zoom value. Zoom values are specified as a magnification; where
         * 2<sup>n</sup> is the magnification and n is the zoom value. So a zoom value of
         * 2 means a 4x magnification of the full image. -3 means showing an image that
         * is a quarter (1/8 or 1/2<sup>3</sup>) of the full size.
         *
         * @type number
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         */
        this.minZoom = 0.0;
        
        /**
         * Size of one tile in pixels.
         *
         * @type int
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         */
        this.tileSize = 0;
        
        /**
         * Tile overlap. Not implemented.
         *
         * @type int
         * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
         */
        this.overlap = 0;
        
        /**
         * Base path for the image. This is filesystem dependent; but for the two most common cases
         * the following should be set
         *
         * <ul>
         * <li><b>archive</b>= The basePath is <code>"&lt;path&gt;/bigshot.php?file=&lt;path-to-bigshot-archive-relative-to-bigshot.php&gt;"</code>;
         *     for example; <code>"/bigshot.php?file=images/bigshot-sample.bigshot"</code>.
         * <li><b>folder</b>= The basePath is <code>"&lt;path-to-image-folder&gt;"</code>;
         *     for example; <code>"/images/bigshot-sample"</code>.
         * </ul>
         *
         * @type String
         */
        this.basePath = null;
        
        /**
         * The file system type. Used to create a filesystem instance unless
         * the fileSystem field is set. Possible values are <code>"archive"</code>, 
         * <code>"folder"</code> or <code>"dzi"</code>.
         *
         * @type String
         * @default "folder"
         */
        this.fileSystemType = "folder";
        
        /**
         * A reference to a filesystem implementation. If set; it overrides the
         * fileSystemType field.
         *
         * @default set depending on value of bigshot.VRPanoramaParameters#fileSystemType
         * @type bigshot.FileSystem
         */
        this.fileSystem = null;
        
        /**
         * The maximum magnification for the texture tiles making up the VR cube.
         * Used for level-of-detail tesselation.
         * A value of 1.0 means that textures will never be stretched (one texture pixel will
         * always be at most one screen pixel), unless there is no more detailed texture available. 
         * A value of 2.0 means that textures may be stretched at most 2x (one texture pixel 
         * will always be at most 2x2 screen pixels)
         * The bigger the value, the less texture data is required, but quality suffers.
         *
         * @type number
         * @default 1.0
         */
        this.maxTextureMagnification = 1.0;
        
        /**
         * The WebGL texture filter to use for magnifying textures. 
         * Possible values are all values valid for <code>TEXTURE_MAG_FILTER</code>.
         * <code>null</code> means <code>NEAREST</code>. 
         *
         * @default null / NEAREST.
         */
        this.textureMagFilter = null;
        
        /**
         * The WebGL texture filter to use for supersampling (minifying) textures. 
         * Possible values are all values valid for <code>TEXTURE_MIN_FILTER</code>.
         * <code>null</code> means <code>NEAREST</code>. 
         *
         * @default null / NEAREST.
         */
        this.textureMinFilter = null;
        
        /**
         * Minimum vertical field of view in degrees.
         *
         * @default 2.0
         * @type number
         */
        this.minFov = 2.0;
        
        /**
         * Maximum vertical field of view in degrees.
         *
         * @default 90.0
         * @type number
         */
        this.maxFov = 90;
        
        /**
         * Minimum pitch in degrees.
         *
         * @default -90
         * @type number
         */
        this.minPitch = -90;
        
        /**
         * Maximum pitch in degrees.
         *
         * @default 90.0
         * @type number
         */
        this.maxPitch = 90;
        
        /**
         * Minimum yaw in degrees. The number is interpreted modulo 360.
         * The default value, -360, is just to make sure that we won't accidentally
         * trip it. If the number is set to something in the interval 0-360,
         * the autoRotate function will pan back and forth.
         *
         * @default -360
         * @type number
         */
        this.minYaw = -360;
        
        /**
         * Maximum yaw in degrees. The number is interpreted modulo 360.
         * The default value, 720, is just to make sure that we won't accidentally
         * trip it. If the number is set to something in the interval 0-360,
         * the autoRotate function will pan back and forth.
         *
         * @default 720.0
         * @type number
         */
        this.maxYaw = 720;
        
        
        /**
         * Enable the touch-friendly ui. The touch-friendly UI splits the viewport into
         * three click-sensitive regions:
         * <p style="text-align:center"><img src="../images/touch-ui.png"/></p>
         * 
         * <p>Clicking (or tapping with a finger) on the outer region causes the viewport to zoom out.
         * Clicking anywhere within the middle, "pan", region centers the image on the spot clicked.
         * Finally, clicking in the center hotspot will center the image on the spot clicked and zoom
         * in half a zoom level.
         *
         * <p>As before, you can drag to pan anywhere.
         *
         * <p>If you have navigation tools for mouse users that hover over the image container, it 
         * is recommended that any click events on them are kept from bubbling, otherwise the click 
         * will propagate to the touch ui. One way is to use the 
         * {@link bigshot.Browser#stopMouseEventBubbling} method:
         *
         * @example
         * var browser = new bigshot.Browser ();
         * browser.stopMouseEventBubbling (document.getElementById ("myBigshotControlDiv"));
         *
         * @see bigshot.Image#showTouchUI
         *
         * @type boolean
         * @default true
         */
        this.touchUI = true;
        
        if (values) {
            for (var k in values) {
                this[k] = values[k];
            }
        }
        
        this.merge = function (values, overwrite) {
            for (var k in values) {
                if (overwrite || !this[k]) {
                    this[k] = values[k];
                }
            }
        }
        return this;        
    };
    
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
        this.hotspots = [];
        
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
            * Field of view (vertical) in degrees.
            */
            fov : 45
        };
        
        /**
         * WebGL wrapper.
         * @private
         * @type bigshot.WebGL
         */
        this.webGl = new bigshot.WebGL (this.container);
        this.webGl.initShaders();
        this.webGl.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.webGl.gl.blendFunc (this.webGl.gl.ONE, this.webGl.gl.ZERO);
        this.webGl.gl.enable (this.webGl.gl.BLEND);
        this.webGl.gl.disable(this.webGl.gl.DEPTH_TEST);
        
        
        this.webGl.gl.clearDepth(1.0);
        
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
        this.beginRender = function () {
            this.webGl.gl.viewport (0, 0, this.webGl.gl.viewportWidth, this.webGl.gl.viewportHeight);
            
            this.webGl.perspective (this.state.fov, this.webGl.gl.viewportWidth / this.webGl.gl.viewportHeight, 0.1, 100.0);
            this.webGl.mvReset ();
            
            this.webGl.mvTranslate ([0.0, 0.0, 0.0]);
            
            this.webGl.mvRotate (this.state.p, [1, 0, 0]);
            this.webGl.mvRotate (this.state.y, [0, 1, 0]);
        }
        
        /**
         * If set, called at the end of every render.
         *
         * @event
         * @type function()
         */
        this.onrender = null;
        
        /**
         * Performs per-render cleanup.
         */
        this.endRender = function () {
            for (var f in this.vrFaces) {
                this.vrFaces[f].endRender ();
            }
            if (this.onrender) {
                this.onrender ();
            }
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
            
            for (var i = 0; i < this.hotspots.length; ++i) {
                this.hotspots[i].layout ();
            }
            
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
            
            for (var i = 0; i < this.hotspots.length; ++i) {
                this.hotspots[i].layout ();
            }
            
            this.endRender ();
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
        this.dragMode = this.DRAG_PAN;
        
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
        }
        
        this.dragMouseUp = function (e) {
            this.dragStart = null;
            this.smoothRotate ();
        }
        
        this.dragMouseMove = function (e) {
            if (this.dragStart != null) {
                if (this.dragMode == this.DRAG_GRAB) {
                    this.smoothRotate ();
                    var scale = this.state.fov / this.container.height;
                    var dx = e.clientX - this.dragStart.clientX;
                    var dy = e.clientY - this.dragStart.clientY;
                    this.setYaw (this.getYaw () - dx * scale);
                    this.setPitch (this.getPitch () - dy * scale);
                    this.render ();
                    this.dragStart = e;
                } else {
                    var scale = 0.1 * this.state.fov / this.container.height;
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
        
        this.mouseDoubleClick = function (e) {
            var pos = this.browser.getElementPosition (this.container);
            this.smoothRotateToXY (e.clientX - pos.x, e.clientY - pos.y);
        }
        
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
            var halfHeight = this.container.height / 2;
            
            var minFaceHeight = this.vrFaces[0].parameters.height;
            for (var i in this.vrFaces) {
                minFaceHeight = Math.min (minFaceHeight, this.vrFaces[i].parameters.height);
            }
            
            var edgeSizeY = this.parameters.maxTextureMagnification * minFaceHeight / 2;
            
            var wy = halfHeight / edgeSizeY;
            
            var mz = Math.atan (wy) * 180 / Math.PI;
            
            return mz * 2;
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
            var halfHeight = this.container.height / 2;
            var halfWidth = this.container.width / 2;
            var x = (x - halfWidth);
            var y = (y - halfHeight);
            
            var edgeSizeY = Math.tan ((this.state.fov / 2) * Math.PI / 180);
            var edgeSizeX = edgeSizeY * this.container.width / this.container.height;
            
            var wy = y * edgeSizeY / halfHeight;
            var wx = x * edgeSizeX / halfWidth;
            
            var dpitch = Math.atan (wy) * 180 / Math.PI;
            var dyaw = Math.atan (wx) * 180 / Math.PI;
            
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
                    window.setTimeout (stepper, 5);
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
         *
         * @param {function()} [onClose] function that is called when the user 
         * exits full-screen mode
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
         * @private
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
        this.vrFaces = new Array ();
        this.vrFaces[0] = new bigshot.VRFace (this, "f", {x:-1, y:1, z:-1}, 2.0, {x:1, y:0, z:0}, {x:0, y:-1, z:0});
        this.vrFaces[1] = new bigshot.VRFace (this, "b", {x:1, y:1, z:1}, 2.0, {x:-1, y:0, z:0}, {x:0, y:-1, z:0});
        this.vrFaces[2] = new bigshot.VRFace (this, "l", {x:-1, y:1, z:1}, 2.0, {x:0, y:0, z:-1}, {x:0, y:-1, z:0});
        this.vrFaces[3] = new bigshot.VRFace (this, "r", {x:1, y:1, z:-1}, 2.0, {x:0, y:0, z:1}, {x:0, y:-1, z:0});
        this.vrFaces[4] = new bigshot.VRFace (this, "u", {x:-1, y:1, z:1}, 2.0, {x:1, y:0, z:0}, {x:0, y:0, z:-1});
        this.vrFaces[5] = new bigshot.VRFace (this, "d", {x:-1, y:-1, z:-1}, 2.0, {x:1, y:0, z:0}, {x:0, y:0, z:1});
        
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
        this.browser.registerListener (parameters.container, "touchend", function (e) {
                that.mouseDoubleClick (translateEvent (e));
                return consumeEvent (e);
            }, false);
        this.browser.registerListener (window, 'resize', this.onresizeHandler, false);
        
        this.setPitch (0.0);
        this.setYaw (0.0);
        this.setFov (45.0);
    }
    
    /**
     * Abstract base class for panorama hotspots.
     *
     * @class Abstract base class for panorama hotspots.
     *
     * A Hotspot is simply an HTML element that is moved / hidden etc.
     * to overlay a given position in the panorama.
     *
     * @param {bigshot.VRPanorama} panorama the panorama to attach this hotspot to
     */
    bigshot.VRHotspot = function (panorama) {
        /**
         * Hides the hotspot if less than <code>frac</code> of its area is visible.
         * 
         * @param {number} frac the fraction (0.0 - 1.0) of the hotspot that must be visible for
         * it to be shown.
         * @type function(p,s)
         */
        this.CLIP_FRACTION = function (frac) {
            return function (p, s) {
                var r = {
                    x0 : Math.max (p.x, 0),
                    y0 : Math.max (p.y, 0),
                    x1 : Math.min (p.x + s.w, panorama.webGl.gl.viewportWidth),
                    y1 : Math.min (p.y + s.h, panorama.webGl.gl.viewportHeight)
                };
                var full = s.w * s.h;
                var visible = Math.abs ((r.x1 - r.x0) * (r.y1 - r.y0));
                
                return (visible / full) >= frac;
            }
        }
        
        /**
         * Hides the hotspot if its center is outside the viewport.
         * 
         * @type function(p,s)
         */
        this.CLIP_CENTER = function () {
            return function (p, s) {
                var c = {
                    x : p.x + s.w / 2,
                    y : p.y + s.h / 2
                };
                return c.x >= 0 && c.x < panorama.webGl.gl.viewportWidth && 
                    c.y >= 0 && c.y < panorama.webGl.gl.viewportHeight;
            }
        }
        
        /**
         * Resizes the hotspot to fit in the viewport. Hides the hotspot if 
         * it is completely outside the viewport.
         * 
         * @type function(p,s)
         */
        this.CLIP_ADJUST = function () {
            return function (p, s) {
                if (p.x < 0) {
                    s.w -= -p.x;
                    p.x = 0;
                }
                if (p.y < 0) {
                    s.h -= -p.y;
                    p.y = 0;
                }
                if (p.x + s.w > panorama.webGl.gl.viewportWidth) {
                    s.w = panorama.webGl.gl.viewportWidth - p.x - 1;
                }
                if (p.y + s.h > panorama.webGl.gl.viewportHeight) {
                    s.h = panorama.webGl.gl.viewportHeight - p.y - 1;
                }
                
                return s.w > 0 && s.h > 0;
            }
        }

        /**
         * The method to use for dealing with hotspots that extend outside the 
         * viewport. Note that {@link #CLIP_ADJUST} et al are functions, not constants.
         * To set the value, you must call the function to get a clipping strategy:
         *
         * @example
         * var hotspot = ...;
         * // note the function call below ---------------v
         * hotspot.clippingStrategy = hotspot.CLIP_ADJUST ();
         *
         * @see bigshot.VRHotspot#CLIP_ADJUST
         * @see bigshot.VRHotspot#CLIP_CENTER
         * @see bigshot.VRHotspot#CLIP_FRACTION
         * @type function(p,s)
         * @default bigshot.VRHotspot#CLIP_ADJUST
         */
        this.clippingStrategy = this.CLIP_ADJUST ();
        
        /**
         * Layout and resize the hotspot. Called by the panorama.
         */
        this.layout = function () {};
        
        /**
         * Helper function to rotate a point around an axis.
         *
         * @param {number} ang the angle
         * @param {number[3]} vector the vector to rotate around
         * @param {Vector} point the point
         * @type Vector
         * @private
         */
        this.rotate = function (ang, vector, point) {
            var arad = ang * Math.PI / 180.0;
            var m = Matrix.Rotation(arad, $V([vector[0], vector[1], vector[2]])).ensure4x4 ();
            return m.x (point);
        }
        
        /**
         * Converts the polar coordinates to world coordinates.
         * The distance is assumed to be 1.0.
         *
         * @param yaw the yaw, in degrees
         * @param pitch the pitch, in degrees
         * @type number[3]
         */
        this.toVector = function (yaw, pitch) {
            var point = $V([0, 0, -1, 1]);
            point = this.rotate (-yaw, [0, 1, 0], point);
            point = this.rotate (-pitch, [1, 0, 0], point);
            return [point.e(1), point.e(2), point.e(3)];
        }
        
        /**
         * Converts the world-coordinate point p to screen coordinates.
         *
         * @param {number[3]} p the world-coordinate point
         * @type point
         */
        this.toScreen = function (p) {
            return panorama.webGl.transformToScreen (p);
        }
        
        /**
         * Clips the hotspot against the viewport. Both parameters 
         * are in/out. Clipping is done by adjusting the values of the
         * parameters.
         *
         * @param {point} p the top-left corner of the hotspot, in pixels.
         * @param {size} s the width and height of the hotspot, in pixels
         * @type boolean
         * @return true if the hotspot is visible, false otherwise
         */
        this.clip = function (p, s) {
            return this.clippingStrategy (p, s);
        }
    }
    
    /**
     * Creates a new point-hotspot and attaches it to a VR panorama.
     *
     * @class A VR panorama point-hotspot.
     *
     * A Hotspot is simply an HTML element that is moved / hidden etc.
     * to overlay a given position in the panorama. The element is moved
     * by setting its <code>style.top</code> and <code>style.left</code>
     * values.
     *
     * @augments bigshot.VRHotspot
     * @param {bigshot.VRPanorama} panorama the panorama to attach this hotspot to
     * @param {number} yaw the yaw coordinate of the hotspot
     * @param {number} pitch the pitch coordinate of the hotspot
     * @param {HTMLElement} element the HTML element
     * @param {number} offsetX the offset to add to the screen coordinate corresponding
     * to the hotspot's polar coordinates. Use this to center the hotspot horizontally.
     * @param {number} offsetY the offset to add to the screen coordinate corresponding
     * to the hotspot's polar coordinates. Use this to center the hotspot vertically.
     */
    bigshot.VRPointHotspot = function (panorama, yaw, pitch, element, offsetX, offsetY) {
        this.layout = function () {
            var p = this.toScreen ();
            
            var visible = false;
            if (p != null) {
                var s = panorama.browser.getElementSize (element);
                
                p.x += offsetX;
                p.y += offsetY;
                
                if (this.clip (p, s)) {
                    element.style.top = (p.y + offsetY) + "px";
                    element.style.left = (p.x + offsetX) + "px";
                    element.style.visibility = "inherit";
                    visible = true;
                }
            }
            
            if (!visible) {
                element.style.visibility = "hidden";
            }
        }
        
        /**
         * Initializer
         *
         * @private
         */
        this.initialize = function () {
            this.point = this.toVector (yaw, pitch);
            return this;
        }
        
        return bigshot.object.extend (new bigshot.VRHotspot (panorama), this).initialize ();
    }
    
    /**
     * Creates a new rectangular hotspot and attaches it to a VR panorama.
     *
     * @class A rectangular VR panorama hotspot.
     *
     * A rectangular hotspot is simply an HTML element that is moved / resized / hidden etc.
     * to overlay a given rectangle in the panorama. The element is moved
     * by setting its <code>style.top</code> and <code>style.left</code>
     * values, and resized by setting its <code>style.width</code> and <code>style.height</code>
     * values.
     *
     * @augments bigshot.VRHotspot
     * @param {bigshot.VRPanorama} panorama the panorama to attach this hotspot to
     * @param {number} yaw0 the yaw coordinate of the top-left corner of the hotspot
     * @param {number} pitch0 the pitch coordinate of the top-left corner of the hotspot
     * @param {number} yaw1 the yaw coordinate of the bottom-right corner of the hotspot
     * @param {number} pitch1 the pitch coordinate of the bottom-right corner of the hotspot
     * @param {HTMLElement} element the HTML element
     */
    bigshot.VRRectangleHotspot = function (panorama, yaw0, pitch0, yaw1, pitch1, element) {
        this.layout = function () {
            var p = this.toScreen (this.point0);
            var p1 = this.toScreen (this.point1);
            
            
            
            var visible = false;
            if (p != null && p1 != null) {
                var s = {
                    w : p1.x - p.x,
                    h : p1.y - p.y
                };
                
                if (this.clip (p, s)) {
                    element.style.top = (p.y) + "px";
                    element.style.left = (p.x) + "px";
                    element.style.width = (s.w) + "px";
                    element.style.height = (s.h) + "px";
                    element.style.visibility = "inherit";
                    visible = true;
                }
            }
            
            if (!visible) {
                element.style.visibility = "hidden";
            }
        }
        
        /**
         * Initializer
         *
         * @private
         */
        this.initialize = function () {
            this.point0 = this.toVector (yaw0, pitch0);
            this.point1 = this.toVector (yaw1, pitch1);
            
            return this;
        }
        
        return bigshot.object.extend (new bigshot.VRHotspot (panorama), this).initialize ();
    }
}