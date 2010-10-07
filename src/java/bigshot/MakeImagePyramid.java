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

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.image.RenderedImage;
import java.awt.Image;
import java.awt.Color;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriter;
import javax.imageio.IIOImage;
import javax.imageio.stream.FileImageOutputStream;
import javax.imageio.ImageWriteParam;
import java.io.File;
import java.io.FileOutputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;

public class MakeImagePyramid {
    
    private static interface Output {
        public void write (BufferedImage image, File output) throws Exception;
        public String getSuffix ();
        public void configure (Map<String,String> parameters);
    }
    
    private static class PngOutput implements Output {
        public String getSuffix () {
            return ".png";
        }
        
        public void write (BufferedImage image, File output) throws Exception {
            ImageIO.write (image, "PNG", output);
        }
        
        public void configure (Map<String,String> parameters) {
        }
    }
    
    private static class JpegOutput implements Output {
        
        private double quality;
        
        public void configure (Map<String,String> parameters) {
            quality = getParameterAsDouble (parameters, "jpeg-quality", 0.95);
        }
        
        public String getSuffix () {
            return ".jpg";
        }
        
        public void write (BufferedImage image, File output) throws Exception {
            ImageWriter writer = ImageIO.getImageWritersByFormatName ("jpeg").next ();
            try {
                ImageWriteParam iwp = writer.getDefaultWriteParam();
                
                iwp.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                iwp.setCompressionQuality(1);
                
                FileImageOutputStream os = new FileImageOutputStream (output);
                try {
                    writer.setOutput(os);
                    IIOImage iioImage = new IIOImage ((RenderedImage) image, null, null);
                    writer.write (null, iioImage, iwp);
                } finally {
                    os.close ();
                }
                
            } finally {
                writer.dispose();
            }
        }
    }
    
    public static void tile (BufferedImage full, int tileWidth, int tileOffset, File outputBase, Output output) throws Exception {
        BufferedImage tile = new BufferedImage (tileWidth, tileWidth, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < full.getHeight (); y += tileOffset) {
            for (int x = 0; x < full.getWidth (); x += tileOffset) {
                int tx = x / tileWidth;
                int ty = y / tileWidth;
                int w = Math.min (x + tileWidth, full.getWidth ()) - x;
                int h = Math.min (y + tileWidth, full.getHeight ()) - y;
                
                System.out.println ("Generating tile " + tx + "," + ty + " = [" + x + "," + y + "] + [" + w + "," + h + "]...");
                
                BufferedImage section = full.getSubimage (x, y, w, h);
                Graphics2D g = tile.createGraphics ();
                g.setColor (Color.BLACK);
                g.fillRect (0, 0, tileWidth, tileWidth);
                g.drawImage (section, 0, 0, null);
                g.dispose ();
                String filename = tx + "_" + ty + output.getSuffix ();
                output.write (tile, new File (outputBase, filename));
            }
        }
    }
    
    public static void main (String[] args) throws Exception {
        File input = new File (args[0]);
        File outputBase = new File (args[1]);
        Map<String,String> parameters = new HashMap<String,String> ();
        for (int i = 2; i < args.length; i += 2) {
            if (args[i].startsWith ("--")) {
                String key = args[i].substring (2);
                String value = args[i + 1];
                parameters.put (key, value);
            }
        }
        makePyramid (input, outputBase, parameters);
    }
    
    private static double getParameterAsDouble (Map<String,String> parameters, String key, double defaultValue) {
        String v = parameters.get (key);
        if (v == null) {
            return defaultValue;
        } else {
            return Double.parseDouble (v);
        }
    }
    
    private static int getParameterAsInt (Map<String,String> parameters, String key, int defaultValue) {
        String v = parameters.get (key);
        if (v == null) {
            return defaultValue;
        } else {
            return Integer.parseInt (v);
        }
    }
    
    public static class PackageEntry {
        public String key;
        public File file;
        public long start;
        public long length;
        public String toString () {
            return key + ":" + start + "+" + length;
        }
    }
    
    public static long scan (File directory, List<PackageEntry> result, String relativePath, long currentPosition) {
        for (File f : directory.listFiles ()) {
            if (f.isDirectory ()) {
                currentPosition = scan (f, result, relativePath + f.getName () + "/", currentPosition);
            } else {
                PackageEntry p = new PackageEntry ();
                p.key = relativePath + f.getName ();
                p.file = f;
                p.start = currentPosition;
                p.length = f.length ();
                
                currentPosition += p.length;
                result.add (p);
            }
        } 
        return currentPosition;
    }
    
    public static void pack (File source, File outputBase) throws Exception {
        File packedOutput = outputBase;
        List<PackageEntry> fileList = new ArrayList<PackageEntry> ();
        scan (source, fileList, "", 0);
        System.out.println ("Packing " + fileList.size () + " files to " + packedOutput.getName ());
        
        byte[] buffer = new byte[128000];
        BufferedOutputStream packageOs = new BufferedOutputStream (new FileOutputStream (packedOutput));
        try {
            StringBuilder index = new StringBuilder ();
            for (PackageEntry pe : fileList) {
                index.append (pe.key);
                index.append (":");
                index.append (pe.start);
                index.append (":");
                index.append (pe.length);
                index.append (":");
            }
            
            byte[] indexBytes = index.toString ().getBytes ();
            byte[] header = String.format ("BIGSHOT %16x", indexBytes.length).getBytes ();
            
            packageOs.write (header);
            packageOs.write (indexBytes);
            
            for (PackageEntry pe : fileList) {
                System.out.println (pe.key);
                FileInputStream is = new FileInputStream (pe.file);
                try {
                    while (true) {
                        int numRead = is.read (buffer);
                        if (numRead <= 0) {
                            break;
                        }
                        packageOs.write (buffer, 0, numRead);
                    }
                } finally {
                    is.close ();
                }
            }
        } finally {
            packageOs.close ();
        }
    }
    
    public static void makePyramid (File input, File outputBase, Map<String,String> parameters) throws Exception {
        BufferedImage full = ImageIO.read (input);
        
        boolean outputPackage = "archive".equals (parameters.get ("format"));
        
        File folders = outputBase;
        
        if (outputPackage) {
            folders = File.createTempFile ("pyramid", "dir");
            folders.delete ();
            folders.mkdirs ();
        }
        folders.mkdirs ();
        
        StringBuilder descriptor = new StringBuilder ();
        
        Output output = new JpegOutput ();
        output.configure (parameters);
        
        descriptor.append ("suffix:" + output.getSuffix ());
        
        int w = full.getWidth ();
        int h = full.getHeight ();
        
        System.out.println ("Full image size: " + w + " x " + h + "");
        
        descriptor.append (":width:" + w + ":height:" + h);
        
        int maxDimension = Math.max (w, h);
        
        {
            int posterSize = getParameterAsInt (parameters, "poster-size", 512);
            double posterScale = ((double) posterSize) / maxDimension;
            
            int pw = (int) (w * posterScale);
            int ph = (int) (h * posterScale);
            
            descriptor.append (":posterSize:" + posterSize + ":posterWidth:" + pw + ":posterHeight:" + ph);
            
            System.out.println ("Creating " + pw + " x " + ph + " poster image.");
            
            BufferedImage poster = new BufferedImage (pw, ph, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = poster.createGraphics ();
            g.drawImage (full.getScaledInstance (pw, ph, Image.SCALE_AREA_AVERAGING), 0, 0, null);
            g.dispose ();
            
            output.write (poster, new File (folders, "poster" + output.getSuffix ()));
        }   
        
        
        int tileSize = getParameterAsInt (parameters, "tile-size", 256);
        
        int maxZoom = getParameterAsInt (parameters, "levels", (int) Math.ceil (Math.log (maxDimension) / Math.log (2)) - 2);
        if (parameters.get ("wrap-x") != null) {
            maxZoom = 0;
            int wxw = w;
            while (wxw % tileSize == 0) {
                wxw /= 2;
                maxZoom++;
            }
        }
        
        int overlap = getParameterAsInt (parameters, "overlap", 0);
        System.out.println ("Creating pyramid with " + maxZoom + " levels.");
        for (int zoom = 0; zoom < maxZoom; ++zoom) {
            File outputDir = new File (folders, String.valueOf (zoom));
            outputDir.mkdirs ();
            tile (full, tileSize, tileSize - overlap, outputDir, output);
            w /= 2;
            h /= 2;
            
            if (zoom < maxZoom - 1) {
                System.out.println ("Reducing by factor of 2...");
                
                BufferedImage reduced = new BufferedImage (w, h, BufferedImage.TYPE_INT_RGB);
                Graphics2D g = reduced.createGraphics ();
                g.drawImage (full.getScaledInstance (w, h, Image.SCALE_AREA_AVERAGING), 0, 0, null);
                g.dispose ();
                full = reduced;
            }
        }
        
        descriptor.append (":tileSize:" + tileSize + ":overlap:" + overlap);
        descriptor.append (":minZoom:" + (-maxZoom + 1));
        
        FileOutputStream descriptorOut = new FileOutputStream (new File (folders, "descriptor"));
        try {
            descriptorOut.write (descriptor.toString ().getBytes ());
        } finally {
            descriptorOut.close ();
        }
        
        if (outputPackage) {
            pack (folders, outputBase);
            deleteAll (folders);
        }
    }
    
    
    public static void deleteAll (File f) {
        if (f.isDirectory ()) {
            for (File f2 : f.listFiles ()) {
                deleteAll (f2);
            }
            f.delete ();
        } else {
            f.delete ();
        }
    }
}