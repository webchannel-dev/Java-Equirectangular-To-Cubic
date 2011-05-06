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
 * Creates a new image layer.
 * 
 * @param {bigshot.Image} image the image that this layer is part of
 * @param {bigshot.ImageParameters} parameters the associated image parameters
 * @param {number} w the current width in css pixels of the viewport
 * @param {number} h the current height in css pixels of the viewport
 * @param {bigshot.ImageTileCache} itc the tile cache to use
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
    
