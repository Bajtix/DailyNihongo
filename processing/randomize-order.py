import os
import json
import random

inp = './out/n4/'
out = "./shuffled/n4/"


files = os.listdir(inp)

random.shuffle(files)

for w in range(0, len(files)):
    with open(inp + files[w], "r") as fr:
        obj = json.load(fr)
        print(str(obj["id"]) + " => " + str(w))
        obj["id"] = w

        with open(out + str(w) + ".json", "w") as fw:
            json.dump(obj, fw,ensure_ascii=False)
