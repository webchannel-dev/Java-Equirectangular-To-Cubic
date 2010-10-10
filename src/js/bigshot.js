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
     * Bigshot namespace.
     *
     * @namespace
     */
    bigshot = {};
    
    /**
     * Browser compatibility layer and utility functions.
     * @constructor
     */
    bigshot.Browser = function () {
        return {
            /**
             * Removes all children from an element.
             * 
             * @public
             * @memberOf bigshot.Browser#
             */
            removeAllChildren : function (element) {
                if (element.children.length > 0) {
                    for (var i = element.children.length - 1; i >= 0; --i) {
                        element.removeChild (element.children[i]);
                    }
                }
            },
            
            mouseEnter : function (_fn)
            {
                var isAChildOf = this.isAChildOf;
                return function(_evt)
                {
                    var relTarget = _evt.relatedTarget;
                    if (this === relTarget || isAChildOf (this, relTarget))
                    { return; }
                    
                    _fn.call (this, _evt);
                }
            },
            
            isAChildOf : function (_parent, _child)
            {
                if (_parent === _child) { return false; }
                while (_child && _child !== _parent)
                { _child = _child.parentNode; }
                
                return _child === _parent;
            },
            
            unregisterListener : function (elem, eventName, fn, useCapture) {
                if (typeof (elem.removeEventListener) != 'undefined') {
                    elem.removeEventListener (eventName, fn, useCapture);
                } else if (typeof (elem.detachEvent) != 'undefined') {
                    elem.detachEvent('on' + eventName, fn);
                }
            },
            
            registerListener : function (_elem, _evtName, _fn, _useCapture)
            {
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
            },
            
            stopEventBubbling : function (eventObject) {
                if (eventObject) {
                    if (eventObject.stopPropagation) {
                        eventObject.stopPropagation ();
                    } else { 
                        eventObject.cancelBubble = true; 
                    }
                }
            },
            
            getElementSize : function (obj) {
                var size = new Object();
                if (obj.clientWidth) {
                    size.w = obj.clientWidth;
                }
                if (obj.clientHeight) {
                    size.h = obj.clientHeight;
                }
                return size;
            },
            
            getElementPosition : function (obj) {
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
            },
            createXMLHttpRequest : function  () {
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
            }           
        }
    };
    
    bigshot.object = {
        extend : function (base, derived) {
            var _super = {};
            derived._super = _super;
            for (var k in base) {
                if (typeof (base[k]) == "function") {
                    _super[k] = this.makeThunk (base[k], derived);
                    if (!derived[k]) {
                        derived[k] = this.makeThunk (base[k], derived);
                    }
                } else {
                    derived[k] = base[k];
                }
            }
            return derived;
        },
        
        makeThunk : function (fn, object) {
            return function () {
                return fn.call (object, arguments);
            };
        },
        
        alertr : function (o) {
            var sb = "";
            for (var k in o) {
                sb += k + ":" + o[k] + "\n";
            }
            alert (sb);
        }
    };
    
    /**
     * Base class for hotspots in a bigshot.HotspotLayer.
     *
     * @constructor
     */
    bigshot.Hotspot = function (x, y, w, h) {
        var element = document.createElement ("div");
        element.style.position = "relative";
        
        var hs = {
            browser : new bigshot.Browser (),
            element : element,
            x : x,
            y : y,
            w : w,
            h : h,
            
            /**
             * Lays it out.
             *
             * @name bigshot.Hotspot#layout
             * @param x0 x-coordinate of top-left corner in css pixels
             * @param y0 y-coordinate of top-left corner in css pixels
             * @param zoomFactor the zoom factor.
             * @function
             */
            layout : function (x0, y0, zoomFactor) {
                var sx = this.x * zoomFactor + x0;
                var sy = this.y * zoomFactor + y0;
                var sw = this.w * zoomFactor;
                var sh = this.h * zoomFactor;
                this.element.style.top = sy + "px";
                this.element.style.left = sx + "px";
                this.element.style.width = sw + "px";
                this.element.style.height = sh + "px";
            },
            
            /**
             * Lays it out.
             *
             * @memberOf bigshot.Hotspot#
             */
            getElement : function () {
                return this.element;
            }
        };
        return hs;
    };
    
    /**
     * A hotspot with a label under it.
     *
     * @constructor
     */
    bigshot.LabeledHotspot = function (x, y, w, h, labelText) {
        var hs = new bigshot.Hotspot (x, y, w, h);
        var label = document.createElement ("div");
        label.style.position = "relative";
        label.style.display = "inline-block";
        
        hs.getElement ().appendChild (label);
        label.innerHTML = labelText;
        
        hs.inheritedLayout = hs.layout;
        hs.label = label;
        hs.getLabel = function () {
            return this.label;
        };
        hs.layout = function (x0, y0, zoomFactor) {
            this.inheritedLayout (x0, y0, zoomFactor);
            var labelSize = this.browser.getElementSize (this.label);
            var sw = this.w * zoomFactor;
            var sh = this.h * zoomFactor;
            this.label.style.top = (sh + 4) + "px";
            this.label.style.left = ((sw - labelSize.w) / 2) + "px";
        };
        return hs;
    }
    
    /**
     * A labeled hotspot that takes the user to another
     * location when it is clicked on.
     *
     * @constructor
     */
    bigshot.LinkHotspot = function (x, y, w, h, labelText, url) {
        var hs = new bigshot.LabeledHotspot (x, y, w, h, labelText);
        hs.browser.registerListener (hs.getElement (), "click", function () {
                document.location.href = url;
            });
        
        return hs;
    }
    
    /**
     * A hotspot layer.
     *
     * @constructor
     */
    bigshot.HotspotLayer = function (parentContainer, container) {
        var layer = {
            hotspots : new Array (),
            browser : new bigshot.Browser (),
            container : container,
            parentContainer : parentContainer,
            
            resize : function (w, h) {
                this.container.style.width = this.parentContainer.clientWidth + "px";
                this.container.style.height = this.parentContainer.clientHeight + "px";
            },
            
            layout : function (zoom, x0, y0, tx0, ty0, size, stride, opacity) {
                var zoomFactor = Math.pow (2, zoom);
                x0 -= stride * tx0;
                y0 -= stride * ty0;
                for (var i = 0; i < this.hotspots.length; ++i) {
                    this.hotspots[i].layout (x0, y0, zoomFactor);
                }            
            },
            
            setMaxTiles : function (mtx, mty) {
            },
            
            addHotspot : function (hotspot) {
                this.container.appendChild (hotspot.getElement ());
                this.hotspots.push (hotspot);
            }
        };
        layer.resize (0, 0);
        return layer;
    };
    
    /**
     * A tiled, zoomable image layer.
     *
     * @constructor
     */
    bigshot.TileLayer = function (parentContainer, container, parameters, w, h, itc) {
        var layer = {
            rows : new Array (),
            browser : new bigshot.Browser (),
            container : container,
            parentContainer : parentContainer,
            parameters : parameters,
            w : w,
            h : h,
            imageTileCache : itc,
            
            resize : function (w, h) {
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
            },
            
            layout : function (zoom, x0, y0, tx0, ty0, size, stride, opacity) {
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
            },
            
            setMaxTiles : function (mtx, mty) {
                this.imageTileCache.setMaxTiles (mtx, mty);
            }
        };
        layer.resize (w, h);
        return layer;
    };
    
    /**
     * Implementation of a Least-Recently-Used cache map.
     * Used by the ImageTileCache to keep track of cache entries.
     *
     * @constructor
     */
    bigshot.LRUMap = function () {
        return {
            keyToTime : {},
            counter : 0,
            size : 0,
            
            access : function (key) {
                this.remove (key);
                this.keyToTime[key] = this.counter;
                ++this.counter;
                ++this.size;
            },
            
            remove : function (key) {
                if (this.keyToTime[key]) {
                    delete this.keyToTime[key];
                    --this.size;
                    return true;
                } else {
                    return false;
                }
            },
            
            getSize : function () {
                return this.size;
            },
            
            leastUsed : function () {
                var least = this.counter + 1;
                var leastKey = null;
                for (var k in this.keyToTime) {
                    if (this.keyToTime[k] < least) {
                        least = this.keyToTime[k];
                        leastKey = k;
                    }
                }
                return leastKey;
            }
        };
    }
    
    /**
     * Tile cache for the TileLayer.
     *
     * @constructor
     */
    bigshot.ImageTileCache = function (onLoaded, parameters) {
        var fullImage = document.createElement ("img");
        fullImage.src = parameters.fileSystem.getFilename ("poster" + parameters.suffix);
        
        return {
            fullImage : fullImage,
            maxCacheSize : 512,
            maxTileX : 0,
            maxTileY : 0,
            cachedImages : {},
            requestedImages : {},
            usedImages : {},
            lastOnLoadFiredAt : 0,
            imageRequests : 0,
            lruMap : new bigshot.LRUMap (),
            onLoaded : onLoaded,
            browser : new bigshot.Browser (),
            
            resetUsed : function () {
                this.usedImages = {};
            },
            
            setMaxTiles : function (mtx, mty) {
                this.maxTileX = mtx;
                this.maxTileY = mty;
            },
            
            getPartialImage : function (tileX, tileY, zoomLevel) {
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
                    
                    ctx.drawImage (fullImage, sx, sy, sw, sh, -1, -1, dw, dh);
                    var tile = document.createElement ("img");
                    tile.src = canvas.toDataURL ();
                    return tile;
                } else {
                    return null;
                }
            },
            
            getEmptyImage : function () {
                var tile = document.createElement ("img");
                if (parameters.emptyImage) {
                    tile.src = parameters.emptyImage;
                } else {
                    tile.src = "data:image/gif,GIF89a%01%00%01%00%80%00%00%00%00%00%FF%FF%FF!%F9%04%00%00%00%00%00%2C%00%00%00%00%01%00%01%00%00%02%02D%01%00%3B";
                }
                return tile;
            },
            
            getImage : function (tileX, tileY, zoomLevel) {
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
            },
            
            requestImage : function (tileX, tileY, zoomLevel) {
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
            },
            
            purgeCache : function () {
                for (var i = 0; i < 4; ++i) {
                    if (this.lruMap.getSize () > this.maxCacheSize) {
                        var leastUsed = this.lruMap.leastUsed ();
                        this.lruMap.remove (leastUsed);
                        delete this.cachedImages[leastUsed];                    
                    }
                }
            },
            
            getImageKey : function (tileX, tileY, zoomLevel) {
                return "I" + tileX + "_" + tileY + "_" + zoomLevel;
            },
            
            getImageFilename : function (tileX, tileY, zoomLevel) {
                var f = parameters.fileSystem.getImageFilename (tileX, tileY, zoomLevel);
                return f;
            }
        };
    };
    
    /**
     * Abstract interface description for a Layer.
     *
     * @constructor
     */
    bigshot.Layer = {
        setMaxTiles : function (x, y) {},
        resize : function (w, h) {},
        layout : function (zoom, x0, y0, tx0, ty0, size, stride, opacity) {}
    };
    
    /**
     * Image parameter object. If you use the bigshot.ImageFromDescriptor constructor
     * (<b>and we very much recommend you do that</b>),
     * you need not set any fields that can be read from the image descriptor that 
     * MakeImagePyramid creates. See the bigshot.ImageFromDescriptor documentation
     * for required parameters.
     *
     * <p>Usage:
     *
     * <pre><code>var bsi = new bigshot.ImageFromDescriptor (
     *     new bigshot.ImageParameters ({
     *         basePath : "/bigshot.php?file=myshot.bigshot",
     *         fileSystemType : "archive",
     *         container : document.getElementById ("bigshot_div")
     *         }));</code></pre>
     * 
     * @class
     * @param values named parameter map, see the fields below for parameter names and types.
     * @see bigshot.ImageFromDescriptor
     * @see bigshot.Image
     */
    bigshot.ImageParameters = function (values) {
        /**#@+
         * @memberOf bigshot.ImageParameters#
         */
        var v = {
            /**
             * Size of low resolution preview image along the longest image
             * dimension. The preview is assumed to have the same aspect
             * ratio as the full image (specified by width and height).
             *
             * @default set by MakeImagePyramid and bigshot.ImageFromDescriptor
             * @type int
             * @name posterSize
             * @public
             */
            posterSize : 0,
            
            /**
             * Url for the image tile to show while the tile is loading and no 
             * low-resolution preview is available.
             *
             * @default set to an all-black image
             * @name emptyImage
             * @type String
             * @public
             */
            emptyImage : null,
            
            /**
             * Suffix to append to the tile filenames. Typically <code>".jpg"</code> or 
             * <code>".png"</code>.
             *
             * @default set by MakeImagePyramid and bigshot.ImageFromDescriptor
             * @name suffix
             * @type String
             */
            suffix : null,
            
            /**
             * The width of the full image, in pixels.
             *
             * @default set by MakeImagePyramid and bigshot.ImageFromDescriptor
             * @name width
             * @type int
             */
            width : 0,
            
            /**
             * The height of the full image, in pixels.
             *
             * @default set by MakeImagePyramid and bigshot.ImageFromDescriptor
             * @name height
             * @type int
             */
            height : 0,
            
            /**
             * The div to use as a container for the image.
             *
             * @type HTMLDivElement
             * @name container
             */
            container : null,
            
            /**
             * The minimum zoom value. Zoom values are specified as a magnification, where
             * 2<sup>n</sup> is the magnification and n is the zoom value. So a zoom value of
             * 2 means a 4x magnification of the full image. -3 means showing an image that
             * is a quarter (1/8 or 1/2<sup>3</sup>) of the full size.
             *
             * @type number
             * @default set by MakeImagePyramid and bigshot.ImageFromDescriptor
             * @name minZoom
             */
            minZoom : 0.0,
            
            /**
             * Size of one tile in pixels.
             *
             * @type int
             * @name tileSize
             * @default set by MakeImagePyramid and bigshot.ImageFromDescriptor
             */
            tileSize : 0,

            /**
             * Tile overlap. Not implemented.
             *
             * @type int
             * @name overlap
             * @default set by MakeImagePyramid and bigshot.ImageFromDescriptor
             */
            overlap : 0,
            
            /**
             * Flag indicating that the image should wrap horizontally. The image wraps on tile
             * boundaries, so in order to get a seamless wrap at zoom level -n, the image width must
             * be evenly divisible by <code>tileSize * 2^n</code>. Set the minZoom value appropriately.
             * 
             * @type boolean
             * @default false
             * @name wrapX
             */
            wrapX : false,
            
            /**
             * Flag indicating that the image should wrap vertically. The image wraps on tile
             * boundaries, so in order to get a seamless wrap at zoom level -n, the image height must
             * be evenly divisible by <code>tileSize * 2^n</code>. Set the minZoom value appropriately.
             *
             * @type boolean
             * @default false
             * @name wrapY
             */
            wrapY : false,
            
            /**
             * Base path for the image. This is filesystem dependent, but for the two most common cases
             * the following should be set:
             *
             * <ul>
             * <li><b>archive</b>: The basePath is <code>"&lt;path&gt;/bigshot.php?file=&lt;path-to-bigshot-archive-relative-to-bigshot.php&gt;"</code>,
             *     for example, <code>"/bigshot.php?file=images/bigshot-sample.bigshot"</code>.
             * <li><b>folder</b>: The basePath is <code>"&lt;path-to-image-folder&gt;"</code>,
             *     for example, <code>"/images/bigshot-sample"</code>.
             * </ul>
             *
             * @type String
             * @name basePath
             */
            basePath : null,

            /**
             * The file system type. Used to create a filesystem instance unless
             * the fileSystem field is set. Possible values are <code>"archive"</code> 
             * or <code>"folder"</code>.
             *
             * @name fileSystemType
             * @type String
             * @name fileSystemType
             * @default "folder"
             */
            fileSystemType : "folder",

            /**
             * A reference to a filesystem implementation. If set, it overrides the
             * fileSystemType field.
             *
             * @name fileSystem
             * @default set depending on value of bigshot.ImageParameters.fileSystemType
             * @type bigshot.FileSystem
             */
            fileSystem : null,
            
            /**
             * Enable the touch-friendly ui.
             * 
             * @name touchUI
             * @type boolean
             * @default true
             */
            touchUI : true
        };
        /**#@-*/
        if (values) {
            for (var k in values) {
                v[k] = values[k];
            }
        }
        return v;        
    };
    
    /**
     * Tiled image handler.
     *
     * @param parameters
     * @class
     */     
    bigshot.Image = function (/**bigshot.ImageParameters*/ parameters) {
        bigshot.SetupFileSystem (parameters);
        
        /**#@+
         * @memberOf bigshot.Image#
         */
        var image = {
            container : parameters.container,
            x : parameters.width / 2.0,
            y : parameters.height / 2.0,
            zoom : 0.0,
            width : parameters.width,
            height : parameters.height,
            minZoom : parameters.minZoom,
            maxZoom : 2.0,
            tileSize : parameters.tileSize,
            overlap : 0,
            browser : new bigshot.Browser (),
            imageTileCache : null,
            
            dragStart : null,
            dragged : false,
            
            layers : new Array (),
            
            layout : function () {
                this.layoutWithZoomFactor (this.tiles, this.zoom);
            },
            
            layoutWithZoomFactor : function (tiles, useZoomFactor) {
                var zoomLevel = Math.min (0, Math.ceil (useZoomFactor));
                var zoomFactor = Math.pow (2, zoomLevel);
                var tileWidthInRealPixels = this.tileSize / zoomFactor;
                
                var fractionalZoomFactor = Math.pow (2, useZoomFactor - zoomLevel);
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
                        useZoomFactor, 
                        -topLeftTileXoffset - tileDisplayWidth, -topLeftTileYoffset - tileDisplayWidth, 
                        topLeftTileX - 1, topLeftTileY - 1, 
                        Math.ceil (tileDisplayWidth), Math.ceil (tileDisplayWidth), 
                        1.0);
                }
            },
            
            resize : function () {
                var tilesW = Math.ceil (2 * this.container.clientWidth / this.tileSize) + 2;
                var tilesH = Math.ceil (2 * this.container.clientHeight / this.tileSize) + 2;
                if (this.layers.length == 0) {
                    var tileLayerContainer = document.createElement ("div");
                    tileLayerContainer.style.position = "absolute";
                    tileLayerContainer.style.overflow = "hidden";
                    this.container.appendChild (tileLayerContainer);
                    this.layers.push (
                        new bigshot.TileLayer (this.container, tileLayerContainer, parameters, tilesW, tilesH, this.imageTileCache)
                    );
                } else {
                    for (var i = 0; i < this.layers.length; ++i) {
                        this.layers[i].resize (tilesW, tilesH);
                    }
                }
            },
            
            createLayerContainer : function () {
                var layerContainer = document.createElement ("div");
                layerContainer.style.position = "absolute";
                return layerContainer;
            },
            
            addLayer : function (layer, layerContainer) {
                this.container.appendChild (layerContainer);
                this.layers.push (layer);
            },
            
            /**
             * Sets the current zoom value.
             *
             * @name setZoom
             * @function
             * @param zoom the zoom value.
             */
            setZoom : function (/**number*/ zoom) {
                this.stopFlying ();
                this.zoom = Math.min (this.maxZoom, Math.max (zoom, this.minZoom));
                var zoomLevel = Math.ceil (this.zoom);
                var zoomFactor = Math.pow (2, zoomLevel);
                var maxTileX = Math.ceil (zoomFactor * this.width / this.tileSize);
                var maxTileY = Math.ceil (zoomFactor * this.height / this.tileSize);
                for (var i = 0; i < this.layers.length; ++i) {
                    this.layers[i].setMaxTiles (maxTileX, maxTileY);
                }
                this.layout ();
            },
            
            /**
             * Sets the maximum zoom value. The maximum magnification (of the full-size image)
             * is 2<sup>maxZoom</sup>. Set to 0.0 to avoid pixelation.
             *
             * @function
             * @name setMaxZoom
             * @param maxZoom the maximum zoom value
             */
            setMaxZoom : function (/**number*/ maxZoom) {
                this.maxZoom = maxZoom;
            },
            
            /**
             * Gets the maximum zoom value. The maximum magnification (of the full-size image)
             * is 2<sup>maxZoom</sup>.
             * 
             * @function
             * @name getMaxZoom
             * @type number
             */
            getMaxZoom : function () {
                return this.maxZoom;
            },
            
            /**
             * Sets the minimum zoom value. The minimum magnification (of the full-size image)
             * is 2<sup>minZoom</sup>, so a minZoom of <code>-3</code> means that the smallest
             * image shown will be one-eighth of the full-size image.
             *
             * @function
             * @name setMinZoom
             * @param minZoom the minimum zoom value for this image
             */
            setMinZoom : function (/**number*/ minZoom) {
                this.minZoom = minZoom;
            },
            
            /**
             * Gets the minimum zoom value. The minimum magnification (of the full-size image)
             * is 2<sup>minZoom</sup>, so a minZoom of <code>-3</code> means that the smallest
             * image shown will be one-eighth of the full-size image.
             * 
             * @function
             * @name getMinZoom
             * @type number
             */
            getMinZoom : function () {
                return this.minZoom;
            },
            
            /**
             * @name dragMouseDown
             * @private
             */
            dragMouseDown : function (event) {
                this.dragStart = {
                    x : event.clientX,
                    y : event.clientY
                };
                this.dragged = false;
            },
            
            dragMouseMove : function (event) {
                if (this.dragStart != null) {
                    this.dragged = true;
                    var delta = {
                        x : event.clientX - this.dragStart.x,
                        y : event.clientY - this.dragStart.y
                    };
                    var zoomFactor = Math.pow (2, this.zoom);
                    var realX = delta.x / zoomFactor;
                    var realY = delta.y / zoomFactor;
                    this.setPosition (this.x - realX, this.y - realY);
                    this.dragStart = {
                        x : event.clientX,
                        y : event.clientY
                    };
                }
            },
            
            dragMouseUp : function (event) {
                if (this.dragStart != null) {
                    this.dragStart = null;
                }
            },
            
            mouseDoubleClick : function (event) {
                var elementPos = this.browser.getElementPosition (this.container);
                var clickPos = {
                    x : event.clientX - elementPos.x - this.container.clientWidth / 2,
                    y : event.clientY - elementPos.y - this.container.clientHeight / 2
                };
                var scale = Math.pow (2, this.zoom);
                clickPos.x /= scale;
                clickPos.y /= scale;
                this.flyTo (this.x + clickPos.x, this.y + clickPos.y, this.zoom + 0.5);
            },
            
            getZoom : function () {
                return this.zoom;
            },
            
            setPosition : function (x, y) {
                this.stopFlying ();
                if (parameters.wrapX) {
                    if (x < 0 || x >= this.width) {
                        x = (x + this.width) % this.width;
                    }
                }
                
                if (parameters.wrapY) {
                    if (y < 0 || y >= this.height) {
                        y = (y + this.height) % this.height;
                    }
                }
                this.x = Math.max (0, Math.min (this.width, x));
                this.y = Math.max (0, Math.min (this.height, y));
                this.layout ();
            },
            
            fitZoom : function (imageDimension, containerDimension) {
                var scale = containerDimension / imageDimension;
                return Math.log (scale) / Math.LN2;
            },
            
            getZoomToFitValue : function () {
                return Math.min (
                    this.fitZoom (parameters.width, this.container.clientWidth),
                    this.fitZoom (parameters.height, this.container.clientHeight));
            },
            
            zoomToFit : function () {
                this.setZoom (this.getZoomToFitValue ());
            },
            
            zoomToFitHeight : function () {
                this.setZoom (this.fitZoom (parameters.height, this.container.clientHeight));
            },
            
            zoomToFitWidth : function () {
                this.setZoom (this.fitZoom (parameters.width, this.container.clientWidth));
            },
            
            flyZoomToFitHeight : function () {
                this.flyTo (this.x, parameters.height / 2, this.fitZoom (parameters.height, this.container.clientHeight));
            },
            
            flyZoomToFitWidth : function () {
                this.flyTo (parameters.width / 2, this.y, this.fitZoom (parameters.width, this.container.clientWidth));
            },
            
            flyZoomToFit : function () {
                this.flyTo (parameters.width / 2, parameters.height / 2, this.getZoomToFitValue ());
            },
            
            mouseWheelHandler : function (delta) {
                if (delta > 0) {
                    this.flyTo (this.x, this.y, this.getZoom () + 0.5);
                } else if (delta < 0) {
                    this.flyTo (this.x, this.y, this.getZoom () - 0.5);
                }
            },
            
            mouseWheel : function (event){
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
            },
            
            onresize : function () {
                this.resize ();
                this.layout ();
            },
            
            flying : 0,
            
            stopFlying : function () {
                this.flying++;
            },
            
            flyTo : function (x, y, zoom) {
                var that = this;
                
                var targetX = Math.max (0, Math.min (this.width, x));
                var targetY = Math.max (0, Math.min (this.height, y));
                
                var targetZoom = Math.min (this.maxZoom, Math.max (zoom, this.minZoom));
                
                
                this.flying++;
                var flyingAtStart = this.flying;
                var iter = function () {
                    if (that.flying == flyingAtStart) {
                        var nx = (targetX + that.x) / 2;
                        var ny = (targetY + that.y) / 2;
                        var nz = (targetZoom + that.zoom) / 2;
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
                        that.x = nx;
                        that.y = ny;
                        that.setZoom (nz);
                        if (!done) {
                            that.flying--;
                            setTimeout (iter, 20);
                        }
                    };
                }
                setTimeout (iter, 20);
            },
            
            rectVisibleAtZoomLevel : function (w, h) {
                return Math.min (
                    this.fitZoom (w, this.container.clientWidth),
                    this.fitZoom (h, this.container.clientHeight));
            },
            
            getTouchAreaBaseSize : function () {
                var averageSize = ((this.container.clientWidth + this.container.clientHeight) / 2) * 0.2;
                return Math.min (averageSize, Math.min (this.container.clientWidth, this.container.clientHeight) / 6);
            },
            
            mouseClick : function (event) {
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
            },
            
            /**
             * Briefly shows the touch ui zones.
             *
             * @function
             * @name flashTouchUI
             * @param [delay] milliseconds before fading out
             * @param [fadeOut] milliseconds to fade out the zone overlays in
             */
            flashTouchUI : function (/**int*/ delay, /**int*/ fadeOut) {
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
            },
            
            isFullScreen : false,
            exitFullScreenHandler : null,
            
            exitFullScreen : function () {
                if (!this.isFullScreen) {
                    this.exitFullScreenHandler ();
                    this.exitFullScreenHandler = null;
                    return;
                }
            },
            
            fullScreen : function (onClose) {
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
            }
        };
        /**#@-*/
        var consumeEvent = function (event) {
            if (event.preventDefault) {
                event.preventDefault ();
            }
            return false;
        };
        
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
        
        image.imageTileCache = new bigshot.ImageTileCache (function () {
                image.layout ();     
            }, parameters);
        image.resize ();
        image.browser.registerListener (parameters.container, "DOMMouseScroll", function (e) {
                image.mouseWheel (e);
                return consumeEvent (e);
            }, false);
        image.browser.registerListener (parameters.container, "mousewheel", function (e) {
                image.mouseWheel (e);
                return consumeEvent (e);
            }, false);
        image.browser.registerListener (parameters.container, "dblclick", function (e) {
                image.mouseDoubleClick (e);
                return consumeEvent (e);
            }, false);
        image.browser.registerListener (parameters.container, "mousedown", function (e) {
                image.dragMouseDown (e);
                return consumeEvent (e);
            }, false);
        image.browser.registerListener (parameters.container, "touchstart", function (e) {
                image.dragMouseDown (translateEvent (e));
                return consumeEvent (e);
            }, false);
        image.browser.registerListener (parameters.container, "mouseup", function (e) {
                image.dragMouseUp (e);
                return consumeEvent (e);
            }, false);
        image.browser.registerListener (parameters.container, "touchend", function (e) {
                image.dragMouseUp (translateEvent (e));
                return consumeEvent (e);
            }, false);
        image.browser.registerListener (parameters.container, 'mousemove', function (e) {
                image.dragMouseMove (e);
                return consumeEvent (e);
            }, false);
        image.browser.registerListener (parameters.container, 'touchmove', function (e) {
                image.dragMouseMove (translateEvent (e));
                return consumeEvent (e);
            }, false);
        image.browser.registerListener (parameters.container, 'click', function (e) {
                image.mouseClick (e);
                return consumeEvent (e);
            }, false);
        image.zoomToFit ();
        return image;
    }
    
    /**
     * Abstract filesystem definition.
     *
     * @class
     */
    bigshot.FileSystem = {
        getFilename : function (name) {},
        getImageFilename : function (tileX, tileY, zoomLevel) {}
    };
    
    /**
     * Folder-based filesystem.
     *
     * @constructor
     */
    bigshot.FolderFileSystem = function (parameters) {
        return {
            getFilename : function (name) {
                return parameters.basePath + "/" + name;
            },
            
            getImageFilename : function (tileX, tileY, zoomLevel) {
                var key = (-zoomLevel) + "/" + tileX + "_" + tileY + parameters.suffix;
                return this.getFilename (key);
            }
        };
    };
    
    /**
     * Bigshot archive filesystem.
     *
     * @constructor
     */     
    bigshot.ArchiveFileSystem = function (parameters) {
        var fs = {
            indexSize : 0,
            offset : 0,
            index : {},
            
            init : function () {
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
            },
            
            getFilename : function (name) {
                var f = parameters.basePath + "&start=" + this.index[name].start + "&length=" + this.index[name].length;
                if (name.substring (name.length - 4) == ".jpg") {
                    f = f + "&type=image/jpeg";
                } else if (name.substring (name.length - 4) == ".png") {
                    f = f + "&type=image/png";
                } else {
                    f = f + "&type=text/plain";
                }
                return f;
            },
            
            getImageFilename : function (tileX, tileY, zoomLevel) {
                var key = (-zoomLevel) + "/" + tileX + "_" + tileY + parameters.suffix;
                return this.getFilename (key);
            }
        };
        
        fs.init ();
        return fs;
    }
    
    /**
     * Sets up a filesystem instance.
     */
    bigshot.SetupFileSystem = function (parameters) {
        if (!parameters.fileSystem) {
            if (parameters.fileSystemType == "archive") {
                parameters.fileSystem = new bigshot.ArchiveFileSystem (parameters);
            } else {
                parameters.fileSystem = new bigshot.FolderFileSystem (parameters);
            }
        }
    }
    
    /**
     * Creates an image from a descriptor.
     *
     * @param parameters the image parameters. Required fields are: <code>basePath</code> and <code>container</code>.
     * If you intend to use the archive filesystem, you need to set the <code>fileSystemType</code> to <code>"archive"</code>
     * as well.
     * 
     * @class
     * @augments bigshot.Image
     */
    bigshot.ImageFromDescriptor = function (/**bigshot.ImageParameters*/ parameters) {
        bigshot.SetupFileSystem (parameters);
        
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
        
        return new bigshot.Image (parameters);
    }
}