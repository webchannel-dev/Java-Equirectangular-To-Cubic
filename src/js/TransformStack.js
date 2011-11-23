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
 * Creates a new transformation stack, initialized to the identity transform.
 *
 * @class A 3D transformation stack.
 */
bigshot.TransformStack = function () {
    /**
     * The current transform matrix.
     *
     * @type Matrix
     */
    this.mvMatrix = null;
    
    /**
     * The object-to-world transform matrix stack.
     *
     * @type Matrix[]
     */
    this.mvMatrixStack = [];
    
    /**
     * Pushes the current world transform onto the stack
     * and returns a new, identical one.
     *
     * @return the new world transform matrix
     * @param {Matrix} [matrix] the new world transform. 
     * If omitted, the current is used
     * @type Matrix
     */
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
    
    /**
     * Pops the last-pushed world transform off the stack, thereby restoring it.
     *
     * @type Matrix
     * @return the previously-pushed matrix
     */
    this.mvPopMatrix = function () {
        if (this.mvMatrixStack.length == 0) {
            throw new Error ("Invalid popMatrix!");
        }
        this.mvMatrix = this.mvMatrixStack.pop();
        return mvMatrix;
    }
    
    /**
     * Resets the world transform to the identity transform.
     */
    this.reset = function () {
        this.mvMatrix = Matrix.I(4);
    }
    
    /**
     * Multiplies the current world transform with a matrix.
     *
     * @param {Matrix} matrix the matrix to multiply with
     */
    this.mvMultiply = function (matrix) {
        this.mvMatrix = matrix.x (this.mvMatrix);
    }
    
    /**
     * Adds a translation to the world transform matrix.
     *
     * @param {number[3]} vector the translation vector
     */
    this.translate = function (vector) {
        var m = Matrix.Translation($V([vector[0], vector[1], vector[2]])).ensure4x4 ();
        this.mvMultiply (m);
    }
    
    /**
     * Adds a rotation to the world transform matrix.
     *
     * @param {number} ang the angle in degrees to rotate
     * @param {number[3]} vector the rotation vector
     */
    this.rotate = function (ang, vector) {
        var arad = ang * Math.PI / 180.0;
        var m = Matrix.Rotation(arad, $V([vector[0], vector[1], vector[2]])).ensure4x4 ();
        this.mvMultiply (m);
    }
    
    /**
     * Multiplies the current matrix with a 
     * perspective transformation matrix.
     *
     * @param {number} fovy vertical field of view
     * @param {number} aspect viewport aspect ratio
     * @param {number} znear near image plane
     * @param {number} zfar far image plane
     */
    this.perspective = function (fovy, aspect, znear, zfar) {
        var m = makePerspective (fovy, aspect, znear, zfar);
        this.mvMultiply (m);
    }
    
    this.matrix = function () {
        return this.mvMatrix;
    }
    
    this.reset ();
}
