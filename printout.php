<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DailyNihongo Printout</title>
    <link rel="icon" type="image/x-icon" href="assets/favicon.png">

    <style>
        html {
            overflow-y: scroll;
        }

        body {
            width: 210mm;
            height: 297mm;
            padding: 10mm;
            margin: 0px;
            box-sizing: border-box;
            overflow: hidden;

            display: grid;
            grid-template-rows: 32mm min-content min-content auto;
            gap: 1mm;

            font-family: serif;
        }

        h2 {
            letter-spacing: 0.05em;
            font-size: 1.7em;
            margin-bottom: 0.1em;
        }

        body>div {
            border: 0.75mm solid black;
            border-radius: 1mm;
            padding: 1mm;
            box-sizing: border-box;
        }

        #po-title {
            grid-row: 1;

            width: 100%;
            display: grid;
            grid-template-columns: calc(50% - 15mm) calc(50% - 15mm) 30mm;
            grid-template-rows: 20mm 10mm;
        }

        #po-title p {
            display: flex;
            margin: 0px;
            height: 100%;
            justify-content: center;
            align-items: center;
        }

        #po-title>#po-kanji {
            grid-column-start: 1;
            grid-column-end: 3;
            grid-row: 1;
            width: 100%;
            text-align: center;

            font-size: 15mm;
        }

        #po-title>#po-kana {
            grid-column: 1;
            grid-row: 2;
            width: 100%;
            font-size: 6mm;
            text-align: center;
        }

        #po-title>#po-english {
            grid-column: 2;
            grid-row: 2;
            width: 100%;
            font-size: 6mm;
            text-align: center;
        }

        #po-title>#po-qr {
            grid-column: 3;
            grid-row-start: 1;
            grid-row-end: 3;
            width: 100%;
        }

        #po-cardid {
            position: absolute;
            top: 0.5mm;
        }

        #po-chars {
            display: flex;
            justify-content: center;
            height: 20mm;
        }

        #po-writing .po-practice {
            height: 60mm;
        }

        h2 {
            margin-top: 0mm;
            margin-bottom: 0mm;
            font-size: 5mm;
        }

        .po-practice {
            --col: #CCC;
            background-image:
                linear-gradient(to right, var(--col) 2px, transparent 1px),
                linear-gradient(to bottom, var(--col) 2px, transparent 1px);
            background-size: 5mm 5mm;
            border: solid 1px var(--col);
        }

        #po-sentences {
            display: grid;
            grid-template-columns: max-content auto;
            gap: 2mm;
        }

        div.po-sentence {
            height: 15mm;
            grid-column: 2;
        }

        p.po-sentence {
            width: 100%;
            text-align: center;
            font-size: 4.5mm;
            margin: 0px;
            display: flex;
            align-items: center;
            justify-content: center;

            grid-column: 1;

            max-width: 60mm;
        }

        span.po-sentence {
            grid-column: 2;
            font-size: 3mm;
            display: block;
            height: 0px;
            overflow: visible;
            position: relative;
            opacity: 0.5;
            top: -2mm;
        }

        #po-notes {
            display: grid;
            grid-template-rows: min-content auto;
        }
    </style>
</head>

<?php

try {
    $id = $_GET["id"];
    $level = $_GET["jlpt"];

    $ctn = file_get_contents("vocab/" . $level . "/" . $id . ".json");
    $data = json_decode($ctn, true);

    $kanji = $data["kanji"];
    $read = $data["read"];
    $en = join(",", $data["en"]);
    $svgs = $data["svg"];

    $url = "https://tatoeba.org/en/api_v0/search?from=jpn&query=" . $kanji . "&trans_filter=limit&trans_to=eng&to=eng&sort=words";
    $sentence_data = json_decode(file_get_contents($url), true);
    $sentences = $sentence_data["results"];
} catch (Error $e) {
    echo ("<h1>Error while creating the printout!</h1><br>");
    die("<pre>" . $e . "</pre>");
}
?>


<body>
    <p id="po-cardid">JLPT <?php echo strtoupper($level); ?>#<?php echo $id; ?> - DailyNihongo</p>
    <div id="po-title">
        <p id="po-kanji"><?php echo $kanji; ?></p>
        <p id="po-kana"><?php echo $read; ?></p>
        <p id="po-english"><?php echo $en; ?></p>
        <img id="po-qr" src="https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=<?php echo "https://jisho.org/search/" . urlencode($kanji); ?>" />
    </div>
    <div id="po-writing">
        <h2>writing</h2>
        <div id="po-chars">
            <?php
            foreach ($svgs as $svg) {
                echo "<img src='charsvg/" . $svg . "' />";
            }
            ?>
        </div>
        <div class="po-practice">

        </div>
    </div>
    <div id="po-translation">
        <h2>translation</h2>
        <div id="po-sentences">
            <?php

            $max = 3;
            $ct1 = 0;
            foreach ($sentences as $sentence) {
                if ($max == 0) break;
                $ct1++;
                $text = $sentence["text"];
                if (array_key_exists("transcriptions", $sentence)) {
                    foreach ($sentence["transcriptions"] as $trans) {
                        if ($trans["type"] == "altscript" && $trans["html"] != null) {
                            $text = $trans["html"];
                        }
                    }
                }
                echo ("<span class='po-sentence'>#" . $sentence["id"] . "</span>");
                echo ("<p class='po-sentence'>" . $text . "</p>");
                echo ("<div class='po-sentence po-practice'></div>");
                $max--;
            }

            $max = 2;
            $ct2 = 0;
            foreach ($sentences as $sentence) {
                if ($max == 0) break;
                $ct2++;
                if ($ct2 < $ct1) continue;

                $text = "";
                foreach ($sentence["translations"] as $trans) {
                    if ($trans != null && $trans != "") {
                        $text = $trans[0]["text"];
                    }
                }

                echo ("<span class='po-sentence'>#" . $sentence["id"] . "</span>");
                echo ("<p class='po-sentence'>" . $text . "</p>");
                echo ("<div class='po-sentence po-practice'></div>");
                $max--;
            }
            ?>
        </div>

    </div>

    <div id="po-notes">
        <h2>notes</h2>
        <div class="po-practice">

        </div>
    </div>


</body>

</html>