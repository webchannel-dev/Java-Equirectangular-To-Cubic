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

/**
 * A 3D point
 */
public class Point3D extends Point2D {

    public double z;
    
    public Point3D () {
        this (0, 0, 0);
    }
    
    public Point3D (double x, double y, double z) {
        super (x, y);
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
        rotate (angle);
    }
    
    public void scale (double s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
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
