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
 * @class Data loader using standard browser functions.
 * @augments bigshot.DataLoader
 */
bigshot.DefaultDataLoader = function () {
    
    this.browser = new bigshot.Browser ();
    
    this.loadImage = function (url, onloaded) {
        var tile = document.createElement ("img");
        this.browser.registerListener (tile, "load", function () {
                if (onloaded) {
                    onloaded (tile);
                }
            }, false);
        tile.src = url;
        return tile;
    };
    
    this.loadXml = function (url, synchronous, onloaded) {
        var req = this.browser.createXMLHttpRequest ();
        
        req.open("GET", url, false);   
        req.send(null); 
        if(req.status == 200) {
            var xml = req.responseXML;
            if (onloaded) {
                onloaded (xml);
            }
            return xml;
        } else {
            if (onloaded) {
                onloaded (null);
            }
            return null;
        }   
    };
}
