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
package minihttpd;

import java.net.ServerSocket;
import java.net.Socket;
import java.io.File;
import java.io.InputStream;
import java.io.FileInputStream;
import java.io.BufferedInputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;

public class MinimalHttpd {
    
    private static String readLine (InputStream is) throws Exception {
        StringBuilder sb = new StringBuilder ();
        while (true) {
            int read = is.read ();
            if (read == -1) {
                return sb.toString ();
            } else if (read == '\r') {
            } else if (read == '\n') {
                return sb.toString ();
            } else {
                sb.append ((char) read);
            }
        }
    }
    
    public static void main (String[] args) throws Exception {
        final File root = new File (args[0]);
        ServerSocket serverSocket = new ServerSocket (80);
        System.out.println ("Server started on port 80. Root: " + root.getPath ());
        
        final int throttle = args.length > 1 ? Integer.parseInt (args[1]) : Integer.MAX_VALUE;
        System.out.println ("Throttled to " + throttle + " B/s");
        
        while (true) {
            final Socket sock = serverSocket.accept ();
            new Thread () {
                public void run () {
                    try {
                        InputStream is = sock.getInputStream ();
                        String request = readLine (is);
                        while (readLine (is).length () > 0) {
                        }
                        String[] path = request.split (" ");
                        if (path[1].equals ("/")) {
                            path[1] = "/index.html";
                        }
                        File f = new File (root, path[1]);
                        OutputStream os = sock.getOutputStream ();
                        if (f.exists () && !f.isDirectory ()) {
                            FileInputStream fis = new FileInputStream (f);
                            os.write ("HTTP/1.0 200 OK\r\n".getBytes ());
                            if (f.getName ().endsWith ("rss.xml")) {
                                os.write ("Content-Type: application/rss+xml\r\n".getBytes ());
                            }
                            os.write ("\r\n".getBytes ());
                            byte[] buffer = new byte[32768];
                            while (true) {
                                int numRead = fis.read (buffer);
                                if (numRead <= 0) {
                                    break;
                                }
                                long delay = 1000L * numRead / throttle;
                                Thread.sleep ((int) delay);
                                os.write (buffer, 0, numRead);                                
                            }
                        } else {
                            os.write ("HTTP/1.0 404 Not found\r\n\r\n".getBytes ());
                        }
                        os.flush ();
                        sock.close ();
                    } catch (Throwable t) {
                        t.printStackTrace ();
                    }
                }
            }.start ();
        }
    }
    
}