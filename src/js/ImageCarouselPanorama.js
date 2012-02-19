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
 * Creates a new panorama.
 *
 * @class A panorama viewer using a fixed set of images, suitable for
 * low-power devices. Only allows rotation around the yaw axis.
 *
 * @param {bigshot.ImageCarouselPanoramaParameters} parameters the panorama parameters
 */
bigshot.ImageCarouselPanorama = function (parameters) {
    bigshot.setupFileSystem (parameters);
    
    parameters.merge (parameters.fileSystem.getDescriptor (), false);
    
    this.renderer = new bigshot.ImageCarouselPanoramaVRRenderer (parameters);
    this.fileSystem = parameters.fileSystem;
    this.container = parameters.container;
    this.basePath = parameters.basePath;
    this.yaw = 0;
    this.steps = parameters.steps;
    this.suffix = parameters.suffix;
    this.browser = new bigshot.Browser ();
    var that = this;
    
    this.images = [];
    
    this.hotspots = [];
    
    var dragStart = null;
    
    /**
    * Adds a hotstpot.
    *
    * @param {bigshot.VRHotspot} hs the hotspot to add
    */
    this.addHotspot = function (hs) {
        this.hotspots.push (hs);
    }
    
    this.dragMouseDown = function (e) {
        this.dragStart = {
            clientX : e.clientX,
            clientY : e.clientY
        };
    }
    
    this.dragMouseMove = function (e) {
        if (this.dragStart) {
            var dx = e.clientX - this.dragStart.clientX;
            var scale = this.browser.getElementSize (this.container).w / (this.steps / 4);
            var stepsMoved = Math.round (dx / scale);
            var pixelsMoved = Math.round (stepsMoved * scale);
            this.dragStart.clientX += pixelsMoved;
            if (stepsMoved > 0) {
                this.yaw -= stepsMoved;
                if (this.yaw < 0) {
                    this.yaw %= this.steps;
                    this.yaw += this.steps;
                }
                this.render ();
            } else if (stepsMoved < 0) {
                this.yaw -= stepsMoved;
                if (this.yaw >= this.steps) {
                    this.yaw %= this.steps;
                }
                this.render ();
            }       
        }
    }
    
    this.dragMouseUp = function (e) {
        this.dragStart = null;
    }
    
    /**
        * Renders the panorama and any hotspots.
        */
    this.render = function () {
        this.renderer.beginRender (this.yaw * 360 / this.steps, 0, 60);
        this.browser.removeAllChildren (this.innerContainer);
        var s = this.browser.getElementSize (this.container);
        var img = this.images[this.yaw];
        this.innerContainer.appendChild (img);
        img.style.position = "relative";
        img.style.top = "0px";
        img.style.left = "0px";
        img.style.width = s.w + "px";
        img.style.height = s.h + "px";
        
        for (var i = 0; i < this.hotspots.length; ++i) {
            this.hotspots[i].layout ();
        }
        
        this.renderer.endRender ();
    }
    
    /**
    * Helper function to consume events.
    * @private
    */
    var consumeEvent = function (event) {
        if (event.preventDefault) {
            event.preventDefault ();
        }
        return false;
    };
    
    /**
        * Helper function to translate touch events to mouse-like events.
        * @private
        */
    var translateEvent = function (event) {
        if (event.clientX) {
            return event;
        } else {
            return {
                clientX : event.changedTouches[0].clientX,
                clientY : event.changedTouches[0].clientY
            };
        };
    };
    
    this.innerContainer = document.createElement ("div");
    this.innerContainer.style.position = "absolute";
    this.container.appendChild (this.innerContainer);
    
    this.glassPane = document.createElement ("div");
    this.glassPane.style.position = "relative";
    this.glassPane.style.width = "100%";
    this.glassPane.style.height = "100%";
    this.glassPane.style.zIndex = "1";
    this.container.appendChild (this.glassPane);
    
    this.browser.registerListener (this.glassPane, "mousedown", function (e) {
            that.dragMouseDown (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (this.glassPane, "touchstart", function (e) {
            that.dragMouseDown (translateEvent (e));
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (this.glassPane, "mouseup", function (e) {
            that.dragMouseUp (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (this.glassPane, "touchend", function (e) {
            that.dragMouseUp (translateEvent (e));
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (this.glassPane, 'mousemove', function (e) {
            that.dragMouseMove (e);
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (this.glassPane, 'mouseout', function (e) {
            return consumeEvent (e);
        }, false);
    this.browser.registerListener (this.glassPane, 'touchmove', function (e) {
            that.dragMouseMove (translateEvent (e));
            return consumeEvent (e);
        }, false);
    
    for (var i = 0; i < this.steps; ++i) {
        var img = document.createElement ("img");
        img.src = this.fileSystem.getFilename (i + this.suffix);
        
        this.images.push (img);
    }
}
