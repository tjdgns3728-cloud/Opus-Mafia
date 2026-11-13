// korean module: Korean text helpers for game code. engine.korean.josa("{이름}이(가) 왔다") settles particles written both
// ways — 이(가) 을(를) 은(는) 과(와) 와(과) (으)로 — by the last sound of the word before them (digits read aloud).
WebEngine.module("korean", () => {
  const DIGIT_FINAL = [21, 8, 0, 16, 0, 0, 1, 8, 8, 0];   // 영 일 이 삼 사 오 육 칠 팔 구 → final consonant index (0 = none, 8 = ㄹ)
  const final = ch => /[0-9]/.test(ch) ? DIGIT_FINAL[+ch] : /[가-힣]/.test(ch) ? (ch.charCodeAt(0) - 0xAC00) % 28 : -1;
  const PAIRS = {"이(가)": ["이", "가"], "가(이)": ["이", "가"], "을(를)": ["을", "를"], "를(을)": ["을", "를"], "은(는)": ["은", "는"],
                 "는(은)": ["은", "는"], "과(와)": ["과", "와"], "와(과)": ["과", "와"]};
  function josa(text) {
    return String(text).replace(/([가-힣0-9])(이\(가\)|가\(이\)|을\(를\)|를\(을\)|은\(는\)|는\(은\)|과\(와\)|와\(과\)|\(으\)로)/g, (m, ch, p) => {
      const f = final(ch);
      if (p === "(으)로") return ch + (f > 0 && f !== 8 ? "으로" : "로");
      return ch + PAIRS[p][f > 0 ? 0 : 1];
    });
  }
  return {josa, hasFinal: ch => final(String(ch).slice(-1)) > 0};
});
