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
 * @class An adaptive LOD monitor.
 */
bigshot.AdaptiveLODMonitor = function (vrPanorama, targetFps, tolerance, rate, minMag, maxMag) {
    this.currentAdaptiveMagnification = maxMag;
    
    this.frames = 0;
    this.samples = 0;
    this.renderTimeTotal = 0;
    this.renderTimeLast = 0;
    this.samplesLast = 0;
    
    this.targetFps = targetFps;
    
    this.targetTime = 1000 / this.targetFps;
    
    this.lowerTime = this.targetTime / tolerance;
    this.upperTime = this.targetTime * tolerance;
    
    this.averageRenderTime = function () {
        if (this.samples > 0) {
            return this.renderTimeTotal / this.samples;
        } else {
            return -1;
        }
    }
    
    this.averageRenderTimeLast = function () {
        if (this.samples > 0) {
            return this.renderTimeLast / this.samplesLast;
        } else {
            return -1;
        }
    }
    
    this.increaseDetail = function () {
        this.currentAdaptiveMagnification = Math.max (minMag, this.currentAdaptiveMagnification / (1.0 + rate));
    };
    
    this.decreaseDetail = function () {
        this.currentAdaptiveMagnification = Math.min (maxMag, this.currentAdaptiveMagnification * (1.0 + rate));
    };
    
    this.sample = function () {
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
    };
    
    this.startTime = 0;
    this.lastRender = 0;
    
    this.hqRender = false;
    this.hqMode = false;
    this.hqRenderWaiting = false;
    
    this.hqRenderTick = function () {
        if (this.lastRender < new Date ().getTime () - 1000) {
            this.hqRender = true;
            this.hqMode = true;
            vrPanorama.setMaxTextureMagnification (minMag);
            vrPanorama.render ();
            
            this.hqRender = false;
            this.hqRenderWaiting = false;
        } else {
            var that = this;
            setTimeout (function () {
                    that.hqRenderTick ();
                }, 1000);
        }
    };
    
    this.listener = function (state, cause, data) {
        if (this.hqRender) {
            return;
        }
        
        if (this.hqMode && cause == vrPanorama.ONRENDER_CAUSE_TEXTURE_UPDATE) {
            vrPanorama.setMaxTextureMagnification (minMag);
            return;
        } else {
            this.hqMode = false;
        }
        
        vrPanorama.setMaxTextureMagnification (this.currentAdaptiveMagnification);
        
        this.frames++;
        if ((this.frames < 20 || this.frames % 5 == 0) && state == vrPanorama.ONRENDER_BEGIN) {
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
                    }, 1000);
            }
        }
    };
    
    this.getListener = function () {
        var that = this;
        return function (state, cause, data) {
            that.listener (state, cause, data);
        }                    
    };
    return this.getListener ();
};
