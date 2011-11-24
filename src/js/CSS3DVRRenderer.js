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
 * @class CSS 3D Transform-based renderer.
 *
 * @augments bigshot.VRRenderer
 */
bigshot.CSS3DVRRenderer = function (_container) {
    this.container = _container;
    this.canvasOrigin = document.createElement ("div");
    
    this.canvasOrigin.style.WebkitTransformOrigin = "0px 0px 0px";
    this.canvasOrigin.style.WebkitTransformStyle = "preserve-3d";
    this.canvasOrigin.style.WebkitPerspective= "600px";
    
    this.canvasOrigin.style.position = "relative";
    this.canvasOrigin.style.left = "50%";
    this.canvasOrigin.style.top = "50%";
    
    this.container.appendChild (this.canvasOrigin);
    
    this.viewport = document.createElement ("div");
    this.viewport.style.WebkitTransformOrigin = "0px 0px 0px";
    this.viewport.style.WebkitTransformStyle = "preserve-3d";
    this.canvasOrigin.appendChild (this.viewport);
    
    this.world = document.createElement ("div");
    this.world.style.WebkitTransformOrigin = "0px 0px 0px";
    this.world.style.WebkitTransformStyle = "preserve-3d";
    this.viewport.appendChild (this.world);
    
    this.browser.removeAllChildren (this.world);
    
    this.view = null;
    
    this.mvMatrix = new bigshot.TransformStack ();
    
    this.yaw = 0;
    this.pitch = 0;
    this.fov = 0;
    this.pMatrix = new bigshot.TransformStack ();
    
    this.onresize = function () {
    };    
}

bigshot.CSS3DVRRenderer.prototype = {
    browser : new bigshot.Browser (),
    
    createTileCache : function (onloaded, onCacheInit, parameters) {
        return new bigshot.ImageVRTileCache (onloaded, onCacheInit, parameters);
    },
    
    createTexturedQuadScene : function () {
        return new bigshot.CSS3DTexturedQuadScene (this.world, 128, this.view);
    },
    
    createTexturedQuad : function (p, u, v, texture) {
        return new bigshot.CSS3DTexturedQuad (p, u, v, texture);
    },
    
    supportsUpdate : function () {
        return false;
    },
    
    getViewportWidth : function () {
        return this.browser.getElementSize (this.container).w;
    },
    
    getViewportHeight : function () {
        return this.browser.getElementSize (this.container).h;
    },
    
    resize : function (w, h) {
        if (this.container.style.width != "") {
            this.container.style.width = w + "px";
        }
        if (this.container.style.height != "") {
            this.container.style.height = h + "px";
        }
    },
    
    /**
     * Transforms a vector to world coordinates.
     *
     * @param {vector} vector the vector to transform
     */
    transformToWorld : function (vector) {
        var sylvesterVector = $V([vector[0], vector[1], vector[2], 1.0]);
        
        var world = this.mvMatrix.matrix ().x (sylvesterVector);
        return world;
    },
    
    transformWorldToScreen : function (world) {
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
    },
    
    /**
     * Transforms a vector to screen coordinates.
     *
     * @param {vector} vector the vector to transform
     * @return the transformed vector, or null if the vector is nearer than the near-z plane.
     */
    transformToScreen : function (vector) {
        var world = this.transformToWorld (vector);
        return this.transformWorldToScreen (world);
    },
    
    beginRender : function (y, p, fov, tx, ty, tz, oy, op, or) {
        this.yaw = y;
        this.pitch = p;
        this.fov = fov;
        
        var halfFovInRad = 0.5 * fov * Math.PI / 180;
        var halfHeight = this.getViewportHeight () / 2;
        var perspectiveDistance = halfHeight / Math.tan (halfFovInRad);
        
        this.mvMatrix.reset ();
        
        this.mvMatrix.translate ([tx, ty, tz]);
        this.view = {
            x : tx,
            y : ty,
            z : tz
        };
        
        this.mvMatrix.rotate (or, [0, 0, 1]);
        this.mvMatrix.rotate (op, [1, 0, 0]);
        this.mvMatrix.rotate (oy, [0, 1, 0]);
        
        this.mvMatrix.rotate (this.yaw, [0, 1, 0]);
        this.mvMatrix.rotate (this.pitch, [1, 0, 0]);
        
        
        this.pMatrix.reset ();
        this.pMatrix.perspective (this.fov, this.getViewportWidth () / this.getViewportHeight (), 0.1, 100.0);
        
        this.canvasOrigin.style.WebkitPerspective= perspectiveDistance + "px";
        
        for (var i = this.world.children.length - 1; i >= 0; --i) {
            this.world.children[i].inWorld = 1;
        }
        
        this.world.style.WebkitTransform = 
            "rotate3d(1,0,0," + (-p) + "deg) " +
            "rotate3d(0,1,0," + y + "deg) " +
            "rotate3d(0,1,0," + (oy) + "deg) " +
            "rotate3d(1,0,0," + (-op) + "deg) " +
            "rotate3d(0,0,1," + (-or) + "deg) ";
        this.world.style.WebkitTransformStyle = "preserve-3d";
        this.world.style.WebKitBackfaceVisibility = "hidden";
        
        this.viewport.style.WebkitTransform = 
            "translateZ(" + perspectiveDistance + "px)";
    },
    
    endRender : function () {
        for (var i = this.world.children.length - 1; i >= 0; --i) {
            var child = this.world.children[i];
            if (!child.inWorld || child.inWorld != 2) {
                delete child.inWorld;
                this.world.removeChild (child);
            }
        }
    }    
}
