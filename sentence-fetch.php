<?php
// This file is here while we wait for tatoeba to implement the CORS headers on their API site
$vocab = $_GET["vocab"];
$url = "https://tatoeba.org/en/api_v0/search?from=jpn&query=" . $vocab . "&trans_filter=limit&trans_to=eng&to=eng";
header("Content-Type: application/json");
echo (file_get_contents($url));
