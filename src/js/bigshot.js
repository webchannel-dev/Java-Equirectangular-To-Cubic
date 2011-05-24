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
if (!self["bigshot"]) {
    /**
     * @namespace Bigshot namespace.
     *
     * Bigshot is a toolkit for zoomable images and VR panoramas.
     * 
     * <h3>Zoomable Images</h3>
     *
     * <p>The two classes that are needed for zoomable images are:
     *
     * <ul>
     * <li>{@link bigshot.Image}: The main class for making zoomable images. See the class docs
     *     for a tutorial.
     * <li>{@link bigshot.ImageParameters}: Parameters for zoomable images.
     * </ul>
     *
     * For hotspots, see:
     *
     * <ul>
     * <li>{@link bigshot.HotspotLayer}
     * <li>{@link bigshot.Hotspot}
     * <li>{@link bigshot.LabeledHotspot}
     * <li>{@link bigshot.LinkHotspot}
     * </ul>
     *
     * <h3>VR Panoramas</h3>
     *
     * <p>The two classes that are needed for zoomable VR panoramas (requires WebGL) are:
     *
     * <ul>
     * <li>{@link bigshot.VRPanorama}: The main class for making VR panoramas. See the class docs
     *     for a tutorial.
     * <li>{@link bigshot.VRPanoramaParameters}: Parameters for VR panoramas. 
     * </ul>
     */
    bigshot = {};
    
    #include Browser.js
    #include FullScreen.js
    #include DataLoader.js
    #include DefaultDataLoader.js
    #include CachingDataLoader.js
    #include object.js
    #include Hotspot.js
    #include LabeledHotspot.js
    #include LinkHotspot.js
    #include HotspotLayer.js
    #include TileLayer.js
    #include LRUMap.js
    #include ImageTileCache.js
    #include Layer.js
    #include ImageParameters.js
    #include Image.js
    #include FileSystem.js
    #include FolderFileSystem.js
    #include DeepZoomImageFileSystem.js
    #include ArchiveFileSystem.js
    #include VRTileCache.js
    #include ImageVRTileCache.js
    #include TextureTileCache.js
    #include VRFace.js
    #include webglutil.js
    #include TransformStack.js
    #include WebGL.js
    #include VRRenderer.js
    #include CSS3DVRRenderer.js
    #include CSS3DTexturedQuad.js
    #include CSS3DTexturedQuadScene.js
    #include TexturedQuadScene.js
    #include WebGLVRRenderer.js
    #include TexturedQuad.js
    #include WebGLTexturedQuad.js
    #include WebGLTexturedQuadScene.js
    #include VRPanoramaParameters.js
    #include VRPanorama.js
    #include VRHotspot.js
    #include VRPointHotspot.js
    #include VRRectangleHotspot.js
    #include ImageCarouselPanoramaVRRenderer.js
    #include ImageCarouselPanoramaParameters.js
    #include ImageCarouselPanorama.js
    #include AdaptiveLODMonitor.js
}