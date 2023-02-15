# kanji DB entries from https://www.kanjidatabase.com/
# photos from Pexels
# kanji svgs from http://kanjivg.tagaini.net/

# huge thanks to all the authors of these projects <3

import json
import requests
import time
import shutil
import re

level = "n3"

pexels_token = ""

def fetch_picture(q):
    ep = f"https://api.pexels.com/v1/search?query={q}&per_page=1"
    response = requests.get(ep, headers={'Authorization':pexels_token})
    data = response.json()["photos"][0]

    return {
        'src': data["src"]["original"],
        'author': data["photographer"],
        'col': data["avg_color"]
    }


with open("token","r") as fp:
    pexels_token = fp.read().strip()

counter = 0
with open(f"in/vocab/vocab_{level}.json","r") as fp:
    data = json.load(fp)
    for entry in data:
        reading = entry["Hiragana"].strip()
        translations = re.split(';|,',entry["English"])
        kanji = entry["Kanji"].strip()

        if kanji == "":
            kanji = reading

        for i in range(0, len(translations)):
            translations[i] = translations[i].strip()


        # PICTURE
        term = translations[0]
        pic = {}
        try:
            print("Searching..." + term)
            pic = fetch_picture(term)
        except:
            try:
                term = translations[1]
                print("Searching..." + term)
                pic = fetch_picture(term)
            except:
                print("Giving up!")
        print(f"Fetched pic for {counter} ===> {kanji}")

        # SVG

        svgs = []
        for c in kanji:
            svgindex = format(ord(c),"x").rjust(5,"0")
            svgs.append(svgindex + ".svg")
        

        result = {
            "id": counter,
            "kanji": kanji,
            "read": reading,
            "en": translations,
            "pic": pic,
            "svg": svgs
        }

        with open(f"out/{level}/{counter}.json", "w") as wp:
            json.dump(result,wp,ensure_ascii=False)

        print(result)

        time.sleep(1)
        counter = counter + 1

