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
 * @class Abstract VR renderer base class.
 */
bigshot.AbstractVRRenderer = function () {
}

bigshot.AbstractVRRenderer.prototype = {
    /**
     * Transforms a vector to world coordinates.
     *
     * @param {vector} vector the vector to transform
     */
    transformToWorld : function transformToWorld (vector) {
        if (vector.length != 4) {
            vector = vector.slice (0);
            vector.push (1.0);
        }
        var sylvesterVector = Vector.createNoCopy (vector);
        
        var world = this.mvMatrix.matrix ().xvec (sylvesterVector);
        
        return world;
    },
    
    transformWorldToScreen : function transformWorldToScreen (world) {
        if (world.elements[2] > 0) {
            return null;
        }
        
        var screen = this.pMatrix.matrix ().xvec (world);
        if (Math.abs (screen.elements[3]) < Sylvester.precision) {
            return null;
        }
        
        var sel = screen.elements;
        var sx = sel[0];
        var sy = sel[1];
        var sz = sel[3];
        var vw = this.getViewportWidth ();
        var vh = this.getViewportHeight ();
        
        var r = {
            x: (vw / 2) * sx / sz + vw / 2, 
            y: - (vh / 2) * sy / sz + vh / 2
        };
        return r;
    },
    
    /**
     * Transforms a vector to screen coordinates.
     *
     * @param {vector} vector the vector to transform
     * @return the transformed vector, or null if the vector is nearer than the near-z plane.
     */
    transformToScreen : function transformToScreen (vector) {
        if (vector.length != 4) {
            vector = vector.slice (0);
            vector.push (1.0);
        }
        
        var sel = this.mvpMatrix.xvecarray (vector);
        
        if (sel[2] < 0) {
            return null;
        }
        
        var sz = sel[3];
        
        if (Math.abs (sz) < Sylvester.precision) {
            return null;
        }
        
        var sx = sel[0];
        var sy = sel[1];
        var vw = this.getViewportWidth ();
        var vh = this.getViewportHeight ();
        
        var r = {
            x: (vw / 2) * sx / sz + vw / 2, 
            y: - (vh / 2) * sy / sz + vh / 2
        };

        return r;
    }
}
