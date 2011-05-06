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
 * @class Tile texture cache for a {@link bigshot.VRFace}.
 * @param {function()} onLoaded function that is called whenever a texture tile has been
 * loaded.
 * @param {bigshot.VRPanoramaParameters} image parameters
 * @param {bigshot.WebGL} _webGl WebGL instance to use
 */
bigshot.TextureTileCache = function (onLoaded, parameters, _webGl) {
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
    
