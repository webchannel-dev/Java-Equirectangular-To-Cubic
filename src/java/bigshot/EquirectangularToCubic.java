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
    
    public EquirectangularToCubic () {
    }
    
    public EquirectangularToCubic input (Image input) {
        this.input = input;
        return this;
    }
    
    public EquirectangularToCubic vfov (double vfov) {
        this.vfov = MathUtil.toRad (vfov);
        return this;
    }
    
    public EquirectangularToCubic offset (double oy, double op, double or) {
        this.oy = oy;
        this.op = op;
        this.or = or;
        return this;
    }
    
    public EquirectangularToCubic view (double yaw, double pitch, double roll) {
        this.yaw = yaw;
        this.pitch = pitch;
        this.roll = roll;
        return this;
    }
    
    public EquirectangularToCubic size (int width, int height) {
        this.width = width;
        this.height = height;
        return this;
    }
    
    public EquirectangularToCubic oversampling (int oversampling) {
        this.oversampling = oversampling;
        return this;
    }
    
    public EquirectangularToCubic jitter (double jitter) {
        this.jitter = jitter;
        return this;
    }
    
    protected Image transform () throws Exception {
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
                        for (int y = startY * oversampling; y < endY * oversampling; ++y) {
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
                                    output.add (x / oversampling, y / oversampling, input.value ((int) inX, (int) inY));
                                } else {
                                    output.add (x / oversampling, y / oversampling, input.sample (inX, inY));
                                }
                            }
                        }
                        if (oversampling > 1) {
                            output.multiply (startY, endY, 1, oversampling * oversampling);
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
    
    public static Image readImage (File imageName) throws Exception {
        return Image.read (imageName);
    }
    
    public static Image transformToFace (Image in, int outputSize, double vfov, double oy, double op, double or, double yaw, double pitch, double roll) throws Exception {
        return new EquirectangularToCubic ()
            .input (in)
            .vfov (vfov)
            .offset (oy, op, or)
            .view (yaw, pitch, roll)
            .size (outputSize, outputSize)
            .transform ();
    }
    
    public static void transformToFace (File imageName, File output, int outputSize, double vfov, double oy, double op, double or, double yaw, double pitch, double roll) throws Exception {
        Image in = Image.read (imageName);
        transformToFace (in, outputSize, vfov, oy, op, or, yaw, pitch, roll).write (output);
    }    
    
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
        
        long start = System.currentTimeMillis ();
        
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
        
        long end = System.currentTimeMillis ();
        long delta = end - start;
        //System.out.println ("Transform took: " + delta + " ms");
        
        return files;
    }
}