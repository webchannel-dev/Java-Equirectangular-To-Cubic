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

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.image.RenderedImage;
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

/**
 * Command-line tool to creates the tiled image pyramids that are used by Bigshot.
 * Run without parameters or with <code>--help</code> to see parameters.
 */
public class MakeImagePyramid {
    
    private static interface DescriptorOutput {
        public void setSuffix (String suffix);
        public void setFullSize (int width, int height);
        public void setTileSize (int tileSize, int overlap, int minZoom);
        public void setPosterSize (int posterSize, int pw, int ph);
        public void configure (Map<String,String> parameters);
        public void output (File targetFile) throws Exception;
    }
    
    private static class BigshotDescriptorOutput implements DescriptorOutput {
        
        private final StringBuilder descriptor = new StringBuilder ();
        
        public void setSuffix (String suffix) {
            descriptor.append (":suffix:" + suffix);
        }        
        
        public void setFullSize (int width, int height) {
            descriptor.append (":width:" + width + ":height:" + height);
        }
        
        public void setTileSize (int tileSize, int overlap, int minZoom) {
            descriptor.append (":tileSize:" + tileSize + ":overlap:" + overlap);
            descriptor.append (":minZoom:" + minZoom);
        }
        
        public void setPosterSize (int posterSize, int pw, int ph) {
            descriptor.append (":posterSize:" + posterSize + ":posterWidth:" + pw + ":posterHeight:" + ph);
        }
        
        public void configure (Map<String,String> parameters) {
            
        }
        
        public void output (File folders) throws Exception {
            FileOutputStream descriptorOut = new FileOutputStream (new File (folders, "descriptor"));
            try {
                String d = descriptor.toString ();
                if (d.startsWith (":")) {
                    d = d.substring (1);
                }
                descriptorOut.write (d.getBytes ());
            } finally {
                descriptorOut.close ();
            }
        }
    }
    
    private static class DziDescriptorOutput implements DescriptorOutput {
        
        private final StringBuilder descriptor = new StringBuilder ();
        
        private String suffix;
        private int width;
        private int height;
        private int tileSize;
        private int overlap;
        
        public void setSuffix (String suffix) {
            this.suffix = suffix;
            if (this.suffix.startsWith (".")) {
                this.suffix = this.suffix.substring (1);
            }
        }        
        
        public void setFullSize (int width, int height) {
            this.width = width;
            this.height = height;
        }
        
        public void setTileSize (int tileSize, int overlap, int minZoom) {
            this.tileSize = tileSize;
            this.overlap = overlap;
        }
        
        public void setPosterSize (int posterSize, int pw, int ph) {
        }
        
        public void configure (Map<String,String> parameters) {
            
        }
        
        public void output (File folders) throws Exception {
            /*
             * <?xml version=\"1.0\" encoding=\"utf-8\"?>
             * <Image TileSize=\"375\" Overlap=\"1\" Format=\"jpg\" ServerFormat=\"Default\" xmnls=\"http://schemas.microsoft.com/deepzoom/2009\">
             * <Size Width=\"1500\" Height=\"1500\" />
             * </Image>
             */
            StringBuilder descriptor = new StringBuilder (
                "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
                "<Image TileSize=\"" + tileSize + "\" Overlap=\"" + overlap + "\" Format=\"" + suffix + "\" ServerFormat=\"Default\" xmnls=\"http://schemas.microsoft.com/deepzoom/2009\">\n" +
                "<Size Width=\"" + width + "\" Height=\"" + height + "\" />\n" +
                "</Image>\n"
                );
            
            FileOutputStream descriptorOut = new FileOutputStream (new File (folders.getParentFile (), folders.getName () + ".xml"));
            try {
                descriptorOut.write (descriptor.toString ().getBytes ());
            } finally {
                descriptorOut.close ();
            }
        }
    }
    
    
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
            quality = getParameterAsDouble (parameters, "jpeg-quality", 0.7);
        }
        
        public String getSuffix () {
            return ".jpg";
        }
        
        public void write (BufferedImage image, File output) throws Exception {
            ImageWriter writer = ImageIO.getImageWritersByFormatName ("jpeg").next ();
            try {
                ImageWriteParam iwp = writer.getDefaultWriteParam();
                
                iwp.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                iwp.setCompressionQuality ((float) quality);
                
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
    
    protected static void tile (BufferedImage full, int tileWidth, int overlap, File outputBase, Output output) throws Exception {
        BufferedImage tile = new BufferedImage (tileWidth, tileWidth, BufferedImage.TYPE_INT_RGB);
        int startOffset = 0;
        
        int ty = 0;
        for (int y = startOffset; y < full.getHeight () - overlap; y += tileWidth - overlap) {
            int tx = 0;
            for (int x = startOffset; x < full.getWidth () - overlap; x += tileWidth - overlap) {
                int w = Math.min (x + tileWidth, full.getWidth ()) - x;
                int h = Math.min (y + tileWidth, full.getHeight ()) - y;
                
                System.out.println ("Generating tile " + tx + "," + ty + " = [" + x + "," + y + "] + [" + w + "," + h + "] -> [" + (x + w) + "," + (y + h) + "]...");
                
                BufferedImage section = full.getSubimage (x, y, w, h);
                Graphics2D g = tile.createGraphics ();
                g.setColor (Color.BLACK);
                g.fillRect (0, 0, tileWidth, tileWidth);
                g.drawImage (section, 0, 0, null);
                g.dispose ();
                String filename = tx + "_" + ty + output.getSuffix ();
                output.write (tile, new File (outputBase, filename));
                
                ++tx;
            }
            ++ty;
        }
    }
    
    protected static void showHelp () throws Exception {
        byte[] buffer = new byte[1024];
        InputStream is = MakeImagePyramid.class.getResourceAsStream ("help.txt");
        try {
            while (true) {
                int numRead = is.read (buffer);
                if (numRead < 1) {
                    break;
                }
                System.err.write (buffer, 0, numRead);
            }
        } finally {
            is.close ();
        }
    }
    
    protected static boolean isPowerOfTwo (int i) {
        return (i & (i - 1)) == 0;
    }
    
    protected static void putIfEmpty (Map<String,String> parameters, String key, String value) {
        if (!parameters.containsKey (key)) {
            parameters.put (key, value);
        }
    }
    
    protected static void presetDziCubemap (Map<String,String> parameters) throws Exception {
        int overlap = getParameterAsInt (parameters, "overlap", 2);
        int tileSize = getParameterAsInt (parameters, "tile-size", 256 - overlap);
        int faceSize = getParameterAsInt (parameters, "face-size", 8 * tileSize);
        
        if (!isPowerOfTwo (tileSize + overlap)) {
            System.err.println ("WARNING: Resulting image tile size (tile-size + overlap) is not a power of two:" + (tileSize + overlap));
        }
        if ((faceSize % tileSize) != 0) {
            System.err.println ("WARNING: face-size is not an even multiple of tile-size:" + faceSize + " % " + tileSize + " != 0");
        }
        
        putIfEmpty (parameters, "overlap", String.valueOf (overlap));
        putIfEmpty (parameters, "tile-size", String.valueOf (tileSize));
        putIfEmpty (parameters, "face-size", String.valueOf (faceSize));
        putIfEmpty (parameters, "transform", "facemap");
        
        int levels = (int) Math.ceil (Math.log (faceSize + overlap) / Math.log (2));
        putIfEmpty (parameters, "levels", String.valueOf (levels + 1));
        putIfEmpty (parameters, "descriptor-format", "dzi");
        putIfEmpty (parameters, "folder-layout", "dzi");
        putIfEmpty (parameters, "level-numbering", "invert");
    }
    
    public static void main (String[] args) throws Exception {
        if (args.length < 2) {
            showHelp ();
            System.err.println ("No input files specified.");
            System.exit (1);
        } else if (args.length == 1 && (args[0].equals ("-h") || args[0].equals ("--help"))) {
            showHelp ();
            System.exit (0);
        } else {
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
            
            process (input, outputBase, parameters);
        }
    }
    
    public static void process (File input, File outputBase, Map<String,String> parameters) throws Exception {
        if ("dzi-cubemap".equals (parameters.get ("preset"))) {
            presetDziCubemap (parameters);
        }
        
        if ("facemap".equals (parameters.get ("transform")) || "cylinder-facemap".equals (parameters.get ("transform"))) {
            boolean archive = "archive".equals (parameters.get ("format"));
            
            File facesOut = File.createTempFile ("makeimagepyramid", "bigshot");
            facesOut.delete ();
            facesOut.mkdirs ();
            try {
                File[] faces = null;
                AbstractCubicTransform xform = null;
                if ("cylinder-facemap".equals (parameters.get ("transform"))) {
                    xform = new CylindricalToCubic ()
                        .input (input);
                } else {
                    xform = new EquirectangularToCubic ()
                        .input (input);
                }
                if (parameters.containsKey ("transform-pto")) {
                    xform.fromHuginPto (new File (parameters.get ("transform-pto")));
                }
                if (parameters.containsKey ("input-vfov")) {
                    xform.inputVfov (getParameterAsDouble (parameters, "input-vfov", 90));
                }
                if (parameters.containsKey ("input-horizon")) {
                    xform.inputHorizon (getParameterAsInt (parameters, "input-horizon", 0));
                }
                
                faces = EquirectangularToCubic.transformToFaces (
                    xform, 
                    facesOut, 
                    getParameterAsInt (parameters, "face-size", 2048) + getParameterAsInt (parameters, "overlap", 0),
                    getParameterAsDouble (parameters, "front-at", 0.0), 0.0, 0.0
                    );
                
                parameters.remove ("format");
                parameters.remove ("folder-layout");
                
                File pyramidBase = outputBase;
                if (archive) {
                    pyramidBase = File.createTempFile ("makeimagepyramid", "bigshot");
                    pyramidBase.delete ();
                    pyramidBase.mkdirs ();
                }
                
                for (File face : faces) {
                    System.out.println ("Making pyramid for " + face.getName ());
                    String noExt = face.getName ().substring (0, face.getName ().lastIndexOf ('.'));
                    File out = new File (pyramidBase, noExt);
                    makePyramid (face, out, parameters);
                    face.delete ();
                }
                
                if (archive) {
                    pack (pyramidBase, outputBase);
                    deleteAll (pyramidBase);
                }
            } finally {
                deleteAll (facesOut);
            }
        } else if ("face".equals (parameters.get ("transform"))) {
            double fov = getParameterAsDouble (parameters, "fov", 60);
            double yaw = getParameterAsDouble (parameters, "yaw", 0);
            double pitch = getParameterAsDouble (parameters, "pitch", 0);
            double roll = getParameterAsDouble (parameters, "roll", 0);
            double yawOffset = getParameterAsDouble (parameters, "yaw-offset", 0);
            double pitchOffset = getParameterAsDouble (parameters, "pitch-offset", 0);
            double rollOffset = getParameterAsDouble (parameters, "roll-offset", 0);
            int oversampling = getParameterAsInt (parameters, "oversampling", 1);
            double jitter = getParameterAsDouble (parameters, "jitter", -1);
            
            int outputSizeW = getParameterAsInt (parameters, "output-width", 640);
            int outputSizeH = getParameterAsInt (parameters, "output-height", 480);
            
            Output output = null;
            String imageFormat = getParameter (parameters, "image-format", "jpg");
            if ("jpg".equals (imageFormat)) {
                output = new JpegOutput ();
            } else if ("png".equals (imageFormat)) {
                output = new PngOutput ();
            } else {
                System.err.println ("Unknown image format: \"" + imageFormat + "\". Using JPEG.");
                output = new JpegOutput ();
            }
            output.configure (parameters);
            
            Image in = Image.read (input);
            
            Image outImage = new EquirectangularToCubic ()
                .input (in)
                .vfov (fov)
                .offset (yawOffset, pitchOffset, rollOffset)
                .view (yaw, pitch, roll)
                .size (outputSizeW, outputSizeH)
                .oversampling (oversampling)
                .jitter (jitter)
                .transform ();
            
            output.write (outImage.toBuffered (), outputBase);
        } else if ("carousel".equals (parameters.get ("transform"))) {
            boolean archive = "archive".equals (parameters.get ("format"));
            
            File pyramidBase = outputBase;
            if (archive) {
                pyramidBase = File.createTempFile ("makeimagepyramid", "bigshot");
                pyramidBase.delete ();
                pyramidBase.mkdirs ();
            }
            
            int steps = getParameterAsInt (parameters, "carousel-steps", 24);
            double fov = getParameterAsDouble (parameters, "carousel-fov", 60);
            int outputSizeW = getParameterAsInt (parameters, "carousel-output-width", 360);
            int outputSizeH = getParameterAsInt (parameters, "carousel-output-width", 240);
            
            pyramidBase.mkdirs ();
            
            Output output = null;
            String imageFormat = getParameter (parameters, "image-format", "jpg");
            if ("jpg".equals (imageFormat)) {
                output = new JpegOutput ();
            } else if ("png".equals (imageFormat)) {
                output = new PngOutput ();
            } else {
                System.err.println ("Unknown image format: \"" + imageFormat + "\". Using JPEG.");
                output = new JpegOutput ();
            }
            output.configure (parameters);
            
            DescriptorOutput descriptor = null;
            String descriptorFormat = getParameter (parameters, "descriptor-format", "bigshot");
            if ("bigshot".equals (descriptorFormat)) {
                descriptor = new BigshotDescriptorOutput ();
            } else if ("dzi".equals (descriptorFormat)) {
                descriptor = new DziDescriptorOutput ();
            } else {
                System.err.println ("Unknown descriptor format: \"" + descriptorFormat + "\". Using Bigshot.");
                descriptor = new BigshotDescriptorOutput ();
            }
            descriptor.configure (parameters);
            
            descriptor.setSuffix (output.getSuffix ());
            descriptor.setFullSize (outputSizeW, outputSizeH);
            descriptor.setTileSize (0, 0, 0);
            
            double frontAt = getParameterAsDouble (parameters, "front-at", 0.0);
            
            Image in = Image.read (input);
            for (int i = 0; i < steps; ++i) {
                File outFile = new File (pyramidBase, String.valueOf (i) + output.getSuffix ());
                Image outImage = new EquirectangularToCubic ()
                    .input (in)
                    .vfov (fov)
                    .offset (frontAt, 0.0, 0.0)
                    .view (i * 360 / steps, 0, 0)
                    .size (outputSizeW, outputSizeH)
                    .transform ();
                output.write (outImage.toBuffered (), outFile);
            }
            
            descriptor.output (pyramidBase);
            
            if (archive) {
                pack (pyramidBase, outputBase);
                deleteAll (pyramidBase);
            }
        } else {
            makePyramid (input, outputBase, parameters);
        }
    }
    
    private static String getParameter (Map<String,String> parameters, String key, String defaultValue) {
        String v = parameters.get (key);
        if (v == null) {
            return defaultValue;
        } else {
            return v;
        }
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
    
    private static class PackageEntry {
        public String key;
        public File file;
        public long start;
        public long length;
        public String toString () {
            return key + ":" + start + "+" + length;
        }
    }
    
    protected static long scan (File directory, List<PackageEntry> result, String relativePath, long currentPosition) {
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
    
    protected static void pack (File source, File outputBase) throws Exception {
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
    
    protected static void makePyramid (File input, File outputBase, Map<String,String> parameters) throws Exception {
        BufferedImage full = ImageIO.read (input);
        
        boolean outputPackage = "archive".equals (parameters.get ("format"));
        boolean dziLayout = "dzi".equals (parameters.get ("folder-layout"));
        
        File folders = outputBase;
        
        if (outputPackage) {
            folders = File.createTempFile ("pyramid", "dir");
            folders.delete ();
            folders.mkdirs ();
        }
        folders.mkdirs ();
        
        if (dziLayout) {
            folders = new File (folders, outputBase.getName ());
            folders.mkdirs ();
        }
        
        Output output = null;
        String imageFormat = getParameter (parameters, "image-format", "jpg");
        if ("jpg".equals (imageFormat)) {
            output = new JpegOutput ();
        } else if ("png".equals (imageFormat)) {
            output = new PngOutput ();
        } else {
            System.err.println ("Unknown image format: \"" + imageFormat + "\". Using JPEG.");
            output = new JpegOutput ();
        }
        output.configure (parameters);
        
        
        DescriptorOutput descriptor = null;
        String descriptorFormat = getParameter (parameters, "descriptor-format", "bigshot");
        if ("bigshot".equals (descriptorFormat)) {
            descriptor = new BigshotDescriptorOutput ();
        } else if ("dzi".equals (descriptorFormat)) {
            descriptor = new DziDescriptorOutput ();
        } else {
            System.err.println ("Unknown descriptor format: \"" + descriptorFormat + "\". Using Bigshot.");
            descriptor = new BigshotDescriptorOutput ();
        }
        descriptor.configure (parameters);
        
        descriptor.setSuffix (output.getSuffix ());
        
        int w = full.getWidth ();
        int h = full.getHeight ();
        
        System.out.println ("Full image size: " + w + " x " + h + "");
        
        descriptor.setFullSize (w, h);
        
        int maxDimension = Math.max (w, h);
        
        {
            int posterSize = getParameterAsInt (parameters, "poster-size", 512);
            double posterScale = ((double) posterSize) / maxDimension;
            
            int pw = (int) (w * posterScale);
            int ph = (int) (h * posterScale);
            
            descriptor.setPosterSize (posterSize, pw, ph);
            
            System.out.println ("Creating " + pw + " x " + ph + " poster image.");
            
            BufferedImage poster = new BufferedImage (pw, ph, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = poster.createGraphics ();
            g.drawImage (full.getScaledInstance (pw, ph, java.awt.Image.SCALE_AREA_AVERAGING), 0, 0, null);
            g.dispose ();
            
            output.write (poster, new File (folders, "poster" + output.getSuffix ()));
        }   
        
        
        int tileSize = getParameterAsInt (parameters, "tile-size", 256) + getParameterAsInt (parameters, "overlap", 0);
        int heuristicMaxZoom = (int) (Math.ceil (Math.log (maxDimension) / Math.log (2)) - Math.floor (Math.log (tileSize) / Math.log (2)) + 2);
        
        int maxZoom = getParameterAsInt (parameters, "levels", (int) heuristicMaxZoom);
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
            File outputDir = 
                "invert".equals (getParameter (parameters, "level-numbering", ""))
                ?
                new File (folders, String.valueOf (maxZoom - zoom - 1))
                :
                new File (folders, String.valueOf (zoom));
            outputDir.mkdirs ();
            tile (full, tileSize, overlap, outputDir, output);
            
            w = (w - overlap) / 2 + overlap;
            h = (h - overlap) / 2 + overlap;
            
            if (zoom < maxZoom - 1) {
                System.out.println ("Reducing by factor of 2...");
                
                BufferedImage reduced = new BufferedImage (w, h, BufferedImage.TYPE_INT_RGB);
                Graphics2D g = reduced.createGraphics ();
                g.drawImage (full.getScaledInstance (w, h, java.awt.Image.SCALE_AREA_AVERAGING), 0, 0, null);
                g.dispose ();
                full = reduced;
            }
        }
        
        descriptor.setTileSize (tileSize, overlap, (-maxZoom + 1));
        
        descriptor.output (folders);
        
        if (outputPackage) {
            if (dziLayout) {
                pack (folders.getParentFile (), outputBase);
                deleteAll (folders.getParentFile ());
            } else {
                pack (folders, outputBase);
                deleteAll (folders);
            }
        }
    }
    
    
    protected static void deleteAll (File f) {
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