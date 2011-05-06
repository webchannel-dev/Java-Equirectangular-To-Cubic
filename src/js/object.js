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

/**
 * @class Object-oriented support functions, used to make JavaScript
 * a bit more palatable to a Java-head.
 */
bigshot.object = {
    /**
     * Performs an inheritance operation with a base-class instance 
     * and a derived instance. Each method that exists in the base class
     * but not in the derived instance is copied across. Every method in the
     * base-class instance is thunked and put in a field named <code>_super</code>
     * in the derived instance. The thunk takes care of making sure the
     * <code>this</code> reference points where you'd expect it.
     * Methods in the derived class can refer to <code>_super.<i>methodName</i></code>
     * to get the method as defined by the base class.
     * Fields not of <code>function</code> type are copied across if they do not
     * exist in the derived class.
     *
     * @param {Object} base the base-class instance
     * @param {Object} derived the derived-class instance
     */
    extend : function (base, derived) {
        var _super = {};
        
        for (var k in derived) {
            if (typeof (derived[k]) == "function") {
                derived[k] = this.makeThunk (derived[k], derived, _super);
            }
        }
        
        for (var k in base) {
            if (typeof (base[k]) == "function") {
                var fn = base[k];
                var usesSuper = (fn.usesSuper ? fn.usesSuper : null);
                var fn = (fn.isThunkFor ? fn.isThunkFor : fn);
                _super[k] = this.makeThunk (fn, derived, usesSuper);
                if (!derived[k]) {
                    derived[k] = _super[k];
                }
            } else if (!derived[k]) {
                derived[k] = base[k];
            }
        }
        return derived;
    },
    
    /**
     * Creates a function thunk that resets the <code>this</code>
     * reference and the object's <code>_super</code> reference.
     * The returned function has three properties that can be used
     * to examine it:
     *
     * <ul>
     * <li><code>thunksTo</code>: Set to <code>_this</code>
     * <li><code>isThunkFor</code>: Set to <code>fn</code>
     * <li><code>usesSuper</code>: Set to <code>_super</code>
     * </ul>
     * 
     * @param {function} fn the function to thunk
     * @param {Object} _this the new <code>this</code> reference.
     * @param {Object} _super the new <code>_super</code> reference.
     */
    makeThunk : function (fn, _this, _super) {
        var f = function () {
            _this._super = _super;
            return fn.apply (_this, arguments);
        };
        f.thunksTo = _this;
        f.isThunkFor = fn;
        f.usesSuper = _super;
        return f;
    },
    
    /**
     * Utility function to show an object's fields in a message box.
     *
     * @param {Object} o the object
     */
    alertr : function (o) {
        var sb = "";
        for (var k in o) {
            sb += k + ":" + o[k] + "\n";
        }
        alert (sb);
    },
    
    /**
     * Utility function to show an object's fields in the console log.
     *
     * @param {Object} o the object
     */
    logr : function (o) {
        var sb = "";
        for (var k in o) {
            sb += k + ":" + o[k] + "\n";
        }
        if (console) {
            console.log (sb);
        }
    }
};
