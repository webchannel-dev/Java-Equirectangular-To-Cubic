package bigshot;

import java.io.File;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.PrintStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.ImageReader;

import java.util.StringTokenizer;
import java.util.Iterator;

public class EquirectangularToCubic {
    
    public static int[] imageSize (File input) throws Exception {
        ImageInputStream in = ImageIO.createImageInputStream (input);
        try {
            final Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            while (readers.hasNext()) {
                ImageReader reader = readers.next();
                try {
                    reader.setInput(in);
                    return new int[]{ reader.getWidth(0), reader.getHeight(0) };
                } finally {
                    reader.dispose();
                }
            }
            return null;
        } finally {
            in.close();
        }
    }
    
    public static String getTransform (File image, int[] inputSize, int y, int p, int r) {
        return "i f4 h" + inputSize[1] + " n\"" + image.getPath () + "\" p" + p + " r" + r + " v360 w" + inputSize[0] + " y" + y;
    }
    
    public static void doTransform (File imageName, File output, int[] inputSize, int outputSize, int y, int p, int r) throws Exception {
        File script = File.createTempFile ("pyramid", "tocube.pto");
        try {
            PrintStream ps = new PrintStream (new FileOutputStream (script));
            try {
                ps.println ("p E0 f0 h" + outputSize + " n\"PNG\" u0 v90 w" + outputSize);
                ps.println ("m g1.0 i0");
                ps.println (getTransform (imageName, inputSize, y, p, r));
            } finally {
                ps.close ();
            }
            
            output.getParentFile ().mkdirs ();
            
            System.out.println ("Transforming to " + output.getName () + " = " + y + ", " + p + ", " + r);
            
            Process nona = new ProcessBuilder ("C:\\Program Files\\Hugin\\bin\\nona.exe",
                "-o", output.getPath (),
                script.getPath ())
                .redirectErrorStream (true)
                .start ();
            InputStream is = nona.getInputStream ();
            while (true) {
                int read = is.read ();
                if (read == -1) {
                    break;
                }
                System.out.print ((char) read);
            }
            nona.waitFor ();
        } finally {
            script.delete ();
        }
    }
    
    
    public static File[] transformToFaces (File imageName, File outputBase, int outputSize) throws Exception {
        int[] inputSize = imageSize (imageName);
        
        System.out.println ("Transforming to " + outputSize + "x" + outputSize + " cube map faces.");
        
        File[] files = new File[]{
            new File (outputBase, "face_f"),
            new File (outputBase, "face_r"),
            new File (outputBase, "face_b"),
            new File (outputBase, "face_l"),
            new File (outputBase, "face_u"),
            new File (outputBase, "face_d")
            };
        
        doTransform (imageName, files[0], inputSize, outputSize,  0,   0, 0);
        doTransform (imageName, files[1], inputSize, outputSize, -90,   0, 0);
        doTransform (imageName, files[2], inputSize, outputSize, 180,   0, 0);
        doTransform (imageName, files[3], inputSize, outputSize,  90,   0, 0);
        doTransform (imageName, files[4], inputSize, outputSize,   0, -90, 0);
        doTransform (imageName, files[5], inputSize, outputSize,   0,  90, 0);
        
        return files;
    }
}