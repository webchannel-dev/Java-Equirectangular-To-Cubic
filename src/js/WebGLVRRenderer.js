/*
 * Copyright 2010 - 2012 Leo Sutic <leo.sutic@gmail.com>
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
 * @class WebGL renderer.
 */
bigshot.WebGLVRRenderer = function (container) {
    this.container = container;
    this.canvas = document.createElement ("canvas");
    this.canvas.width = 480;
    this.canvas.height = 480;
    this.canvas.style.position = "absolute";
    this.container.appendChild (this.canvas);
    this.webGl = new bigshot.WebGL (this.canvas);
    this.webGl.initShaders();
    this.webGl.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.webGl.gl.blendFunc (this.webGl.gl.ONE, this.webGl.gl.ZERO);
    this.webGl.gl.enable (this.webGl.gl.BLEND);
    this.webGl.gl.disable(this.webGl.gl.DEPTH_TEST);
    this.webGl.gl.clearDepth(1.0);
}
    
bigshot.WebGLVRRenderer.prototype = {
    createTileCache : function (onloaded, onCacheInit, parameters) {
        return new bigshot.TextureTileCache (onloaded, onCacheInit, parameters, this.webGl);
    },
    
    createTexturedQuadScene : function () {
        return new bigshot.WebGLTexturedQuadScene (this.webGl);
    },
    
    supportsUpdate : function () {
        return false;
    },
    
    createTexturedQuad : function (p, u, v, texture) {
        return new bigshot.WebGLTexturedQuad (p, u, v, texture);
    },
    
    getViewportWidth : function () {
        return this.webGl.gl.viewportWidth;
    },
    
    getViewportHeight : function () {
        return this.webGl.gl.viewportHeight;
    },
    
    transformToWorld : function (v) {
        return this.webGl.transformToWorld (v);
    },
    
    transformToScreen : function (vector) {
        return this.webGl.transformToScreen (vector);
    },
    
    transformWorldToScreen : function (world) {
        return this.webGl.transformWorldToScreen (world);
    },
    
    beginRender : function (y, p, fov, tx, ty, tz, oy, op, or) {
        this.webGl.gl.viewport (0, 0, this.webGl.gl.viewportWidth, this.webGl.gl.viewportHeight);
        
        this.webGl.pMatrix.reset ();
        this.webGl.pMatrix.perspective (fov, this.webGl.gl.viewportWidth / this.webGl.gl.viewportHeight, 0.1, 100.0);
        
        this.webGl.mvMatrix.reset ();
        this.webGl.mvMatrix.translate ([tx, ty, tz]);
        this.webGl.mvMatrix.rotate (or, [0, 0, 1]);
        this.webGl.mvMatrix.rotate (op, [1, 0, 0]);
        this.webGl.mvMatrix.rotate (oy, [0, 1, 0]);
        this.webGl.mvMatrix.rotate (y, [0, 1, 0]);
        this.webGl.mvMatrix.rotate (p, [1, 0, 0]);
    },
    
    endRender : function () {
        
    },
    
    resize : function (w, h) {
        this.canvas.width = w;
        this.canvas.height = h;
        if (this.container.style.width != "") {
            this.container.style.width = w + "px";
        }
        if (this.container.style.height != "") {
            this.container.style.height = h + "px";
        }
    },
    
    onresize : function () {
        this.webGl.onresize ();
    }
}

bigshot.object.validate ("bigshot.WebGLVRRenderer", bigshot.VRRenderer);
