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
}

bigshot.WebGLTexturedQuadScene.prototype = {
    /** 
     * Adds a new quad to the scene.
     */
    addQuad : function (quad) {
        this.quads.push (quad);
    },
    
    /** 
     * Renders all quads.
     */
    render : function () {
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
        
        for (var i = 0; i < this.quads.length; ++i) {
            this.quads[i].render (this.webGl, vertexPositionBuffer, textureCoordBuffer, vertexIndexBuffer);
        }
        
        this.webGl.gl.deleteBuffer (vertexPositionBuffer);
        this.webGl.gl.deleteBuffer (vertexIndexBuffer);
        this.webGl.gl.deleteBuffer (textureCoordBuffer);
    }
};
