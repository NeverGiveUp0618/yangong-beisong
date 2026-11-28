#!/usr/bin/env python3
"""
Pre-synthesize natural human-like Mandarin TTS (.mp3) for all 6 sutras
in sutras/texts.json using edge-tts (Microsoft Neural Voice), so WeChat
in-app browsers play reliably with zero robotic speechSynthesis.
"""
import asyncio
import json
import os
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parent
SUTRAS = ROOT / "sutras"
AUDIO_DIR = SUTRAS / "audio"
VOICE = "zh-CN-YunyangNeural"
RATE = "-10%"
CONC = 6

# Unambiguous Mandarin characters for all 209 mantra pinyin syllables
PINYIN_CHAR = {
    "biàn": "遍", "bàng": "棒", "bá": "拔", "bì": "必", "bí": "鼻", "bò": "播", "bó": "伯", "bù": "布",
    "bā": "八", "bēi": "悲", "bēng": "崩", "bīng": "冰", "bō": "波", "bǐ": "比", "bǔ": "补",
    "chà": "刹", "chàn": "忏", "chá": "茶", "cháng": "常", "chí": "持", "chú": "除", "chē": "车", "chēn": "嗔", "chū": "出",
    "cuì": "脆", "cì": "次",
    "diàn": "电", "dié": "叠", "diǎn": "点", "duò": "舵", "duō": "多", "dàn": "但", "dá": "达", "dì": "帝",
    "dòu": "豆", "dù": "度", "dùn": "顿", "dān": "丹", "dīng": "丁", "dū": "都", "dǐ": "底",
    "fàn": "梵", "fá": "伐", "fáng": "房", "fèi": "费", "fó": "佛",
    "gé": "格", "gǔ": "古",
    "hàn": "汉", "hé": "和", "hē": "喝", "hū": "呼", "hǔ": "虎",
    "jiàn": "见", "jié": "杰", "jiā": "加", "jiē": "接", "jiū": "究", "jué": "决", "jì": "记", "jí": "吉",
    "jù": "具", "jī": "基", "jǐn": "紧",
    "liàn": "练", "lián": "连", "luó": "罗", "là": "辣", "lài": "赖", "lán": "兰", "láng": "郎", "láo": "劳",
    "léng": "楞", "lì": "利", "lí": "离", "líng": "灵", "lù": "路", "lú": "卢", "lüè": "略", "lǐ": "礼",
    "me": "么", "miè": "灭", "miē": "咩", "miǎo": "秒", "màn": "曼", "máng": "忙", "méng": "蒙", "mì": "密",
    "mí": "弥", "mò": "末", "mó": "摩", "móu": "谋", "mù": "木", "mē": "么", "mǔ": "母",
    "nuò": "诺", "nuó": "挪", "nà": "那", "nàn": "难", "ná": "拿", "nán": "南", "ní": "尼", "níng": "宁",
    "nú": "奴", "nǐ": "你", "nǚ": "女",
    "piāo": "飘", "pàn": "判", "pán": "盘", "péng": "朋", "pí": "皮", "pín": "贫", "pó": "婆", "pú": "菩", "pō": "坡", "pǔ": "普",
    "qián": "前", "qié": "茄", "qiān": "千", "qí": "奇", "qī": "七", "qǐ": "起",
    "ruò": "若",
    "shuì": "睡", "shuò": "硕", "shàn": "善", "shè": "社", "shèng": "圣", "shé": "蛇", "shì": "世", "shí": "十",
    "shù": "树", "shā": "沙", "shān": "山", "shāng": "商", "shē": "奢", "shě": "舍", "shī": "师", "shū": "书", "shǐ": "始",
    "suō": "梭", "suǒ": "所", "sà": "萨", "sè": "色", "sì": "四", "sù": "素", "sā": "撒", "sān": "三", "sēng": "僧", "sī": "思", "sū": "苏",
    "tiáo": "条", "tuó": "陀", "tuō": "托", "tà": "踏", "tán": "坛", "tè": "特", "téng": "腾", "tí": "提",
    "tóu": "头", "tù": "兔", "tú": "图", "tā": "他",
    "wén": "文", "wā": "哇", "wū": "屋", "wǎng": "网",
    "xià": "下", "xiè": "谢", "xìn": "信", "xī": "西",
    "yào": "要", "yáng": "阳", "yè": "夜", "yé": "耶", "yì": "义", "yìn": "印", "yí": "宜", "yù": "玉",
    "yùn": "运", "yān": "烟", "yē": "耶", "yě": "也", "yī": "一", "yīn": "音", "yōng": "拥", "yǎn": "演", "yǐn": "引",
    "zhuì": "坠", "zhà": "炸", "zhàn": "站", "zhàng": "丈", "zhái": "宅", "zhé": "折", "zhì": "智", "zhí": "直",
    "zhù": "住", "zhān": "瞻", "zhē": "遮", "zhě": "者", "zhī": "知", "zhǐ": "止", "zhǔ": "主",
    "zuò": "作", "zài": "在", "ài": "爱", "áng": "昂", "òng": "瓮", "ā": "啊",
}

PROSE_FIXES = [
    ("南无", "拿摩"),
    ("阿弥陀", "啊弥陀"),
    ("阿耨多罗", "啊耨多罗"),
    ("阿逸多", "啊逸多"),
    ("阿鞞跋致", "啊鞞跋致"),
    ("阿閦鞞", "啊閦鞞"),
    ("阿罗汉", "啊罗汉"),
    ("阿修罗", "啊修罗"),
    ("阿僧祇", "啊僧祇"),
    ("阿提目多伽", "啊提目多茄"),
    ("阿㝹楼驮", "啊楼驮"),
    ("般若", "波惹"),
    ("摩诃", "摩喝"),
    ("迦叶", "迦社"),
    ("祇树", "其树"),
    ("给孤独", "己孤独"),
    ("极乐", "极乐"),
    ("作天乐", "作天月"),
    ("宝行树", "宝航树"),
    ("雨天曼陀罗华", "玉天曼陀罗华"),
    ("雨曼陀罗华", "玉曼陀罗华"),
    ("乐习苦行", "要习苦行"),
    ("衣裓", "衣格"),
    ("莎婆诃", "梭婆喝"),
    ("揭帝", "杰帝"),
    ("波罗揭帝", "波罗杰帝"),
    ("波罗僧揭帝", "波罗僧杰帝"),
    ("菩提", "菩提"),
    ("薝", "瞻"),
]


def fix_prose(text: str) -> str:
    for old, new in PROSE_FIXES:
        text = text.replace(old, new)
    return text


def mantra_tts_text(lines) -> str:
    parts = []
    for l in lines:
        chars = []
        for p in l["pinyin"]:
            assert p in PINYIN_CHAR, f"Missing pinyin mapping: {p}"
            chars.append(PINYIN_CHAR[p])
        parts.append("".join(chars))
    return "，".join(parts) + "。"


def build_tracks():
    data = json.loads((SUTRAS / "texts.json").read_text("utf-8"))
    manifest = {}
    jobs = []

    for b in data["books"]:
        bid = b["id"]
        tracks = []
        if bid in ("yaowang", "amituo", "xinjing"):
            blocks = [blk.copy() for blk in b["blocks"]]
            # Match app.js readingBlocks() merge of first short "如是我闻："
            if len(blocks) > 1 and blocks[0]["kind"] == "prose" and len(blocks[0]["text"]) < 12 and blocks[1]["kind"] == "prose":
                blocks[1]["text"] = blocks[0]["text"] + blocks[1]["text"]
                blocks.pop(0)
            for idx, blk in enumerate(blocks):
                raw = blk["text"] if blk["kind"] == "prose" else "，".join(blk["lines"])
                tts = fix_prose(raw)
                fn = f"{bid}-{idx:02d}.mp3"
                tracks.append({
                    "file": fn,
                    "kind": "block",
                    "startId": f"sutra-block-{idx}",
                    "endId": f"sutra-block-{idx}",
                    "label": f"第{idx+1}/{len(blocks)}段",
                })
                jobs.append((tts, fn))
        elif bid == "wenshu":
            lines = b["blocks"][0]["lines"]
            step = 12
            chunks = [lines[i:i+step] for i in range(0, len(lines), step)]
            for idx, ch in enumerate(chunks):
                tts = fix_prose("".join(ch))
                fn = f"{bid}-{idx:02d}.mp3"
                s_idx = idx * step
                e_idx = s_idx + len(ch) - 1
                tracks.append({
                    "file": fn,
                    "kind": "verse-range",
                    "startIdx": s_idx,
                    "endIdx": e_idx,
                    "label": f"第{s_idx+1}—{e_idx+1}行",
                })
                jobs.append((tts, fn))
        elif bid in ("dabei", "lengyan"):
            all_tracks = []
            idx_counter = 0
            for s_i, sec in enumerate(b["sections"]):
                lines = sec["lines"]
                step = 14 if bid == "dabei" else 18
                for start in range(0, len(lines), step):
                    ch = lines[start:start+step]
                    tts = mantra_tts_text(ch)
                    fn = f"{bid}-{idx_counter:02d}.mp3"
                    s_n = ch[0]["n"]
                    e_n = ch[-1]["n"]
                    lbl = f"{sec['title']} 第{s_n}—{e_n}句" if len(b["sections"]) > 1 else f"第{s_n}—{e_n}句"
                    all_tracks.append({
                        "file": fn,
                        "kind": "mantra-range",
                        "startLine": s_n,
                        "endLine": e_n,
                        "label": lbl,
                    })
                    jobs.append((tts, fn))
                    idx_counter += 1
            tracks = all_tracks
        manifest[bid] = tracks
    return manifest, jobs


async def synth_all(jobs):
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    todo = [(t, fn) for (t, fn) in jobs if not (AUDIO_DIR / fn).exists() or (AUDIO_DIR / fn).stat().st_size == 0]
    print(f"Voice={VOICE} Rate={RATE} | Total={len(jobs)} | Todo={len(todo)}")
    sem = asyncio.Semaphore(CONC)
    fails = []

    async def one(text, fn, i):
        async with sem:
            out = AUDIO_DIR / fn
            for attempt in range(3):
                try:
                    comm = edge_tts.Communicate(text, VOICE, rate=RATE)
                    await comm.save(str(out))
                    if out.exists() and out.stat().st_size > 0:
                        if (i + 1) % 10 == 0 or i + 1 == len(todo):
                            print(f"  done {i+1}/{len(todo)} ({fn})")
                        return
                except Exception as e:
                    if attempt == 2:
                        fails.append((fn, str(e)))
                    await asyncio.sleep(1.5 * (attempt + 1))

    await asyncio.gather(*(one(t, fn, i) for i, (t, fn) in enumerate(todo)))
    if fails:
        raise RuntimeError(f"Failed {len(fails)} tracks: {fails[:5]}")


def main():
    manifest, jobs = build_tracks()
    asyncio.run(synth_all(jobs))
    out_js = SUTRAS / "audio-manifest.js"
    out_js.write_text(
        "/* Generated by gen_sutra_audio.py */\nwindow.YANGONG_SUTRA_AUDIO="
        + json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    total_kb = sum((AUDIO_DIR / fn).stat().st_size for _, fn in jobs) / 1024
    print(f"Manifest written: {out_js.name} | {len(jobs)} mp3s | {total_kb/1024:.2f} MB")


if __name__ == "__main__":
    main()
