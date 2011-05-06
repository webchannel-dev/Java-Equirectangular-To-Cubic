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
* @class Simple Transform-based renderer.
*
* @augments bigshot.VRRenderer
*/
bigshot.ImageCarouselPanoramaVRRenderer = function (parameters) {
    this.browser = new bigshot.Browser ();
    this.container = parameters.container;
    
    this.createTileCache = function (onloaded, parameters) {
        return null;
    };
    
    this.createTexturedQuadScene = function () {
        return null;
    };
    
    this.createTexturedQuad = function (p, u, v, texture) {
        return null;
    };
    
    this.supportsUpdate = function () {
        return false;
    }
    
    this.getViewportWidth = function () {
        return this.browser.getElementSize (this.container).w;
    };
    
    this.getViewportHeight = function () {
        return this.browser.getElementSize (this.container).h;
    };
    
    this.resize = function (w, h) {
    };
    
    this.onresize = function () {
    };
    
    this.mvMatrix = new bigshot.TransformStack ();
    
    /**
        * Transforms a vector to world coordinates.
        *
        * @param {vector} vector the vector to transform
        */
    this.transformToWorld = function (vector) {
        var sylvesterVector = $V([vector[0], vector[1], vector[2], 1.0]);
        
        var world = this.mvMatrix.matrix ().x (sylvesterVector);
        return world;
    }
    
    this.transformWorldToScreen = function (world) {
        if (world.e(3) > 0) {
            return null;
        }
        
        var screen = this.pMatrix.matrix ().x (world);
        if (Math.abs (screen.e(4)) < Sylvester.precision) {
            return null;
        }
        var r = {
            x: (this.getViewportWidth () / 2) * screen.e(1) / screen.e(4) + this.getViewportWidth () / 2, 
            y: - (this.getViewportHeight () / 2) * screen.e(2) / screen.e(4) + this.getViewportHeight () / 2
        };
        return r;
    }
    
    /**
        * Transforms a vector to screen coordinates.
        *
        * @param {vector} vector the vector to transform
        * @return the transformed vector, or null if the vector is nearer than the near-z plane.
        */
    this.transformToScreen = function (vector) {
        var world = this.transformToWorld (vector);
        return this.transformWorldToScreen (world);
    }
    
    this.yaw = 0;
    this.pitch = 0;
    this.fov = 0;
    this.pMatrix = new bigshot.TransformStack ();
    
    this.beginRender = function (y, p, fov) {
        this.yaw = y;
        this.pitch = p;
        this.fov = fov;
        
        this.mvMatrix.reset ();
        this.mvMatrix.rotate (this.yaw, [0, 1, 0]);
        this.mvMatrix.rotate (this.pitch, [1, 0, 0]);
        
        this.pMatrix.reset ();
        this.pMatrix.perspective (this.fov, this.getViewportWidth () / this.getViewportHeight (), 0.1, 100.0);
    }
    
    this.endRender = function () {
        
    }    
}
    
