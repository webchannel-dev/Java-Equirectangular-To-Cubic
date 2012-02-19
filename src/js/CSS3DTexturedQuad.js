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
 * Creates a textured quad object.
 *
 * @class An abstraction for textured quads. Used in the
 * {@link bigshot.CSS3DTexturedQuadScene}.
 *
 * @param {point} p the top-left corner of the quad
 * @param {vector} u vector pointing from p along the top edge of the quad
 * @param {vector} v vector pointing from p along the left edge of the quad
 * @param {HTMLImageElement} the image to use.
 */
bigshot.CSS3DTexturedQuad = function (p, u, v, image) {
    this.p = p;
    this.u = u;
    this.v = v;
    this.image = image;
}

bigshot.CSS3DTexturedQuad.prototype = {
    crossProduct : function (a,b) {
        var x = [
            a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]
        ];
        return x;
    },
    
    vecToStr : function (u) {
        return (u[0]) + "," + (u[1]) + "," + (u[2]);
    },
    
    quadTransform : function (tl, u, v) {
        var w = this.crossProduct (u, v);
        var res = 
            "matrix3d(" + 
            this.vecToStr (u) + ",0," + 
        this.vecToStr (v) + ",0," + 
        this.vecToStr (w) + ",0," + 
        this.vecToStr (tl) + ",1)";
        return res;
    },
    
    norm : function (vec) {
        return Math.sqrt (vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
    },
    
    /**
     * Renders the quad.
     */
    render : function (world, scale, view) {
        var s = scale / (this.image.width - 1);
        var ps = scale * 1.0;
        var p = this.p;
        var u = this.u;
        var v = this.v;
        
        this.image.style.position = "absolute";
        if (!this.image.inWorld || this.image.inWorld != 1) {
            world.appendChild (this.image);
        }
        this.image.inWorld = 2;
        this.image.style.WebkitTransformOrigin = "0px 0px 0px";
        this.image.style.WebkitTransform = 
            this.quadTransform ([(p.x + view.x) * ps, (-p.y + view.y) * ps, (p.z + view.z) * ps], [u.x * s, -u.y * s, u.z * s], [v.x * s, -v.y * s, v.z * s]);
    }
}
