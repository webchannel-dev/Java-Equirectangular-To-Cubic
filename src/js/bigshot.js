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
     * The two classes that are needed for zoomable images are:
     *
     * <ul>
     * <li>{@link bigshot.Image}: The main class for making zoomable images. See the class docs
     *     for a tutorial.
     * <li>{@link bigshot.ImageParameters}: Parameters for zoomable images. See 
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
         */
        this.removeAllChildren = function (element) {
            if (element.children.length > 0) {
                for (var i = element.children.length - 1; i >= 0; --i) {
                    element.removeChild (element.children[i]);
                }
            }
        };
        
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
        
        this.unregisterListener = function (elem, eventName, fn, useCapture) {
            if (typeof (elem.removeEventListener) != 'undefined') {
                elem.removeEventListener (eventName, fn, useCapture);
            } else if (typeof (elem.detachEvent) != 'undefined') {
                elem.detachEvent('on' + eventName, fn);
            }
        };
        
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
        
        this.stopEventBubbling = function (eventObject) {
            if (eventObject) {
                if (eventObject.stopPropagation) {
                    eventObject.stopPropagation ();
                } else { 
                    eventObject.cancelBubble = true; 
                }
            }
        };
        
        this.stopEventBubblingHandler = function () {
            var that = this;
            return function (event) {
                that.stopEventBubbling (event);
                return false;
            };
        }
        
        this.stopMouseEventBubbling = function (element) {
            this.registerListener (element, "mousedown", this.stopEventBubblingHandler (), false);
            this.registerListener (element, "mouseup", this.stopEventBubblingHandler (), false);
            this.registerListener (element, "mousemove", this.stopEventBubblingHandler (), false);
        };
        
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
        this.fullImage.src = parameters.fileSystem.getFilename ("poster" + parameters.suffix);
        
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
        
        this.resetUsed = function () {
            this.usedImages = {};
        };
        
        this.setMaxTiles = function (mtx, mty) {
            this.maxTileX = mtx;
            this.maxTileY = mty;
        };
        
        this.getPartialImage = function (tileX, tileY, zoomLevel) {
            if (this.fullImage.complete) {
                var partialImageSize = parameters.tileSize / 8;
                var canvas = document.createElement ("canvas");
                if (!canvas["width"]) {
                    return null;
                }
                canvas.width = partialImageSize;
                canvas.height = partialImageSize;
                var ctx = canvas.getContext('2d'); 
                
                var posterScale = parameters.posterSize / Math.max (parameters.width, parameters.height);
                
                var posterWidth = Math.floor (posterScale * parameters.width);
                var posterHeight = Math.floor (posterScale * parameters.height);
                
                var tileSizeAtZoom = posterScale * parameters.tileSize / Math.pow (2, zoomLevel);    
                var sx = Math.floor (tileSizeAtZoom * tileX);
                var sy = Math.floor (tileSizeAtZoom * tileY);
                var sw = Math.floor (tileSizeAtZoom);
                var sh = Math.floor (tileSizeAtZoom);
                var dw = partialImageSize + 2;
                var dh = partialImageSize + 2;
                
                if (sx + sw > posterWidth) {
                    sw = posterWidth - sx;
                    dw = partialImageSize * (sw / Math.floor (tileSizeAtZoom));
                }
                if (sy + sh > posterHeight) {
                    sh = posterHeight - sy;
                    dh = partialImageSize * (sh / Math.floor (tileSizeAtZoom));
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
     * @class Image parameter object.
     * You need not set any fields that can be read from the image descriptor that 
     * MakeImagePyramid creates. See the {@link bigshot.Image} documentation
     * for required parameters.
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
     * @class
     * @param values named parameter map, see the fields below for parameter names and types.
     * @see bigshot.Image
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
         * The div to use as a container for the image.
         *
         * @type HTMLDivElement
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
         * the following should be set=
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
         * the fileSystem field is set. Possible values are <code>"archive"</code> 
         * or <code>"folder"</code>.
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
        
        req.open("GET", parameters.fileSystem.getFilename ("descriptor"), false);   
        req.send(null);  
        if(req.status == 200) {
            var substrings = req.responseText.split (":");
            for (var i = 0; i < substrings.length; i += 2) {
                if (!parameters[substrings[i]]) {
                    if (substrings[i] == "suffix") {
                        parameters[substrings[i]] = substrings[i + 1];
                    } else {
                        parameters[substrings[i]] = parseInt (substrings[i + 1]);
                    }
                }
            }
        }
        
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
        this.getFilename = function (name) {};
        this.getImageFilename = function (tileX, tileY, zoomLevel) {};
    };
    
    /**
     * Creates a new instance of a folder-based filesystem adapter.
     *
     * @augments bigshot.FileSystem
     * @class Folder-based filesystem.
     * @param {bigshot.ImageParameters} parameters the associated image parameters
     * @constructor
     */
    bigshot.FolderFileSystem = function (parameters) {
        this.getFilename = function (name) {
            return parameters.basePath + "/" + name;
        };
        
        this.getImageFilename = function (tileX, tileY, zoomLevel) {
            var key = (-zoomLevel) + "/" + tileX + "_" + tileY + parameters.suffix;
            return this.getFilename (key);
        };
    };
    
    /**
     * Creates a new instance of a <code>.bigshot</code> archive filesystem adapter.
     * 
     * @class Bigshot archive filesystem.
     * @param {bigshot.ImageParameters} parameters the associated image parameters
     * @augments bigshot.FileSystem
     * @constructor
     */     
    bigshot.ArchiveFileSystem = function (parameters) {
        this.indexSize = 0;
        this.offset = 0;
        this.index = {};
        
        this.getFilename = function (name) {
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
            var key = (-zoomLevel) + "/" + tileX + "_" + tileY + parameters.suffix;
            return this.getFilename (key);
        };
        
        
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
     * @param {bigshot.ImageParameters} parameters the parameters object to populate
     */
    bigshot.setupFileSystem = function (parameters) {
        if (!parameters.fileSystem) {
            if (parameters.fileSystemType == "archive") {
                parameters.fileSystem = new bigshot.ArchiveFileSystem (parameters);
            } else {
                parameters.fileSystem = new bigshot.FolderFileSystem (parameters);
            }
        }
    }
}