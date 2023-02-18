<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DailyNihongo Printout</title>
    <style>
        object {
            width: 210mm;
            height: 297mm;
            overflow: hidden;
            display: block;
        }
    </style>
</head>

<body>
    <?php

    try {
        $start = $_GET["from"];
        $end = $_GET["to"];
        $level = $_GET["jlpt"];

        if ($start == null) $start = 0;

        if ($end - $start < 0 || $end - $start > 16) {
            throw new Error("Invalid page count!");
        }

        for ($i = $start; $i < $end; $i++) {
            echo ("<object data='printout.php?jlpt=" . $level . "&id=" . $i . "'></object>");
        }
    } catch (Error $e) {
        echo ("<h1>Error while creating the book!</h1><br>");
        die("<pre>" . $e . "</pre>");
    }
    ?>
</body>

</html>