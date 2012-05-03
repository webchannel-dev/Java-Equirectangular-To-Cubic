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
public class EquirectangularToCubic {
    
    protected Image input;
    protected double vfov;
    protected double oy;
    protected double op;
    protected double or;
    protected double yaw;
    protected double pitch;
    protected double roll;
    protected int width;
    protected int height;
    protected int oversampling = 1;
    protected double jitter;
    
    /**
     * Creates a new transform instance.
     */
    public EquirectangularToCubic () {
    }
    
    /**
     * Sets the equirectangular image map. Once set, the {@link #transform()}
     * method can be called several times with other parameters being adjusted
     * between calls.
     */
    public EquirectangularToCubic input (Image input) {
        this.input = input;
        return this;
    }
    
    /**
     * Loads the equirectangular image map from a file. Once set, the {@link #transform()}
     * method can be called several times with other parameters being adjusted
     * between calls.
     */
    public EquirectangularToCubic input (File input) throws Exception {
        return this.input (Image.read (input));
    }
    
    /**
     * Sets the vertical field of view.
     *
     * @param vfov the field of view in degrees
     */ 
    public EquirectangularToCubic vfov (double vfov) {
        this.vfov = MathUtil.toRad (vfov);
        return this;
    }
    
    /**
     * Sets the initial transform offsets (used to level a bubble).
     *
     * @param oy the yaw angle in degrees
     * @param op the pitch angle in degrees
     * @param or the roll angle in degrees
     */
    public EquirectangularToCubic offset (double oy, double op, double or) {
        this.oy = oy;
        this.op = op;
        this.or = or;
        return this;
    }
    
    /**
     * Sets the view direction.
     *
     * @param yaw the yaw angle in degrees
     * @param pitch the pitch angle in degrees
     * @param roll the roll angle in degrees
     */
    public EquirectangularToCubic view (double yaw, double pitch, double roll) {
        this.yaw = yaw;
        this.pitch = pitch;
        this.roll = roll;
        return this;
    }
    
    /**
     * Sets the output image size in pixels.
     */
    public EquirectangularToCubic size (int width, int height) {
        this.width = width;
        this.height = height;
        return this;
    }
    
    /**
     * If greater than one, oversamples each output pixel using a 
     * grid of <code>oversampling * oversampling</code> samples.
     * Use together with {@link #jitter(double)} to avoid moire
     * and aliasing.
     *
     * @param oversampling the amount of oversampling along each axis
     * of the output image. Must be <code>&gt;= 1</code>.
     */
    public EquirectangularToCubic oversampling (int oversampling) {
        if (oversampling < 1) {
            throw new IllegalArgumentException ("oversampling < 1 : " + oversampling);
        }
        this.oversampling = oversampling;
        return this;
    }
    
    /**
     * Adds a random jitter to the sampling.
     * Use together with {@link #oversampling(int)} to avoid moire
     * and aliasing.
     *
     * @param jitter the jitter, in units of one output pixel
     */
    public EquirectangularToCubic jitter (double jitter) {
        this.jitter = jitter;
        return this;
    }
    
    /**
     * Performs the transformation.
     */
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
                                    
                                    double inX = (theta / Math.PI) * (input.width () / 2) + input.width () / 2;
                                    double inY = (phi / (Math.PI / 2)) * (input.height () / 2) + input.height () / 2;
                                    
                                    
                                    if (inY >= input.height () - 1) {
                                        input.componentValue ((int) inX, (int) inY, sampleBuffer);
                                    } else {
                                        input.sampleComponents (inX, inY, sampleBuffer);
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
        return new EquirectangularToCubic ()
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
    
    /**
     * Transforms an equirectangular map to six VR cube faces.
     *
     * @param imageName the equirectangular image map
     * @param outputBase the base directory to output the cube faces to
     * @param outputSize the size (width and height), in pixels, of each face
     * @param oy the initial yaw offset
     * @param op the initial pitch offset
     * @param or the initial roll offset
     * @return the resulting faces as PNG files in the outputBase directory. They are named "face_f.png", "face_r.png", "face_b.png", "face_l.png",
     * "face_u.png" and "face_d.png", for "Front", "Right", "Back", "Left", "Up" and "Down" respectively.
     */
    public static File[] transformToFaces (File imageName, File outputBase, final int outputSize, double oy, double op, double or) throws Exception {
        final Image in = Image.read (imageName);
        final File[] files = new File[]{
            new File (outputBase, "face_f.png"),
            new File (outputBase, "face_r.png"),
            new File (outputBase, "face_b.png"),
            new File (outputBase, "face_l.png"),
            new File (outputBase, "face_u.png"),
            new File (outputBase, "face_d.png")
            };
        
        EquirectangularToCubic xform = new EquirectangularToCubic ()
            .input (in)
            .vfov (90)
            .offset (oy, op, or)
            .size (outputSize, outputSize);
        
        xform.view (  0,   0, 0).transform ().write (files[0]);
        xform.view ( 90,   0, 0).transform ().write (files[1]);
        xform.view (180,   0, 0).transform ().write (files[2]);
        xform.view (-90,   0, 0).transform ().write (files[3]);
        xform.view (  0,  90, 0).transform ().write (files[4]);
        xform.view (  0, -90, 0).transform ().write (files[5]);
        
        return files;
    }
}