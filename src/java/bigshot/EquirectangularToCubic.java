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
    
    public static class Image {
        private int width;
        private int height;
        private int[] data;
        
        public Image (int width, int height) {
            this.width = width;
            this.height = height;
            this.data = new int[width * height];
        }
        
        public Image (int width, int height, int[] data) {
            this.width = width;
            this.height = height;
            this.data = data;
        }
        
        public int value (int x, int y) {
            x %= width;
            if (x < 0) {
                x += width;
            }
            if (y >= height) {
                y = height - 1;
            }
            if (y < 0) {
                y = 0;
            }
            return data[y * width + x];
        }
        
        public int componentValue (int x, int y, int shift) {
            return (value (x, y) >> shift) & 0xff;
        }
        
        protected double lerp (double a, double b, double x) {
            return (1 - x) * a + (x) * b;
        }
        
        protected int sample (double x, double y, int shift) {
            int x0 = (int) x;
            int y0 = (int) y;
            double xf = x - x0;
            double yf = y - y0;
            
            double out = lerp (
                lerp (componentValue (x0, y0, shift),     componentValue (x0 + 1, y0, shift), xf),
                lerp (componentValue (x0, y0 + 1, shift), componentValue (x0 + 1, y0 + 1, shift), xf),
                yf);
            
            return (int) out;
        }
        
        public int sample (double x, double y) {
            int r = sample (x, y, 16);
            int g = sample (x, y, 8);
            int b = sample (x, y, 0);
            return (r << 16) | (g << 8) | b;
        }
        
        public void value (int x, int y, int v) {
            data[y * width + x] = v;
        }
        
        public int width () {
            return width;
        }
        
        public int height () {
            return height;
        }
        
        public void write (File file) throws Exception {
            BufferedImage output = toBuffered ();
            
            OutputStream os = new BufferedOutputStream (new FileOutputStream (file), 2048*1024);
            try {
                ImageIO.write (output, "png", os);
            } finally {
                os.close ();
            }
        }
        
        public BufferedImage toBuffered () throws Exception {
            BufferedImage output = new BufferedImage (width, height, BufferedImage.TYPE_INT_RGB);
            output.setRGB (0, 0, width, height, data, 0, width);
            return output;
        }
        
        public static Image read (File file) throws Exception {
            BufferedImage input = null;
            InputStream is = new BufferedInputStream (new FileInputStream (file), 2048*1024);
            try {
                input = ImageIO.read (is);
            } finally {
                is.close ();
            }
            
            int width = input.getWidth ();
            int height = input.getHeight ();
            
            int[] data = new int[width * height];
            input.getRGB (0, 0, width, height, data, 0, width);
            return new Image (width, height, data);
        }
    }
    
    private static class Point3DTransform {
        private final double[][] matrix = new double[3][3];
        
        public Point3DTransform () {
            matrix[0][0] = 1.0;
            matrix[1][1] = 1.0;
            matrix[2][2] = 1.0;
        }
        
        public void prepend (double[][] xform) {
            double[][] result = new double[3][3];
            for (int i = 0; i < 3; ++i) {
                for (int j = 0; j < 3; ++j) {
                    for (int k = 0; k < 3; ++k) {
                        result[i][j] += xform[i][k] * matrix[k][j];
                    }
                }
            }
            
            for (int i = 0; i < 3; ++i) {
                for (int j = 0; j < 3; ++j) {
                    matrix[i][j] = result[i][j];
                }
            }
        }
        
        public void rotateX (double angle) {
            prepend (new double[][]{
                    new double[]{ 1, 0, 0 },
                    new double[]{ 0, Math.cos (angle), -Math.sin (angle) },
                    new double[]{ 0, Math.sin (angle),  Math.cos (angle) }
                });
        }
        
        public void rotateY (double angle) {
            prepend (new double[][]{
                    new double[]{ Math.cos (angle), 0, Math.sin (angle) },
                    new double[]{ 0, 1, 0 },
                    new double[]{ -Math.sin (angle), 0, Math.cos (angle) }
                });
        }
        
        public void rotateZ (double angle) {
            prepend (new double[][]{
                    new double[]{ Math.cos (angle), -Math.sin (angle), 0 },
                    new double[]{ Math.sin (angle),  Math.cos (angle), 0 },
                    new double[]{ 0, 0, 1 }
                });
        }
        
        public Point3D transform (Point3D input) {
            double nx = input.x * matrix[0][0] + input.y * matrix[0][1] + input.z * matrix[0][2];
            double ny = input.x * matrix[1][0] + input.y * matrix[1][1] + input.z * matrix[1][2];
            double nz = input.x * matrix[2][0] + input.y * matrix[2][1] + input.z * matrix[2][2];
            input.x = nx;
            input.y = ny;
            input.z = nz;
            return input;
        }
    }
    
    private static class Point3D {
        public double x;
        public double y;
        public double z;
        
        public Point3D (double x, double y, double z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        
        public void rotateX (double angle) {
            double nx = x;
            double ny = y * Math.cos (angle) - z * Math.sin (angle);
            double nz = y * Math.sin (angle) + z * Math.cos (angle);
            this.x = nx;
            this.y = ny;
            this.z = nz;
        }
        
        public void rotateY (double angle) {
            double nx = x * Math.cos (angle) + z * Math.sin (angle);
            double ny = y;
            double nz = - x * Math.sin (angle) + z * Math.cos (angle);
            this.x = nx;
            this.y = ny;
            this.z = nz;
        }
        
        public void rotateZ (double angle) {
            double nx = x * Math.cos (angle) - y * Math.sin (angle);
            double ny = x * Math.sin (angle) + y * Math.cos (angle);
            double nz = z;
            this.x = nx;
            this.y = ny;
            this.z = nz;
        }
        
        public void scale (double s) {
            this.x *= s;
            this.y *= s;
            this.z *= s;
        }
        
        public void translate2D (double dx, double dy) {
            this.x += dx;
            this.y += dy;
        }
        
        public void translate3D (double dx, double dy, double dz) {
            this.x += dx;
            this.y += dy;
            this.z += dz;
        }
        
        public void translateZ (double d) {
            this.z += d;
        }
        
        public void project (double f) {
            x /= (z / f);
            y /= (z / f);
        }
        
        public double norm () {
            return Math.sqrt (x * x + y * y + z * z);
        }
        
        public String toString () {
            return "[" + x + ", " + y + ", " + z + "]";
        }
    }
    
    public static double toRad (double deg) {
        return deg * Math.PI / 180;
    }
    
    public static double toDeg (double rad) {
        return rad * 180 / Math.PI;
    }
    
    public static int clamp (int a, int x, int b) {
        if (x < a) {
            return a;
        } else if (x > b) {
            return b;
        } else {
            return x;
        }
    }
    
    protected static class FastTrigInverse {
        
        protected final double[] lookup;
        protected final double step;
        
        public FastTrigInverse (int resolution) {
            lookup = new double[resolution + 1];
            step = Math.PI / resolution;
        }
        
        public double f (double v) {
            int index = Arrays.binarySearch (lookup, v);
            if (index >= 0) {
                return index * step;
            } else {
                int insertionPoint = - index - 1;
                if (insertionPoint == 0) {
                    return 0;
                }
                if (insertionPoint == lookup.length) {
                    return lookup.length * step;
                }
                double a = lookup[insertionPoint - 1];
                double b = lookup[insertionPoint];
                double n = (v - a) / (b - a);
                return (insertionPoint - 1 + n) * step;
            }
        }
    }
    
    protected static class FastAcos extends FastTrigInverse {
        
        public FastAcos (int resolution) {
            super (resolution);
            for (int i = 0; i < resolution; ++i) {
                double a = step * i;
                lookup[i] = -Math.cos (a);
            }
            lookup[resolution] = 1;
        }
        
        public double f (double v) {
            return super.f (-v);
        }
    }
    
    protected static class FastAtan extends FastTrigInverse {
        
        public FastAtan (int resolution) {
            super (resolution);
            for (int i = 1; i < resolution; ++i) {
                double a = - (Math.PI / 2) + step * i;
                lookup[i] = Math.tan (a);
            }
            lookup[0] = Math.tan (step / 2 - Math.PI / 2);
            lookup[resolution] = Math.tan (-step / 2 + Math.PI / 2);
        }
        
        public double f (double v) {
            return super.f (v) - (Math.PI / 2);
        }
    }
    
    protected static Image transform (final Image input, double vfov, final double yaw, final double pitch, final double roll, final int width, final int height) throws Exception {
        final Image output = new Image (width, height);
        
        vfov = toRad (vfov);
        final Point3D topLeft = new Point3D (-Math.tan (vfov / 2) * width / height, -Math.tan (vfov / 2), 1.0);
        final Point3D uv = new Point3D (- 2 * topLeft.x / width, - 2 * topLeft.y / height, 0.0);
        
        final Point3DTransform transform = new Point3DTransform ();
        transform.rotateZ (toRad (roll));
        transform.rotateX (toRad (pitch));
        transform.rotateY (toRad (yaw));
        
        final FastAcos fastAcos = new FastAcos (input.width () * 2);
        final FastAtan fastAtan = new FastAtan (input.height () * 2);
        
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
                        System.out.println ("Rendering lines " + startY + " to " + endY);
                        for (int y = startY; y < endY; ++y) {
                            for (int x = 0; x < width; ++x) {
                                point.x = topLeft.x;
                                point.y = topLeft.y;
                                point.z = topLeft.z;
                                point.translate3D (x * uv.x, y * uv.y, 0.0);
                                
                                transform.transform (point);
                                
                                double theta = 0.0;
                                double phi = 0.0;
                                
                                double nxz = Math.sqrt (point.x * point.x + point.z * point.z);
                                if (nxz < Double.MIN_NORMAL) {
                                    if (point.y > 0) {
                                        phi = toRad (90);
                                    } else {
                                        phi = toRad (-90);
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
                                    output.value (x, y, input.value ((int) inX, (int) inY));
                                } else {
                                    output.value (x, y, input.sample (inX, inY));
                                }
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
    
    public static void transformToFace (File imageName, File output, int outputSize, double frontAt, double vfov, double yaw, double pitch, double roll) throws Exception {
        Image in = Image.read (imageName);
        transform (in, vfov,   yaw + frontAt,   pitch, roll, outputSize, outputSize).write (output);
    }
    
    
    public static File[] transformToFaces (File imageName, File outputBase, final int outputSize, final double frontAt) throws Exception {
        System.out.println ("Transforming to " + outputSize + "x" + outputSize + " cube map faces.");
        
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
        
        transform (in, 90,   0 + frontAt,   0, 0, outputSize, outputSize).write (files[0]);
        transform (in, 90,  90 + frontAt,   0, 0, outputSize, outputSize).write (files[1]);
        transform (in, 90, 180 + frontAt,   0, 0, outputSize, outputSize).write (files[2]);
        transform (in, 90, -90 + frontAt,   0, 0, outputSize, outputSize).write (files[3]);
        transform (in, 90,   0 + frontAt,  90, 0, outputSize, outputSize).write (files[4]);
        transform (in, 90,   0 + frontAt, -90, 0, outputSize, outputSize).write (files[5]);
        
        long end = System.currentTimeMillis ();
        long delta = end - start;
        System.out.println ("Transform took: " + delta + " ms");
        
        return files;
    }
}