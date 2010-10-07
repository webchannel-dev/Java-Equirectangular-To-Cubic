<?php
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
    
$filename = $_GET["file"];
$start = (int) $_GET["start"];
$length = (int) $_GET["length"];
$type = $_GET["type"];

$pathComponents = explode ("/", $filename);
$filename = "";
foreach ($pathComponents as $i => $value) {
    if ($value != ".." && $value != ".") {
        if (strlen ($filename) > 0) {
            $filename = $filename . "/";
        }
        $filename = $filename . $value;
    }
}

if (substr ($filename, -8) != ".bigshot") {
    trigger_error($filename . " is not a bigshot file.", E_USER_ERROR);
}

if ($start < 0) {
    trigger_error("start is negative: " . $start, E_USER_ERROR);
}

if ($length < 0) {
    trigger_error("length is negative: " . $length, E_USER_ERROR);
}

if (!file_exists ($filename)) {
    trigger_error($filename . " not found.", E_USER_ERROR);
}

header ("Content-Type: " . $type);

echo file_get_contents ($filename, false, NULL, $start, $length);
?>