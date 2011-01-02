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

bigshot.WebGLDebug = false;

/**
 * Creates a new WebGL wrapper instance.
 *
 * @class WebGL WebGL wrapper for common bigshot.VRPanorama uses.
 */
bigshot.WebGL = function (canvas_) {
    
    this.canvas = canvas_;
    
    this.gl = bigshot.WebGLDebug ?
        WebGLDebugUtils.makeDebugContext(this.canvas.getContext("experimental-webgl"))
        :
        this.canvas.getContext("experimental-webgl");
    if (!this.gl) {
        alert("Could not initialise WebGL.");
        return;
    }    
    this.gl.viewportWidth = this.canvas.width;
    this.gl.viewportHeight = this.canvas.height;
    
    this.onresize = function () {
        this.gl.viewportWidth = this.canvas.width;
        this.gl.viewportHeight = this.canvas.height;
    }
    
    this.fragmentShader = 
        "#ifdef GL_ES\n" + 
        "    precision highp float;\n" + 
        "#endif\n" + 
        "\n" + 
        "varying vec2 vTextureCoord;\n" + 
        "\n" + 
        "uniform sampler2D uSampler;\n" + 
        "\n" + 
        "void main(void) {\n" + 
        "    gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));\n" + 
        "}\n";
    
    this.vertexShader = 
        "attribute vec3 aVertexPosition;\n" +
        "attribute vec2 aTextureCoord;\n" +
        "\n" +
        "uniform mat4 uMVMatrix;\n" +
        "uniform mat4 uPMatrix;\n" +
        "\n" +
        "varying vec2 vTextureCoord;\n" +
        "\n" +
        "void main(void) {\n" +
        "    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\n" +
        "    vTextureCoord = aTextureCoord;\n" +
        "}";
    
    this.createShader = function (source, type) {
        var shader = this.gl.createShader (type);
        this.gl.shaderSource (shader, source);
        this.gl.compileShader (shader);
        
        if (!this.gl.getShaderParameter (shader, this.gl.COMPILE_STATUS)) {
            alert (this.gl.getShaderInfoLog (shader));
            return null;
        }
        
        return shader;
    };
    
    this.createFragmentShader = function (source) {
        return this.createShader (source, this.gl.FRAGMENT_SHADER);
    };
    
    this.createVertexShader = function (source) {
        return this.createShader (source, this.gl.VERTEX_SHADER);
    };
    
    this.shaderProgram = null;
    
    this.initShaders = function () {
        this.shaderProgram = this.gl.createProgram ();
        this.gl.attachShader (this.shaderProgram, this.createVertexShader (this.vertexShader));
        this.gl.attachShader (this.shaderProgram, this.createFragmentShader (this.fragmentShader));
        this.gl.linkProgram (this.shaderProgram);
        
        if (!this.gl.getProgramParameter (this.shaderProgram, this.gl.LINK_STATUS)) {
            alert ("Could not initialise shaders");
            return;
        }
        
        this.gl.useProgram (this.shaderProgram);
        
        this.shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation (this.shaderProgram, "aVertexPosition");
        this.gl.enableVertexAttribArray (this.shaderProgram.vertexPositionAttribute);
        
        this.shaderProgram.textureCoordAttribute = this.gl.getAttribLocation (this.shaderProgram, "aTextureCoord");
        this.gl.enableVertexAttribArray (this.shaderProgram.textureCoordAttribute);
        
        this.shaderProgram.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
        this.shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
        this.shaderProgram.samplerUniform = this.gl.getUniformLocation(this.shaderProgram, "uSampler");
    };
    
    
    this.mvMatrix = null;
    this.mvMatrixStack = [];
    
    this.mvPushMatrix = function (matrix) {
        if (matrix) {
            this.mvMatrixStack.push (matrix.dup());
            this.mvMatrix = matrix.dup();
            return mvMatrix;
        } else {
            this.mvMatrixStack.push (this.mvMatrix.dup());
            return mvMatrix;
        }
    }
    
    this.mvPopMatrix = function () {
        if (this.mvMatrixStack.length == 0) {
            throw "Invalid popMatrix!";
        }
        this.mvMatrix = this.mvMatrixStack.pop();
        return mvMatrix;
    }
    
    this.mvReset = function () {
        this.mvMatrix = Matrix.I(4);
    }
    
    this.mvMultiply = function (matrix) {
        this.mvMatrix = this.mvMatrix.x (matrix);
    }
    
    this.mvTranslate = function (vector) {
        var m = Matrix.Translation($V([vector[0], vector[1], vector[2]])).ensure4x4 ();
        this.mvMultiply (m);
    }
    
    this.mvRotate = function (ang, vector) {
        var arad = ang * Math.PI / 180.0;
        var m = Matrix.Rotation(arad, $V([vector[0], vector[1], vector[2]])).ensure4x4 ();
        this.mvMultiply (m);
    }
    
    this.pMatrix = null;
    
    this.perspective = function (fovy, aspect, znear, zfar) {
        this.pMatrix = makePerspective (fovy, aspect, znear, zfar);
    }
    
    this.setMatrixUniforms = function () {
        this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, new Float32Array(this.pMatrix.flatten()));
        this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, new Float32Array(this.mvMatrix.flatten()));
    }
    
    this.createImageTextureFromImage = function (image) {
        var texture = this.gl.createTexture();
        texture.image = image;
        this.handleImageTextureLoaded (this, texture, image);
        return texture;
    }
    
    this.createImageTextureFromSource = function (source) {
        var image = new Image();
        var texture = this.gl.createTexture();
        texture.image = image;
        
        var that = this;
        image.onload = function () {
            that.handleImageTextureLoaded (that, texture, image);
        }
        
        image.src = source;
        
        return texture;
    }
    
    this.handleImageTextureLoaded = function (that, texture, image) {
        if (image.width == 0 || image.height == 0) {
            throw new Error("Invalid image dimensions for image:" + image.src);
        }
        
        that.gl.bindTexture(that.gl.TEXTURE_2D, texture);        
        that.gl.texImage2D(that.gl.TEXTURE_2D, 0, that.gl.RGBA, that.gl.RGBA, that.gl.UNSIGNED_BYTE, image);
        that.gl.texParameteri(that.gl.TEXTURE_2D, that.gl.TEXTURE_MAG_FILTER, that.gl.NEAREST);
        that.gl.texParameteri(that.gl.TEXTURE_2D, that.gl.TEXTURE_MIN_FILTER, that.gl.NEAREST);
        
        that.gl.bindTexture(that.gl.TEXTURE_2D, null);      
    }
    
    this.transformToWorld = function (vector) {
        var sylvesterVector = $V([vector[0], vector[1], vector[2], 1.0]);
        var world = this.mvMatrix.x (sylvesterVector);
        return world;
    }
    
    this.transformToScreen = function (vector) {
        var world = this.transformToWorld (vector);
        var screen = this.pMatrix.x (world);
        if (Math.abs (screen.e(4)) < Sylvester.precision) {
            return null;
        }
        var r = {
            x: this.gl.viewportWidth  * screen.e(1) / screen.e(4) + this.gl.viewportWidth / 2, 
            y: this.gl.viewportHeight * screen.e(2) / screen.e(4) + this.gl.viewportHeight / 2
        };
        return r;
    }
};

bigshot.WebGLTexturedQuad = function (p, u, v, texture) {
    this.p = p;
    this.u = u;
    this.v = v;
    this.texture = texture;
    
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

bigshot.WebGLTexturedQuadScene = function (webGl) {
    this.quads = new Array ();
    this.webGl = webGl;
    
    this.addQuad = function (quad) {
        this.quads.push (quad);
    }
    
    this.render = function () {
        for (var i = 0; i < this.quads.length; ++i) {
            this.quads[i].render (this.webGl);
        }
    };
};