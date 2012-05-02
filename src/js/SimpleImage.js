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
 * Creates a new image viewer. (Note: See {@link bigshot.SimpleImage#dispose} for important information.)
 *
 * @example
 * var bsi = new bigshot.SimpleImage (
 *     new bigshot.ImageParameters ({
 *         basePath : "myimage.jpg",
 *         width : 681,
 *         height : 1024,
 *         container : document.getElementById ("bigshot_div")
 *     }));
 *
 * @param {bigshot.ImageParameters} parameters the image parameters. Required fields are: <code>basePath</code> and <code>container</code>.
 * If you intend to use the archive filesystem, you need to set the <code>fileSystemType</code> to <code>"archive"</code>
 * as well.
 * @param {HTMLImageElement} imgElement an img element to use
 * @see bigshot.Image#dispose
 * @class A zoomable image viewer.
 * @constructor
 */     
bigshot.SimpleImage = function (parameters, imgElement) {
    parameters.merge ({
            fileSystemType : "simple",
            maxTextureMagnification : 1.0,
            wrapX : false,
            wrapY : false,
            tileSize : 1024
        }, true);
    
    if (imgElement) {
        parameters.merge ({
                width : imgElement.width,
                height : imgElement.height
            });
        this.imgElement = imgElement;
    } else {
        if (parameters.width == 0 || parameters.height == 0) {
            throw new Error ("No imgElement and missing width or height in ImageParameters");
        }
    }
    bigshot.setupFileSystem (parameters);
    
    bigshot.ImageBase.call (this, parameters);
}    

bigshot.SimpleImage.prototype = {
    setupLayers : function () {
        if (!this.imgElement) {
            this.imgElement = document.createElement ("img");
            this.imgElement.src = this.parameters.basePath;
            this.imgElement.style.position = "absolute";
        }
        
        this.addLayer (
            new bigshot.HTMLElementLayer (this, this.imgElement, this.parameters.width, this.parameters.height)
        );
    }
};

bigshot.object.extend (bigshot.SimpleImage, bigshot.ImageBase);

