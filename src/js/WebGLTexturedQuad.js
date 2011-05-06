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
 * Creates a textured quad object.
 *
 * @class An abstraction for textured quads. Used in the
 * {@link bigshot.WebGLTexturedQuadScene}.
 *
 * @param {point} p the top-left corner of the quad
 * @param {vector} u vector pointing from p along the top edge of the quad
 * @param {vector} v vector pointing from p along the left edge of the quad
 * @param {WebGLTexture} the texture to use.
 */
bigshot.WebGLTexturedQuad = function (p, u, v, texture) {
    this.p = p;
    this.u = u;
    this.v = v;
    this.texture = texture;
    
    /**
     * Renders the quad using the given {@link bigshot.WebGL} instance.
     * Currently creates, fills, draws with and then deletes three buffers -
     * not very efficient, but works.
     *
     * @param {bigshot.WebGL} webGl the WebGL wrapper instance to use for rendering.
     */
    this.render = function (webGl) {
        var vertexPositionBuffer = webGl.gl.createBuffer();
        webGl.gl.bindBuffer(webGl.gl.ARRAY_BUFFER, vertexPositionBuffer);
        var vertices = [
            this.p.x, this.p.y,  this.p.z,
            this.p.x + this.u.x, this.p.y + this.u.y,  this.p.z + this.u.z,
            this.p.x + this.u.x + this.v.x, this.p.y + this.u.y + this.v.y,  this.p.z + this.u.z + this.v.z,
            this.p.x + this.v.x, this.p.y + this.v.y,  this.p.z + this.v.z
        ];
        webGl.gl.bufferData(webGl.gl.ARRAY_BUFFER, new Float32Array (vertices), webGl.gl.STATIC_DRAW);
        
        
        var textureCoordBuffer = webGl.gl.createBuffer();
        webGl.gl.bindBuffer(webGl.gl.ARRAY_BUFFER, textureCoordBuffer);
        var textureCoords = [
            // Front face
            0.0,  0.0,
            1.0,  0.0,
            1.0,  1.0,
            0.0,  1.0
        ];
        webGl.gl.bufferData(webGl.gl.ARRAY_BUFFER, new Float32Array (textureCoords), webGl.gl.STATIC_DRAW);
        
        var vertexIndexBuffer = webGl.gl.createBuffer();
        webGl.gl.bindBuffer(webGl.gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);            
        var vertexIndexes = [
            0, 2, 1,
            0, 3, 2
        ];
        webGl.gl.bufferData(webGl.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array (vertexIndexes), webGl.gl.STATIC_DRAW);
        
        webGl.gl.bindBuffer(webGl.gl.ARRAY_BUFFER, textureCoordBuffer);
        webGl.gl.vertexAttribPointer(webGl.shaderProgram.textureCoordAttribute, 2, webGl.gl.FLOAT, false, 0, 0);
        
        webGl.gl.bindBuffer(webGl.gl.ARRAY_BUFFER, vertexPositionBuffer);
        webGl.gl.vertexAttribPointer(webGl.shaderProgram.vertexPositionAttribute, 3, webGl.gl.FLOAT, false, 0, 0);
        
        webGl.gl.activeTexture(webGl.gl.TEXTURE0);
        webGl.gl.bindTexture(webGl.gl.TEXTURE_2D, this.texture);
        webGl.gl.uniform1i(webGl.shaderProgram.samplerUniform, 0);
        
        webGl.gl.bindBuffer(webGl.gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
        webGl.setMatrixUniforms();
        webGl.gl.drawElements(webGl.gl.TRIANGLES, 6, webGl.gl.UNSIGNED_SHORT, 0);
        
        webGl.gl.deleteBuffer (vertexPositionBuffer);
        webGl.gl.deleteBuffer (vertexIndexBuffer);
        webGl.gl.deleteBuffer (textureCoordBuffer);
    };
}
