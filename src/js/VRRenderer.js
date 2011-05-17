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
 * @class Abstract base for 3d rendering system.
 */
bigshot.VRRenderer = function () {
    /**
     * Creates a new bigshot.TileCache, appropriate for the rendering system.
     */
    this.createTileCache = function (onloaded, parameters) {};
    
    /**
     * Creates a bigshot.TexturedQuadScene.
     */
    this.createTexturedQuadScene = function () {};
    
    /**
     * Creates a bigshot.TexturedQuad.
     */
    this.createTexturedQuad = function (p, u, v, texture) {};
    
    /**
     * Returns the viewport width, in pixels.
     *
     * @type int
     */
    this.getViewportWidth = function () {};
    
    /**
     * Returns the viewport height, in pixels.
     *
     * @type int
     */
    this.getViewportHeight = function () {};
    this.transformToWorld = function (v) {};
    this.transformWorldToScreen = function (worldVector) {};
    this.transformToScreen = function (vector) {};
    this.beginRender = function (y, p, fov, tx, ty, tz, oy, op, or) {};
    this.endRender = function () {};
    this.onresize = function () {};
    this.resize = function (w, h) {};
}
