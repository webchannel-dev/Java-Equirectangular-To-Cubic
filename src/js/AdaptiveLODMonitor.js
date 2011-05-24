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
bigshot.AdaptiveLODMonitor = function (parameters) {
    this.currentAdaptiveMagnification = parameters.vrPanorama.getMaxTextureMagnification ();
    
    this.frames = 0;
    this.samples = 0;
    this.renderTimeTotal = 0;
    this.renderTimeLast = 0;
    this.samplesLast = 0;
    
    this.targetTime = 1000 / parameters.targetFps;
    
    this.lowerTime = this.targetTime / (1.0 + parameters.tolerance);
    this.upperTime = this.targetTime * (1.0 + parameters.tolerance);
    
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
        this.currentAdaptiveMagnification = Math.max (parameters.minMag, this.currentAdaptiveMagnification / (1.0 + parameters.rate));
    };
    
    this.decreaseDetail = function () {
        this.currentAdaptiveMagnification = Math.min (parameters.maxMag, this.currentAdaptiveMagnification * (1.0 + parameters.rate));
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
        if (this.lastRender < new Date ().getTime () - parameters.hqRenderDelay) {
            this.hqRender = true;
            this.hqMode = true;
            parameters.vrPanorama.setMaxTextureMagnification (parameters.hqRenderMag);
            parameters.vrPanorama.render ();
            
            this.hqRender = false;
            this.hqRenderWaiting = false;
        } else {
            var that = this;
            setTimeout (function () {
                    that.hqRenderTick ();
                }, parameters.hqRenderInterval);
        }
    };
    
    this.listener = function (state, cause, data) {
        if (this.hqRender) {
            return;
        }
        
        if (this.hqMode && cause == parameters.vrPanorama.ONRENDER_TEXTURE_UPDATE) {
            parameters.vrPanorama.setMaxTextureMagnification (parameters.minMag);
            return;
        } else {
            this.hqMode = false;
        }
        
        parameters.vrPanorama.setMaxTextureMagnification (this.currentAdaptiveMagnification);
        
        this.frames++;
        if ((this.frames < 20 || this.frames % 5 == 0) && state == parameters.vrPanorama.ONRENDER_BEGIN) {
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
                    }, parameters.hqRenderInterval);
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
