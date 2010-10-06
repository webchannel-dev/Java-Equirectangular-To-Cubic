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
import java.awt.Image;
import java.awt.Color;
import javax.imageio.ImageIO;
import java.io.File;

public class MakeImagePyramid {
    
    public static void tile (BufferedImage full, int tileWidth, int tileOffset, File outputBase) throws Exception {
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
                String filename = tx + "_" + ty + ".jpg";
                ImageIO.write (tile, "JPG", new File (outputBase, filename));
            }
        }
    }
    
    public static void main (String[] args) throws Exception {
        File input = new File (args[0]);
        File outputBase = new File (args[1]);
        
        BufferedImage full = ImageIO.read (input);
        outputBase.mkdirs ();
        
        
        
        int w = full.getWidth ();
        int h = full.getHeight ();
        int maxDimension = Math.max (w, h);
        
        {
            double posterScale = 512.0 / maxDimension;
            
            int pw = (int) (w * posterScale);
            int ph = (int) (h * posterScale);
            BufferedImage poster = new BufferedImage (pw, ph, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = poster.createGraphics ();
            g.drawImage (full.getScaledInstance (pw, ph, Image.SCALE_AREA_AVERAGING), 0, 0, null);
            g.dispose ();
            
            ImageIO.write (poster, "JPG", new File (outputBase, "poster.jpg"));
        }   
        
        int maxZoom = (int) Math.ceil (Math.log (maxDimension));
        System.out.println (maxZoom);
        for (int zoom = 0; zoom < maxZoom; ++zoom) {
            File output = new File (outputBase, String.valueOf (zoom));
            output.mkdirs ();
            tile (full, 256, 256, output);
            w /= 2;
            h /= 2;
            
            System.out.println ("Reducing by factor of 2...");
            
            BufferedImage reduced = new BufferedImage (w, h, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = reduced.createGraphics ();
            g.drawImage (full.getScaledInstance (w, h, Image.SCALE_AREA_AVERAGING), 0, 0, null);
            g.dispose ();
            full = reduced;
        }
    }
    
}