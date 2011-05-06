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
 * Abstract base class for panorama hotspots.
 *
 * @class Abstract base class for panorama hotspots.
 *
 * A Hotspot is simply an HTML element that is moved / hidden etc.
 * to overlay a given position in the panorama.
 *
 * @param {bigshot.VRPanorama} panorama the panorama to attach this hotspot to
 */
bigshot.VRHotspot = function (panorama) {
    /**
     * Hides the hotspot if less than <code>frac</code> of its area is visible.
     * 
     * @param {number} frac the fraction (0.0 - 1.0) of the hotspot that must be visible for
     * it to be shown.
     * @type function(p,s)
     */
    this.CLIP_FRACTION = function (frac) {
        return function (p, s) {
            var r = {
                x0 : Math.max (p.x, 0),
                y0 : Math.max (p.y, 0),
                x1 : Math.min (p.x + s.w, panorama.renderer.getViewportWidth ()),
                y1 : Math.min (p.y + s.h, panorama.renderer.getViewportHeight ())
            };
            var full = s.w * s.h;
            var visibleWidth = (r.x1 - r.x0);
            var visibleHeight = (r.y1 - r.y0);
            if (visibleWidth > 0 && visibleHeight > 0) {
                var visible = visibleWidth * visibleHeight;
                
                return (visible / full) >= frac;
            } else {
                return false;
            }
        }
    }
    
    /**
     * Hides the hotspot if its center is outside the viewport.
     * 
     * @type function(p,s)
     */
    this.CLIP_CENTER = function () {
        return function (p, s) {
            var c = {
                x : p.x + s.w / 2,
                y : p.y + s.h / 2
            };
            return c.x >= 0 && c.x < panorama.renderer.getViewportWidth () && 
            c.y >= 0 && c.y < panorama.renderer.getViewportHeight ();
        }
    }
    
    /**
     * Resizes the hotspot to fit in the viewport. Hides the hotspot if 
     * it is completely outside the viewport.
     * 
     * @type function(p,s)
     */
    this.CLIP_ADJUST = function () {
        return function (p, s) {
            if (p.x < 0) {
                s.w -= -p.x;
                p.x = 0;
            }
            if (p.y < 0) {
                s.h -= -p.y;
                p.y = 0;
            }
            if (p.x + s.w > panorama.renderer.getViewportWidth ()) {
                s.w = panorama.renderer.getViewportWidth () - p.x - 1;
            }
            if (p.y + s.h > panorama.renderer.getViewportHeight ()) {
                s.h = panorama.renderer.getViewportHeight () - p.y - 1;
            }
            
            return s.w > 0 && s.h > 0;
        }
    }
    
    this.CLIP_ZOOM = function (s, maxDistanceInViewportHeights) {
        return function (p, cs) {
            if (p.x >= 0 && p.y >= 0 && (p.x + s.w) < panorama.renderer.getViewportWidth ()
                    && (p.y + s.h) < panorama.renderer.getViewportHeight ()) {
                        cs.w = s.w;
                        cs.h = s.h;
                        return true;
                    }
            
            var distance = 0;
            if (p.x < 0) {
                distance = Math.max (-p.x, distance);
            }
            if (p.y < 0) {
                distance = Math.max (-p.y, distance);
            }
            if (p.x + s.w > panorama.renderer.getViewportWidth ()) {
                distance = Math.max (p.x + s.w - panorama.renderer.getViewportWidth (), distance);
            }
            if (p.y + s.h > panorama.renderer.getViewportHeight ()) {
                distance = Math.max (p.y + s.h - panorama.renderer.getViewportHeight (), distance);
            }
            
            distance /= panorama.renderer.getViewportHeight ();
            if (distance > maxDistanceInViewportHeights) {
                return false;
            }
            
            var scale = 1 / (1 + distance);
            
            cs.w = s.w * scale;
            cs.h = s.w * scale;
            if (p.x < 0) {
                p.x = 0;
            }
            if (p.y < 0) {
                p.y = 0;
            }
            if (p.x + cs.w > panorama.renderer.getViewportWidth ()) {
                p.x = panorama.renderer.getViewportWidth () - cs.w;
            }
            if (p.y + cs.h > panorama.renderer.getViewportHeight ()) {
                p.y = panorama.renderer.getViewportHeight () - cs.h;
            }
            
            return true;
        }
    }
    
    /**
     * The method to use for dealing with hotspots that extend outside the 
     * viewport. Note that {@link #CLIP_ADJUST} et al are functions, not constants.
     * To set the value, you must call the function to get a clipping strategy:
     *
     * @example
     * var hotspot = ...;
     * // note the function call below ---------------v
     * hotspot.clippingStrategy = hotspot.CLIP_ADJUST ();
     *
     * @see bigshot.VRHotspot#CLIP_ADJUST
     * @see bigshot.VRHotspot#CLIP_CENTER
     * @see bigshot.VRHotspot#CLIP_FRACTION
     * @type function(p,s)
     * @default bigshot.VRHotspot#CLIP_ADJUST
     */
    this.clippingStrategy = this.CLIP_ADJUST ();
    
    /**
     * Layout and resize the hotspot. Called by the panorama.
     */
    this.layout = function () {};
    
    /**
     * Helper function to rotate a point around an axis.
     *
     * @param {number} ang the angle
     * @param {number[3]} vector the vector to rotate around
     * @param {Vector} point the point
     * @type Vector
     * @private
     */
    this.rotate = function (ang, vector, point) {
        var arad = ang * Math.PI / 180.0;
        var m = Matrix.Rotation(arad, $V([vector[0], vector[1], vector[2]])).ensure4x4 ();
        return m.x (point);
    }
    
    /**
     * Converts the polar coordinates to world coordinates.
     * The distance is assumed to be 1.0.
     *
     * @param yaw the yaw, in degrees
     * @param pitch the pitch, in degrees
     * @type number[3]
     */
    this.toVector = function (yaw, pitch) {
        var point = $V([0, 0, -1, 1]);
        point = this.rotate (-pitch, [1, 0, 0], point);
        point = this.rotate (-yaw, [0, 1, 0], point);
        var res = [point.e(1), point.e(2), point.e(3)];
        return res;
    }
    
    /**
     * Converts the world-coordinate point p to screen coordinates.
     *
     * @param {number[3]} p the world-coordinate point
     * @type point
     */
    this.toScreen = function (p) {
        var res = panorama.renderer.transformToScreen (p)
        return res;
    }
    
    /**
     * Clips the hotspot against the viewport. Both parameters 
     * are in/out. Clipping is done by adjusting the values of the
     * parameters.
     *
     * @param {point} p the top-left corner of the hotspot, in pixels.
     * @param {size} s the width and height of the hotspot, in pixels
     * @type boolean
     * @return true if the hotspot is visible, false otherwise
     */
    this.clip = function (p, s) {
        return this.clippingStrategy (p, s);
    }
}
