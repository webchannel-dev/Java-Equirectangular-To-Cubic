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
 * Creates a new set of panorama parameters.
 *
 * @class Parameters for an {@link bigshot.ImageCarouselPanorama}
 */
bigshot.ImageCarouselPanoramaParameters = function (values) {
    /**
     * Suffix to append to the tile filenames. Typically <code>".jpg"</code> or 
     * <code>".png"</code>.
     *
     * @default <i>Optional</i> set by MakeImagePyramid and loaded from descriptor
     * @type String
     */
    this.suffix = null;
    
    /**
     * For {@link bigshot.ImageCarouselPanorama}, the {@code div} to render into.
     *
     * @type HTMLDivElement
     */
    this.container = null;
    
    /**
     * Base path for the image. This is filesystem dependent; but for the two most common cases
     * the following should be set
     *
     * <ul>
     * <li><b>archive</b>= The basePath is <code>"&lt;path&gt;/bigshot.php?file=&lt;path-to-bigshot-archive-relative-to-bigshot.php&gt;"</code>;
     *     for example; <code>"/bigshot.php?file=images/bigshot-sample.bigshot"</code>.
     * <li><b>folder</b>= The basePath is <code>"&lt;path-to-image-folder&gt;"</code>;
     *     for example; <code>"/images/bigshot-sample"</code>.
     * </ul>
     *
     * @type String
     */
    this.basePath = null;
    
    /**
     * The file system type. Used to create a filesystem instance unless
     * the fileSystem field is set. Possible values are <code>"archive"</code> or 
     * <code>"folder"</code>
     *
     * @type String
     * @default "folder"
     */
    this.fileSystemType = "folder";
    
    /**
     * A reference to a filesystem implementation. If set; it overrides the
     * fileSystemType field.
     *
     * @default set depending on value of bigshot.VRPanoramaParameters#fileSystemType
     * @type bigshot.FileSystem
     */
    this.fileSystem = null;
    
    this.steps = 0;
    
    if (values) {
        for (var k in values) {
            this[k] = values[k];
        }
    }
    
    this.merge = function (values, overwrite) {
        for (var k in values) {
            if (overwrite || !this[k]) {
                this[k] = values[k];
            }
        }
    }
    return this;        
}
