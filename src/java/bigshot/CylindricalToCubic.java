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
package bigshot;

import java.io.File;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.FileReader;
import java.io.PrintStream;
import java.io.FileOutputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.ImageReader;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.Callable;
import java.util.concurrent.TimeUnit;

import java.util.StringTokenizer;
import java.util.Iterator;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;

/**
 * Transforms an equirectangular image map to rectilinear images. Used to create a cube map
 * for <a href="../../js/symbols/bigshot.VRPanorama.html">bigshot.VRPanorama</a>.
 */
public class CylindricalToCubic extends AbstractCubicTransform<CylindricalToCubic> {
    
    /**
     * Creates a new transform instance.
     */
    public CylindricalToCubic () {
    }
    
    @Override
        public CylindricalToCubic fromHuginPtoParameters (int w, int h, double v, int cropLeft, int cropRight, int cropTop, int cropBottom) {
        // figure out the horizon
        this.inputHorizon = (int) (h / 2 - cropTop);
        
        // Transform v to radians
        v = Math.PI * 2 * v / 360.0;
        
        double pa = v / w;
        double p = Math.tan (pa);
        
        // The input vfov is twice the angle at which we are input.height()/2 pixels away from the horizon
        double H2 = (input.height() / 2) * p;
        
        this.inputVfov = Math.atan (H2) * 2;
        this.inputHfov = v;
        
        return this;
    }
    
    /**
     * Performs the transformation.
     */
    @Override
        public Image transform () throws Exception {
        final Image output = new Image (width, height);
        
        final Point3D topLeft = new Point3D (-Math.tan (vfov / 2) * width / height, -Math.tan (vfov / 2), 1.0);
        final Point3D uv = new Point3D (- 2 * topLeft.x / width, - 2 * topLeft.y / height, 0.0);
        if (oversampling != 1) {
            uv.scale (1.0 / oversampling);
        }
        
        final Point3DTransform transform = new Point3DTransform ();
        transform.rotateZ (MathUtil.toRad (roll));
        transform.rotateX (MathUtil.toRad (pitch));
        transform.rotateY (MathUtil.toRad (yaw));
        
        transform.rotateY (MathUtil.toRad (oy));
        transform.rotateX (MathUtil.toRad (op));
        transform.rotateZ (MathUtil.toRad (or));
        
        final FastTrigInverse.FastAcos fastAcos = new FastTrigInverse.FastAcos (input.width () * 2 * oversampling);
        final FastTrigInverse.FastAtan fastAtan = new FastTrigInverse.FastAtan (input.height () * 2 * oversampling);
        
        final int STEPS = Runtime.getRuntime ().availableProcessors () * 2;
        final int STEP = Math.max (height / STEPS, 256);
        
        ExecutorService es = Executors.newFixedThreadPool (Runtime.getRuntime ().availableProcessors ());
        List<Callable<Object>> callables = new ArrayList<Callable<Object>> ();
        
        for (int topLine = 0; topLine < height; topLine += STEP) {
            final int startY = topLine;
            final int endY = Math.min (startY + STEP, height);
            callables.add (new Callable<Object> () {
                    public Object call () throws Exception {
                        final Point3D point = new Point3D (0,0,0);
                        final int[] oversamplingBuffer = new int[width * 3];
                        final int[] sampleBuffer = new int[3];
                        for (int destY = startY; destY < endY; ++destY) {
                            Arrays.fill (oversamplingBuffer, 0);
                            for (int y = destY * oversampling; y < destY * oversampling + oversampling; ++y) {
                                for (int x = 0; x < width * oversampling; ++x) {
                                    point.x = topLeft.x;
                                    point.y = topLeft.y;
                                    point.z = topLeft.z;
                                    if (jitter > 0.0) {
                                        point.translate3D (
                                            (x + Math.random () * jitter) * uv.x,
                                            (y + Math.random () * jitter) * uv.y, 0.0);
                                    } else {
                                        point.translate3D (x * uv.x, y * uv.y, 0.0);
                                    }
                                    
                                    transform.transform (point);
                                    
                                    double theta = 0.0;
                                    double phi = 0.0;
                                    
                                    double nxz = Math.sqrt (point.x * point.x + point.z * point.z);
                                    if (nxz < Double.MIN_NORMAL) {
                                        if (point.y > 0) {
                                            phi = MathUtil.toRad (90);
                                        } else {
                                            phi = MathUtil.toRad (-90);
                                        }
                                    } else {
                                        phi = fastAtan.f (point.y / nxz);
                                        theta = fastAcos.f (point.z / nxz); //Math.acos (
                                        if (point.x < 0) {
                                            theta = -theta;
                                        }
                                    }
                                    
                                    double inX = (theta / (inputHfov / 2)) * (input.width () / 2) + input.width () / 2;
                                    double inY = Math.tan (phi) / Math.tan (inputVfov / 2) * (input.height () / 2) + inputHorizon;
                                    
                                    
                                    if (inY >= 0 && inY < input.height () && (horizontalWrap || (inX >= 0 && inX < input.width ()))) {
                                        if (inY >= input.height () - 1 || (!horizontalWrap && inX >= input.width () - 1)) {
                                            input.componentValue ((int) inX, (int) inY, sampleBuffer);
                                        } else {
                                            input.sampleComponents (inX, inY, sampleBuffer);
                                        }
                                    } else {
                                        sampleBuffer[0] = 0;
                                        sampleBuffer[1] = 0;
                                        sampleBuffer[2] = 0;
                                    }
                                    
                                    int obx = x / oversampling;
                                    obx *= 3;
                                    for (int i = 0; i < sampleBuffer.length; ++i) {
                                        oversamplingBuffer[obx + i] += sampleBuffer[i];
                                    }
                                }
                            }
                            int oversampling2 = oversampling * oversampling;
                            for (int x = 0; x < oversamplingBuffer.length; ++x) {
                                oversamplingBuffer[x] /= oversampling2;
                            }
                            for (int x = 0; x < width; ++x) {
                                output.componentValue (x, destY, oversamplingBuffer[x * 3 + 0], oversamplingBuffer[x * 3 + 1], oversamplingBuffer[x * 3 + 2]);
                            }
                        }
                        return null;
                    }
                });
        }
        
        for (Future<Object> f : es.invokeAll (callables)) {
            f.get ();
        }
        es.shutdown ();
        es.awaitTermination (20, TimeUnit.SECONDS);
        
        return output;
    }
    
    /**
     * Convenience function to load an image from a file.
     *
     * @param imageName the image to load
     * @return the image
     */
    public static Image readImage (File imageName) throws Exception {
        return Image.read (imageName);
    }
    
    /**
     * Transforms an equirectangular map to a rectilinear image.
     *
     * @param in the equirectangular image map
     * @param outputSize the size (width and height), in pixels, of each face
     * @param vfov the vertical field of view, in degrees
     * @param oy the initial yaw offset, in degrees
     * @param op the initial pitch offset, in degrees
     * @param or the initial roll offset, in degrees
     * @param yaw the yaw angle of the viewer, in degrees
     * @param pitch the pitch angle of the viewer, in degrees
     * @param roll the roll angle of the viewer, in degrees
     */
    public static Image transformToFace (Image in, int outputSize, double vfov, double oy, double op, double or, double yaw, double pitch, double roll) throws Exception {
        return new CylindricalToCubic ()
            .input (in)
            .vfov (vfov)
            .offset (oy, op, or)
            .view (yaw, pitch, roll)
            .size (outputSize, outputSize)
            .transform ();
    }
    
    /**
     * Transforms an equirectangular map to a rectilinear image.
     *
     * @param imageName the equirectangular image map
     * @param output the output file name
     * @param outputSize the size (width and height), in pixels, of each face
     * @param vfov the vertical field of view, in degrees
     * @param oy the initial yaw offset, in degrees
     * @param op the initial pitch offset, in degrees
     * @param or the initial roll offset, in degrees
     * @param yaw the yaw angle of the viewer, in degrees
     * @param pitch the pitch angle of the viewer, in degrees
     * @param roll the roll angle of the viewer, in degrees
     */
    public static void transformToFace (File imageName, File output, int outputSize, double vfov, double oy, double op, double or, double yaw, double pitch, double roll) throws Exception {
        Image in = Image.read (imageName);
        transformToFace (in, outputSize, vfov, oy, op, or, yaw, pitch, roll).write (output);
    }    
}