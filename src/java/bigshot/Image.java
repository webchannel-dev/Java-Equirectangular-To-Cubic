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

public class Image {
    
    private final static int COMPONENT_SIZE = 10;
    private final static int COMPONENT_MASK = ((1 << COMPONENT_SIZE) - 1);
    private final static int BLUE = 0;
    private final static int GREEN = COMPONENT_SIZE;
    private final static int RED = COMPONENT_SIZE * 2;
    
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
        return (int) ((value (x, y) >> shift) & COMPONENT_MASK);
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
        int r = sample (x, y, RED);
        int g = sample (x, y, GREEN);
        int b = sample (x, y, BLUE);
        return (r << RED) | (g << GREEN) | (b << BLUE);
    }
    
    public void value (int x, int y, int v) {
        data[y * width + x] = v;
    }
    
    public void add (int x, int y, int v) {
        data[y * width + x] += v;
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
    
    public void multiply (int y0, int y1, int num, int denom) {
        int i = y0 * width;
        for (int y = y0; y < y1; ++y) {
            for (int x = 0; x < width; ++x) {
                int r = sample (x, y, RED) * num / denom;
                int g = sample (x, y, GREEN) * num / denom;
                int b = sample (x, y, BLUE) * num / denom;
                data[i] = (r << RED) | (g << GREEN) | (b << BLUE);
                ++i;
            }
        }
    }
    
    private final static int pack (int in) {
        return (int) ((
            (((in >> RED  ) & 0xff) << 16) |
            (((in >> GREEN) & 0xff) <<  8) |
            (((in >> BLUE ) & 0xff)      )
            ) & 0xffffff);
    }
    
    private final static int unpack (int in) {
        return (int) (
            (((in >> 16) & 0xff) << RED  ) |
            (((in >>  8) & 0xff) << GREEN) |
            (((in      ) & 0xff) << BLUE )
            );
    }
    
    public BufferedImage toBuffered () throws Exception {
        BufferedImage output = new BufferedImage (width, height, BufferedImage.TYPE_INT_RGB);
        final int[] line = new int[width];
        for (int y = 0; y < height; ++y) {
            int rp = y * width;
            for (int x = 0; x < width; ++x) {
                line[x] = pack (data[rp]);
                ++rp;
            }
            output.setRGB (0, y, width, 1, line, 0, width);
        }
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
        final int[] line = new int[width];
        for (int y = 0; y < height; ++y) {
            input.getRGB (0, y, width, 1, line, 0, width);
            int wp = y * width;
            for (int x = 0; x < width; ++x) {
                data[wp] = unpack (line[x]);
                ++wp;
            }
        }
        return new Image (width, height, data);
    }
}
