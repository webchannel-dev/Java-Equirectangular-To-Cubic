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
    this.buffers = this.setupBuffers ();
}

bigshot.WebGLVRRenderer.prototype = {
    createTileCache : function (onloaded, onCacheInit, parameters) {
        return new bigshot.TextureTileCache (onloaded, onCacheInit, parameters, this.webGl);
    },
    
    createTexturedQuadScene : function () {
        return new bigshot.WebGLTexturedQuadScene (this.webGl, this.buffers);
    },
    
    setupBuffers : function () {
        var vertexPositionBuffer = this.webGl.gl.createBuffer();
        
        var textureCoordBuffer = this.webGl.gl.createBuffer();
        this.webGl.gl.bindBuffer(this.webGl.gl.ARRAY_BUFFER, textureCoordBuffer);
        var textureCoords = [
            // Front face
            0.0,  0.0,
            1.0,  0.0,
            1.0,  1.0,
            0.0,  1.0
        ];
        this.webGl.gl.bufferData (this.webGl.gl.ARRAY_BUFFER, new Float32Array (textureCoords), this.webGl.gl.STATIC_DRAW);
        
        var vertexIndexBuffer = this.webGl.gl.createBuffer();
        this.webGl.gl.bindBuffer(this.webGl.gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);            
        var vertexIndexes = [
            0, 2, 1,
            0, 3, 2
        ];
        this.webGl.gl.bufferData(this.webGl.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array (vertexIndexes), this.webGl.gl.STATIC_DRAW);
        
        this.webGl.gl.bindBuffer(this.webGl.gl.ARRAY_BUFFER, textureCoordBuffer);
        this.webGl.gl.vertexAttribPointer(this.webGl.shaderProgram.textureCoordAttribute, 2, this.webGl.gl.FLOAT, false, 0, 0);
        
        this.webGl.gl.bindBuffer(this.webGl.gl.ARRAY_BUFFER, vertexPositionBuffer);
        this.webGl.gl.vertexAttribPointer(this.webGl.shaderProgram.vertexPositionAttribute, 3, this.webGl.gl.FLOAT, false, 0, 0);
        
        return {
            vertexPositionBuffer : vertexPositionBuffer,
            textureCoordBuffer : textureCoordBuffer,
            vertexIndexBuffer : vertexIndexBuffer
        };
    },
    
    dispose : function () {
        this.disposeBuffers ();
    },
    
    disposeBuffers : function () {
        this.webGl.gl.deleteBuffer (this.buffers.vertexPositionBuffer);
        this.webGl.gl.deleteBuffer (this.buffers.vertexIndexBuffer);
        this.webGl.gl.deleteBuffer (this.buffers.textureCoordBuffer);
    },
    
    getElement : function () {
        return this.canvas;
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
    
    beginRender : function (y, p, fov, tx, ty, tz, oy, op, or) {
        this.webGl.gl.viewport (0, 0, this.webGl.gl.viewportWidth, this.webGl.gl.viewportHeight);
        
        this.webGl.pMatrix.reset ();
        this.webGl.pMatrix.perspective (fov, this.webGl.gl.viewportWidth / this.webGl.gl.viewportHeight, 0.1, 100.0);
        
        this.webGl.mvMatrix.reset ();
        this.webGl.mvMatrix.translate ({ x : tz, y : ty, z : tz });
        this.webGl.mvMatrix.rotateZ (or);
        this.webGl.mvMatrix.rotateX (op);
        this.webGl.mvMatrix.rotateY (oy);
        this.webGl.mvMatrix.rotateY (y);
        this.webGl.mvMatrix.rotateX (p);
        
        this.mvMatrix = this.webGl.mvMatrix;
        this.pMatrix = this.webGl.pMatrix;
        this.mvpMatrix = this.pMatrix.matrix ().multiply (this.mvMatrix.matrix ());
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

bigshot.object.extend (bigshot.WebGLVRRenderer, bigshot.AbstractVRRenderer);
bigshot.object.validate ("bigshot.WebGLVRRenderer", bigshot.VRRenderer);
