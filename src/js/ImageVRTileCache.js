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
 * @class Img impl.
 */
bigshot.ImageVRTileCache = function (onloaded, onCacheInit, parameters) {
    this.imageTileCache = new bigshot.ImageTileCache (onloaded, onCacheInit, parameters);
    
    this.imageTileCache.setMaxTiles (999999, 999999);
    
    this.getTexture = function (tileX, tileY, zoomLevel) {
        var res = this.imageTileCache.getImage (tileX, tileY, zoomLevel);
        return res;
    }
    
    this.purge = function () {
        this.imageTileCache.resetUsed ();
    };
}
