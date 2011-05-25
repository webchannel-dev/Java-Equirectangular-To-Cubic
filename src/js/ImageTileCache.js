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
 * @class Tile cache for the {@link bigshot.TileLayer}.
 * @constructor
 */
bigshot.ImageTileCache = function (onLoaded, parameters) {
    var that = this;
    
    /**
      * Reduced-resolution preview of the full image.
      * Loaded from the "poster" image created by 
      * MakeImagePyramid
      *
      * @private
      * @type HTMLImageElement
      */
    this.fullImage = null;
    parameters.dataLoader.loadImage (parameters.fileSystem.getPosterFilename (), function (tile) {
            that.fullImage = tile;
        });
    
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
    this.partialImageSize = parameters.tileSize / 4;
    this.POSTER_ZOOM_LEVEL = Math.log (parameters.posterSize / Math.max (parameters.width, parameters.height)) / Math.log (2);
    
    this.resetUsed = function () {
        this.usedImages = {};
    };
    
    this.setMaxTiles = function (mtx, mty) {
        this.maxTileX = mtx;
        this.maxTileY = mty;
    };
    
    this.getPartialImage = function (tileX, tileY, zoomLevel) {
        var img = this.getPartialImageFromDownsampled (tileX, tileY, zoomLevel, 0, 0, parameters.tileSize, parameters.tileSize);
        if (img == null) {
            img = this.getPartialImageFromPoster (tileX, tileY, zoomLevel);
        }
        return img;
    };
    
    this.getPartialImageFromPoster = function (tileX, tileY, zoomLevel) {
        if (this.fullImage && this.fullImage.complete) {
            var posterScale = this.fullImage.width / parameters.width;
            var tileSizeAtZoom = posterScale * parameters.tileSize / Math.pow (2, zoomLevel);
            
            x0 = Math.floor (tileSizeAtZoom * tileX);
            y0 = Math.floor (tileSizeAtZoom * tileY);
            w = Math.floor (tileSizeAtZoom);
            h = Math.floor (tileSizeAtZoom);
            
            return this.createPartialImage (this.fullImage, this.fullImage.width, x0, y0, w, h);
        } else {
            return null;
        }
    };
    
    this.createPartialImage = function (sourceImage, expectedSourceImageSize, x0, y0, w, h) {
        var canvas = document.createElement ("canvas");
        if (!canvas["width"]) {
            return null;
        }
        canvas.width = this.partialImageSize;
        canvas.height = this.partialImageSize;
        var ctx = canvas.getContext('2d'); 
        
        var scale = sourceImage.width / expectedSourceImageSize;
        
        var sx = Math.floor (x0 * scale);
        var sy = Math.floor (y0 * scale);
        w *= scale;
        if (sx + w >= sourceImage.width) {
            w = sourceImage.width - sx - 1;
        }
        
        h *= scale;
        if (sy + h >= sourceImage.height) {
            h = sourceImage.height - sy - 1;
        }
        
        ctx.drawImage (sourceImage, sx, sy, w, h, -0.1, -0.1, this.partialImageSize + 0.2, this.partialImageSize + 0.2);
        
        return canvas;
    }
    
    this.getPartialImageFromDownsampled = function (tileX, tileY, zoomLevel, x0, y0, w, h) {
        var key = this.getImageKey (tileX, tileY, zoomLevel);
        var sourceImage = this.cachedImages[key];
        
        if (sourceImage == null) {
            this.requestImage (tileX, tileY, zoomLevel);
            
            // Give up if the poster image has higher resolution.
            if (zoomLevel < this.POSTER_ZOOM_LEVEL) {
                return null;
            }
        }
        
        if (sourceImage) {
            return this.createPartialImage (sourceImage, parameters.tileSize, x0, y0, w, h);
        } else {
            w /= 2;
            h /= 2;
            x0 /= 2;
            y0 /= 2;
            if ((tileX % 2) == 1) {
                x0 += parameters.tileSize / 2;
            }
            if ((tileY % 2) == 1) {
                y0 += parameters.tileSize / 2;
            }
            tileX = Math.floor (tileX / 2);
            tileY = Math.floor (tileY / 2);
            --zoomLevel;
            return this.getPartialImageFromDownsampled (tileX, tileY, zoomLevel, x0, y0, w, h);
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
                var tile = parameters.dataLoader.loadImage (this.getImageFilename (tileX, tileY, zoomLevel));
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
            
            return img;
        }
    };
    
    this.requestImage = function (tileX, tileY, zoomLevel) {
        var key = this.getImageKey (tileX, tileY, zoomLevel);
        if (!this.requestedImages[key]) {
            this.imageRequests++;
            var that = this;
            parameters.dataLoader.loadImage (this.getImageFilename (tileX, tileY, zoomLevel), function (tile) {
                    that.cachedImages[key] = tile;
                    delete that.requestedImages[key];
                    that.imageRequests--;
                    var now = new Date();
                    if (that.imageRequests == 0 || now.getTime () > (that.lastOnLoadFiredAt + 50)) {
                        that.purgeCache ();
                        that.lastOnLoadFiredAt = now.getTime ();
                        that.onLoaded ();
                    }
                });
            this.requestedImages[key] = true;
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
