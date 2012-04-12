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
 * @class An adaptive LOD monitor. Use the {@link #getListener} to 
 * get a render listener.
 */
bigshot.AdaptiveLODMonitor = function (parameters) {
    this.setParameters (parameters);
    
    this.currentAdaptiveMagnification = parameters.vrPanorama.getMaxTextureMagnification ();
    
    this.frames = 0;
    this.samples = 0;
    this.renderTimeTotal = 0;
    this.renderTimeLast = 0;
    this.samplesLast = 0;
    
    this.startTime = 0;
    this.lastRender = 0;
    
    this.hqRender = false;
    this.hqMode = false;
    this.hqRenderWaiting = false;
    
    var that = this;
    this.listenerFunction = function (state, cause, data) {
        that.listener (state, cause, data);
    };         
};

bigshot.AdaptiveLODMonitor.prototype = {
    averageRenderTime : function () {
        if (this.samples > 0) {
            return this.renderTimeTotal / this.samples;
        } else {
            return -1;
        }
    },
    
    /**
	 * @param {bigshot.AdaptiveLODMonitorParameters} parameters
	 */
    setParameters : function (parameters) {
        this.parameters = parameters;
        this.targetTime = 1000 / this.parameters.targetFps;
        
        this.lowerTime = this.targetTime / (1.0 + this.parameters.tolerance);
        this.upperTime = this.targetTime * (1.0 + this.parameters.tolerance);
    },
    
    averageRenderTimeLast : function () {
        if (this.samples > 0) {
            return this.renderTimeLast / this.samplesLast;
        } else {
            return -1;
        }
    },
    
    getListener : function () {
        return this.listenerFunction;
    },
    
    increaseDetail : function () {
        this.currentAdaptiveMagnification = Math.max (this.parameters.minMag, this.currentAdaptiveMagnification / (1.0 + this.parameters.rate));
    },
    
    decreaseDetail : function () {
        this.currentAdaptiveMagnification = Math.min (this.parameters.maxMag, this.currentAdaptiveMagnification * (1.0 + this.parameters.rate));
    },
    
    sample : function () {
        var deltat = new Date ().getTime () - this.startTime;
        this.samples++;
        this.renderTimeTotal += deltat;
        
        this.samplesLast++;
        this.renderTimeLast += deltat;
        
        if (this.samplesLast > 4) {
            var averageLast = this.renderTimeLast / this.samplesLast;                        
            
            if (averageLast < this.lowerTime) {
                this.increaseDetail ();
            } else if (averageLast > this.upperTime) {
                this.decreaseDetail ();
            }
            
            this.samplesLast = 0;
            this.renderTimeLast = 0;
        }
    },
    
    hqRenderTick : function () {
        if (this.lastRender < new Date ().getTime () - this.parameters.hqRenderDelay) {
            this.hqRender = true;
            this.hqMode = true;
            this.parameters.vrPanorama.setMaxTextureMagnification (this.parameters.hqRenderMag);
            this.parameters.vrPanorama.render ();
            
            this.hqRender = false;
            this.hqRenderWaiting = false;
        } else {
            var that = this;
            setTimeout (function () {
                    that.hqRenderTick ();
                }, this.parameters.hqRenderInterval);
        }
    },
    
    listener : function (state, cause, data) {
        if (this.hqRender) {
            return;
        }
        
        if (this.hqMode && cause == bigshot.VRPanorama.ONRENDER_TEXTURE_UPDATE) {
            this.parameters.vrPanorama.setMaxTextureMagnification (this.parameters.minMag);
            return;
        } else {
            this.hqMode = false;
        }
        
        this.parameters.vrPanorama.setMaxTextureMagnification (this.currentAdaptiveMagnification);
        
        this.frames++;
        if ((this.frames < 20 || this.frames % 5 == 0) && state == bigshot.VRPanorama.ONRENDER_BEGIN) {
            this.startTime = new Date ().getTime ();
            this.lastRender = this.startTime;
            var that = this;
            setTimeout (function () {
                    that.sample ();
                }, 1);
            if (!this.hqRenderWaiting) {
                this.hqRenderWaiting = true;
                setTimeout (function () {
                        that.hqRenderTick ();
                    }, this.parameters.hqRenderInterval);
            }
        }
    }
};
